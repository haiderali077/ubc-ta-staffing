// profile.test.ts
import { Application, assertEquals, assertExists } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { ProfileModel } from "../../database/models/profile.ts";
import { UserModel } from "../../database/models/user.ts";
import {
  profileRouter,
  setupProfileRoutes,
} from "../routes/studentProfile/profileRouter.ts";
import { AuthService } from "../services/auth.ts";
import {
  createTestApp,
  setupTestDatabase,
  TestMockFactory,
} from "./test_utils.ts";

Deno.test("Profile Router", async (t) => {
  let db: Database;
  let app: Application;
  let studentToken: string;
  let profileModel: ProfileModel;
  let userModel: UserModel;
  let authService: AuthService;
  let testStudent: any;

  // Setup
  await t.step("Setup", async () => {
    db = await setupTestDatabase();
    app = await createTestApp(db);

    // Initialize models and services
    profileModel = new ProfileModel(db);
    userModel = new UserModel(db);
    authService = new AuthService(db);

    // Setup profile routes
    setupProfileRoutes(profileRouter, db);
    app.use(profileRouter.routes());

    // Create test student user
    const studentData = TestMockFactory.createMockUser({
      name: "Jane Doe",
      email: "jane.does@student.ubc.ca",
      role: "student",
      student_number: "12345678",
      major: "Computer Science",
    });

    testStudent = await userModel.createUser(studentData);
    console.log("Created test student with ID:", testStudent.user_id);

    // Generate auth token directly using AuthService
    studentToken = await authService.generateAccessToken(testStudent);
  });

  await t.step(
    "GET /api/profile/:userId - should get student profile",
    async () => {
      // First create a profile with the correct user_id
      await profileModel.createOrUpdateStudentProfile({
        user_id: testStudent.user_id,
        personal_statement: "Test statement",
        overall_gpa: 3.5,
      });

      const response = await app.handle(
        new Request(`http://localhost/api/profile/${testStudent.user_id}`, {
          method: "GET",
          headers: {
            Cookie: `access_token=${studentToken}`,
          },
        })
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.profile);
      assertEquals(body.profile.personal_statement, "Test statement");
    }
  );

  await t.step(
    "PUT /api/profile/:userId - should update student profile",
    async () => {
      const updateData = {
        personal_statement: "Updated personal statement",
        overall_gpa: 3.8,
        max_hours_per_week: 20,
      };

      const response = await app.handle(
        new Request(`http://localhost/api/profile/${testStudent.user_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: `access_token=${studentToken}`,
          },
          body: JSON.stringify(updateData),
        })
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.success);
      assertEquals(body.success, true);
      assertEquals(
        body.profile.personal_statement,
        "Updated personal statement"
      );
    }
  );

  await t.step(
    "PUT /api/profile/:userId/course-preferences - should update course preferences",
    async () => {
      const coursePreferences = {
        preferred: ["CPSC 110", "CPSC 210"],
        avoid: ["MATH 100"],
      };

      const response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/course-preferences`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Cookie: `access_token=${studentToken}`,
            },
            body: JSON.stringify({ preferred_course_types: coursePreferences }),
          }
        )
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.success);
      assertEquals(body.success, true);
    }
  );

  await t.step(
    "GET /api/users/:id/profile/status - should get profile status",
    async () => {
      const response = await app.handle(
        new Request(
          `http://localhost/api/users/${testStudent.user_id}/profile/status`,
          {
            method: "GET",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
          }
        )
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.status);
    }
  );

  await t.step(
    "POST /api/users/:id/profile/submit - should reject incomplete profile",
    async () => {
      // Clear any existing profile first
      await db.query("DELETE FROM student_profiles WHERE user_id = $1", [
        testStudent.user_id,
      ]);

      // Create minimal incomplete profile
      await profileModel.createOrUpdateStudentProfile({
        user_id: testStudent.user_id,
        personal_statement: "Incomplete profile",
      });

      const response = await app.handle(
        new Request(
          `http://localhost/api/users/${testStudent.user_id}/profile/submit`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
          }
        )
      );

      assertEquals(response?.status, 400);
      const body = await response?.json();
      assertExists(body.error);
      assertEquals(body.error, "Missing required fields");
    }
  );

  // Transcript upload tests
  await t.step(
    "POST /api/profile/:userId/transcript/upload - should upload a valid transcript PDF",
    async () => {
      // Create a dummy PDF file buffer
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
      const form = new FormData();
      form.append(
        "file",
        new Blob([pdfBuffer], { type: "application/pdf" }),
        "transcript.pdf"
      );

      const response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/transcript/upload`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
            body: form,
          }
        )
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.success);
      assertEquals(body.success, true);
      assertExists(body.transcript_url);
      assertExists(body.profile);
      // Should end with .pdf
      if (body.transcript_url) {
        if (typeof body.transcript_url === "string") {
          if (!body.transcript_url.endsWith(".pdf")) {
            throw new Error("Transcript URL does not end with .pdf");
          }
        }
      }
    }
  );

  await t.step(
    "POST /api/profile/:userId/transcript/upload - should fail with missing file",
    async () => {
      const form = new FormData(); // No file appended
      const response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/transcript/upload`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
            body: form,
          }
        )
      );
      assertEquals(response?.status, 400);
      const body = await response?.json();
      assertExists(body.error);
      assertEquals(body.error, "No file uploaded or invalid file type");
    }
  );

  await t.step(
    "POST /api/profile/:userId/transcript/upload - should fail with invalid user ID",
    async () => {
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const form = new FormData();
      form.append(
        "file",
        new Blob([pdfBuffer], { type: "application/pdf" }),
        "transcript.pdf"
      );
      const response = await app.handle(
        new Request(`http://localhost/api/profile/invalid/transcript/upload`, {
          method: "POST",
          headers: {
            Cookie: `access_token=${studentToken}`,
          },
          body: form,
        })
      );
      assertEquals(response?.status, 400);
      const body = await response?.json();
      assertExists(body.error);
      assertEquals(body.error, "Invalid user ID");
    }
  );

  await t.step(
    "POST /api/profile/:userId/transcript/upload - should fail with invalid file type",
    async () => {
      const txtBuffer = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const form = new FormData();
      form.append(
        "file",
        new Blob([txtBuffer], { type: "text/plain" }),
        "not_a_pdf.txt"
      );
      const response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/transcript/upload`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
            body: form,
          }
        )
      );
      assertEquals(response?.status, 400);
      const body = await response?.json();
      assertExists(body.error);
      assertEquals(body.error, "No file uploaded or invalid file type");
    }
  );

  await t.step(
    "POST /api/profile/:userId/transcript/upload - should replace existing transcript",
    async () => {
      // First upload a PDF
      const pdfBuffer1 = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      let form = new FormData();
      form.append(
        "file",
        new Blob([pdfBuffer1], { type: "application/pdf" }),
        "transcript1.pdf"
      );
      let response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/transcript/upload`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
            body: form,
          }
        )
      );
      const body1 = await response?.json();
      assertEquals(response?.status, 200);
      assertExists(body1.transcript_url);
      // Upload a new PDF (should replace the old one)
      const pdfBuffer2 = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
      form = new FormData();
      form.append(
        "file",
        new Blob([pdfBuffer2], { type: "application/pdf" }),
        "transcript2.pdf"
      );
      response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/transcript/upload`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
            body: form,
          }
        )
      );
      const body2 = await response?.json();
      assertEquals(response?.status, 200);
      assertExists(body2.transcript_url);
      // The new URL should be different from the old one
      if (body1.transcript_url && body2.transcript_url) {
        if (
          typeof body1.transcript_url === "string" &&
          typeof body2.transcript_url === "string"
        ) {
          if (body1.transcript_url === body2.transcript_url) {
            throw new Error("Transcript URL was not updated after re-upload");
          }
        }
      }
    }
  );

  // Additional transcript upload tests for .doc and .docx
  await t.step(
    "POST /api/profile/:userId/transcript/upload - should upload a valid transcript DOC",
    async () => {
      const docBuffer = new Uint8Array([0x44, 0x4f, 0x43, 0x20]); // "DOC "
      const form = new FormData();
      form.append(
        "file",
        new Blob([docBuffer], { type: "application/msword" }),
        "transcript.doc"
      );
      const response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/transcript/upload`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
            body: form,
          }
        )
      );
      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.success);
      assertEquals(body.success, true);
      assertExists(body.transcript_url);
      assertExists(body.profile);
      if (body.transcript_url) {
        if (typeof body.transcript_url === "string") {
          if (!body.transcript_url.endsWith(".doc")) {
            throw new Error("Transcript URL does not end with .doc");
          }
        }
      }
    }
  );

  await t.step(
    "POST /api/profile/:userId/transcript/upload - should upload a valid transcript DOCX",
    async () => {
      const docxBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // DOCX files are ZIPs
      const form = new FormData();
      form.append(
        "file",
        new Blob([docxBuffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        "transcript.docx"
      );
      const response = await app.handle(
        new Request(
          `http://localhost/api/profile/${testStudent.user_id}/transcript/upload`,
          {
            method: "POST",
            headers: {
              Cookie: `access_token=${studentToken}`,
            },
            body: form,
          }
        )
      );
      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.success);
      assertEquals(body.success, true);
      assertExists(body.transcript_url);
      assertExists(body.profile);
      if (body.transcript_url) {
        if (typeof body.transcript_url === "string") {
          if (!body.transcript_url.endsWith(".docx")) {
            throw new Error("Transcript URL does not end with .docx");
          }
        }
      }
    }
  );

  await t.step("Teardown", async () => {
    await db.disconnect();
    console.log("✅ Profile Router test cleanup complete");
  });
});
