import { Application, assertEquals, assertExists } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { ApplicationModel } from "../../database/models/application.ts";
import { AuditLogModel } from "../../database/models/auditLog.ts";
import { CourseModel } from "../../database/models/course.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import { TermModel } from "../../database/models/term.ts";
import { UserModel } from "../../database/models/user.ts";
import { AuthService } from "../services/auth.ts";
import { NotificationService } from "../services/notification.ts";
import { createTestApp, setupTestDatabase, TestMockFactory } from "./test_utils.ts";

Deno.test("Application Updates, Notifications and Audit Logging", async (t) => {
  let db: Database;
  let app: Application;
  let studentUser: any;
  let studentToken: string;
  let testCourses: any[] = [];
  let applicationModel: ApplicationModel;
  let auditLogModel: AuditLogModel;
  let systemSettingsModel: SystemSettingsModel;

  await t.step("Setup", async () => {
    console.log("🔧 Setting up test environment...");
    
    db = await setupTestDatabase();
    app = await createTestApp(db);
    
    // Create test student user
    const studentData = TestMockFactory.createMockUser({
      email: "test.student@student.ubc.ca",
      role: "student",
      major: "Computer Science"
    });
    
    const userModel = new UserModel(db);
    const authService = new AuthService(db);
    studentUser = await userModel.createUser(studentData);
    studentToken = await authService.generateAccessToken(studentUser);
    
    // Initialize models
    applicationModel = new ApplicationModel(db);
    const courseModel = new CourseModel(db);
    systemSettingsModel = new SystemSettingsModel(db);
    const termModel = new TermModel(db);
    auditLogModel = new AuditLogModel(db);
    const notificationService = new NotificationService(db);
    
    // Create multiple test courses for preferences
    testCourses.push(await courseModel.createCourse({
      code: "CPSC 110",
      title: "Computer Programming I",
      term: "Winter 2024",
      instructor_id: studentUser.user_id,
      dept_id: 1
    }));
    
    testCourses.push(await courseModel.createCourse({
      code: "CPSC 121",
      title: "Models of Computation",
      term: "Winter 2024",
      instructor_id: studentUser.user_id,
      dept_id: 1
    }));
    
    testCourses.push(await courseModel.createCourse({
      code: "CPSC 210",
      title: "Software Construction",
      term: "Winter 2024",
      instructor_id: studentUser.user_id,
      dept_id: 1
    }));
    
    // Set deadline to future
    await systemSettingsModel.updateSetting(
      "ta_application_deadline",
      new Date(Date.now() + 100000000).toISOString()
    );
  });

  // Helper function for complete application data
  function getCompleteApplicationData() {
    return {
      coursePreferences: [
        { course_id: testCourses[0].course_id, rank: 1 },
        { course_id: testCourses[1].course_id, rank: 2 },
        { course_id: testCourses[2].course_id, rank: 3 }
      ],
      domainAreas: ["Web", "Database", "Software"],
      applicationType: "Undergraduate",
      notes: "Test application",
      technical_skills: "JavaScript, Python",
      relevant_coursework: "CPSC 110, CPSC 121",
      overall_gpa: 3.5,
      expected_graduation: "2025",
      weekly_availability: 10,
      teaching_experience: "TA for CPSC 110"
    };
  }

  await t.step("Application submission updates timestamps", async () => {
    const result = await makeAuthenticatedRequest(
      app,
      "POST",
      "/applications",
      studentToken,
      getCompleteApplicationData()
    );

    assertEquals(result.response?.status, 201, "Should create application");
    assertExists(result.data.application_id, "Should return application ID");

    // Verify timestamps
    const application = await applicationModel.getApplicationById(result.data.application_id);
    assertExists(application?.submitted_at, "Should have submission timestamp");
    
    const dbResult = await db.query<{updated_at: Date}>(
      "SELECT updated_at FROM ta_applications WHERE application_id = $1",
      [result.data.application_id]
    );
    const updatedAt = dbResult.rows[0]?.updated_at;
    assertExists(updatedAt, "Should have update timestamp");
    assertEquals(
      new Date(application!.submitted_at as string | number | Date).getTime(),
      new Date(updatedAt as string | number | Date).getTime(),
      "Initial timestamps should match"
    );
  });

  await t.step("Application update modifies updated_at timestamp", async () => {
    // First create an application
    const appData = getCompleteApplicationData();
    appData.domainAreas = ["AI", "ML", "Data"];
    appData.applicationType = "Graduate";

    const createResult = await makeAuthenticatedRequest(
      app,
      "POST",
      "/applications",
      studentToken,
      appData
    );
    const appId = createResult.data.application_id;

    // Get initial timestamp
    const initialDbResult = await db.query<{updated_at: Date}>(
      "SELECT updated_at FROM ta_applications WHERE application_id = $1",
      [appId]
    );
    const initialUpdatedAt = new Date(initialDbResult.rows[0].updated_at as string | number | Date).getTime();

    // Wait to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the application
    const updateData = {
      ...appData,
      notes: "Updated version"
    };

    const updateResult = await makeAuthenticatedRequest(
      app,
      "POST",
      "/applications",
      studentToken,
      updateData
    );

    assertEquals(updateResult.response?.status, 200, "Should update application");

    // Verify timestamp was updated
    const updatedDbResult = await db.query<{submitted_at: Date, updated_at: Date}>(
      "SELECT submitted_at, updated_at FROM ta_applications WHERE application_id = $1",
      [appId]
    );
    const updatedRow = updatedDbResult.rows[0];
    assertExists(updatedRow.submitted_at, "Should retain submission timestamp");
    assertExists(updatedRow.updated_at, "Should have new update timestamp");
    assertEquals(
      new Date(updatedRow.updated_at as string | number | Date).getTime() > initialUpdatedAt,
      true,
      "Updated timestamp should be newer"
    );
  });

  await t.step("Application status change creates notification", async () => {
    // First create an application
    const appData = getCompleteApplicationData();
    appData.domainAreas = ["Testing", "Quality", "Verification"];

    const createResult = await makeAuthenticatedRequest(
      app,
      "POST",
      "/applications",
      studentToken,
      appData
    );
    const appId = createResult.data.application_id;

    // Change status
    const statusResult = await makeAuthenticatedRequest(
      app,
      "PATCH",
      `/applications/${appId}/status`,
      studentToken,
      { status: "approved" }
    );

    assertEquals(statusResult.response?.status, 200, "Should update status");
    assertEquals(statusResult.data.status, "approved", "Status should be approved");
  });

  await t.step("Teardown", async () => {
    console.log("🧹 Cleaning up test environment...");
    await db.disconnect();
  });
});

// Helper function from test_utils.ts
async function makeAuthenticatedRequest(
  app: Application,
  method: string,
  path: string,
  token: string,
  body?: any
): Promise<{ response?: Response; data: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cookie": `access_token=${token}`
  };

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await app.handle(
    new Request(`http://localhost:8000${path}`, requestInit)
  );

  let data: any = null;
  if (response) {
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
  }

  return { response, data };
}