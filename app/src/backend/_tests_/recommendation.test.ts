import { Application, assertEquals, assertExists } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { CourseModel } from "../../database/models/course.ts";
import { TARecommendationModel } from "../../database/models/recommendation.ts";
import { UserModel } from "../../database/models/user.ts";
import { AuthService } from "../services/auth.ts";
import {
  createTestApp,
  setupTestDatabase,
  TestMockFactory,
} from "./test_utils.ts";

Deno.test("TA Recommendation System", async (t) => {
  let db: Database;
  let app: Application;
  let instructorToken: string;
  let coordinatorToken: string;
  let userModel: UserModel;
  let courseModel: CourseModel;
  let recommendationModel: TARecommendationModel;
  let authService: AuthService;
  let testInstructor: any;
  let testCoordinator: any;
  let testCourse: any;
  let testStudents: any[] = [];

  await t.step("Setup", async () => {
    db = await setupTestDatabase();
    app = await createTestApp(db);

    // Initialize models and services
    authService = new AuthService(db);
    userModel = new UserModel(db);
    courseModel = new CourseModel(db);
    recommendationModel = new TARecommendationModel(db);

    // Create test instructor
    const instructorData = TestMockFactory.createMockUser({
      name: "Test Instructor",
      email: "instructor@ubc.ca",
      role: "instructor",
    });

    testInstructor = await userModel.createUser(instructorData);
    instructorToken = await authService.generateAccessToken(testInstructor);

    // Create test TA coordinator
    const coordinatorData = TestMockFactory.createMockUser({
      name: "TA Coordinator",
      email: "coordinator@ubc.ca",
      role: "ta_coordinator",
    });

    testCoordinator = await userModel.createUser(coordinatorData);
    coordinatorToken = await authService.generateAccessToken(testCoordinator);

    // Create test course
    testCourse = await courseModel.createCourse({
      code: "CPSC 110",
      title: "Computation, Programs, and Programming",
      dept_id: 1,
      term: "Fall 2024",
      instructor_id: testInstructor.user_id,
    });

    // Create test students with different profiles
    const studentProfiles = [
      {
        name: "Alice Johnson",
        email: "alice@student.ubc.ca",
        major: "Computer Science",
        gpa: 3.8,
        skills: "Python, JavaScript, Java",
        experience: "TA for CPSC 103",
        year: 3,
      },
      {
        name: "Bob Smith",
        email: "bob@student.ubc.ca",
        major: "Computer Science",
        gpa: 3.6,
        skills: "Java, C++, Python",
        experience: "No TA experience",
        year: 2,
      },
      {
        name: "Carol Davis",
        email: "carol@student.ubc.ca",
        major: "Mathematics",
        gpa: 3.9,
        skills: "Python, R, MATLAB",
        experience: "TA for MATH 200, MATH 221",
        year: 4,
      },
    ];

    for (const profile of studentProfiles) {
      const userData = TestMockFactory.createMockUser({
        name: profile.name,
        email: profile.email,
        role: "student",
        major: profile.major,
        student_number: `${Math.floor(Math.random() * 90000000) + 10000000}`,
      });

      const student = await userModel.createUser(userData);

      // Create student profile
      await db.query(
        `
        INSERT INTO student_profiles (user_id, overall_gpa, year_of_study, technical_skills, teaching_experience)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [
          student.user_id,
          profile.gpa,
          profile.year,
          profile.skills,
          profile.experience,
        ]
      );

      testStudents.push(student);
    }

    console.log(`Created ${testStudents.length} test students`);
  });

  await t.step(
    "GET /api/courses/:courseId/recommendations - should return TA candidates",
    async () => {
      const response = await app.handle(
        new Request(
          `http://localhost/api/courses/${testCourse.course_id}/recommendations`,
          {
            method: "GET",
            headers: {
              Cookie: `access_token=${instructorToken}`,
            },
          }
        )
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();

      assertExists(body.course);
      assertExists(body.candidates);
      assertEquals(body.course.course_id, testCourse.course_id);
      assertEquals(Array.isArray(body.candidates), true);

      console.log(`Found ${body.candidates.length} candidates`);

      // Check that candidates have required fields
      if (body.candidates.length > 0) {
        const candidate = body.candidates[0];
        assertExists(candidate.user_id);
        assertExists(candidate.name);
        assertExists(candidate.email);
        assertExists(candidate.major);
      }
    }
  );

  await t.step(
    "GET /api/courses/:courseId/recommendations with filters - should filter candidates",
    async () => {
      const response = await app.handle(
        new Request(
          `http://localhost/api/courses/${testCourse.course_id}/recommendations?min_gpa=3.7&major=Computer Science`,
          {
            method: "GET",
            headers: {
              Cookie: `access_token=${instructorToken}`,
            },
          }
        )
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();

      assertExists(body.candidates);

      // Check that all returned candidates meet the filter criteria
      body.candidates.forEach((candidate: any) => {
        if (candidate.overall_gpa) {
          assertEquals(
            candidate.overall_gpa >= 3.7,
            true,
            "GPA filter not applied correctly"
          );
        }
        assertEquals(
          candidate.major,
          "Computer Science",
          "Major filter not applied correctly"
        );
      });
    }
  );

  await t.step(
    "GET /api/recommendations/filters - should return available filter options",
    async () => {
      const response = await app.handle(
        new Request("http://localhost/api/recommendations/filters", {
          method: "GET",
          headers: {
            Cookie: `access_token=${instructorToken}`,
          },
        })
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();

      assertExists(body.available_skills);
      assertExists(body.available_majors);
      assertExists(body.experience_levels);
      assertExists(body.application_statuses);

      assertEquals(Array.isArray(body.available_skills), true);
      assertEquals(Array.isArray(body.available_majors), true);
      assertEquals(body.experience_levels.includes("beginner"), true);
      assertEquals(body.experience_levels.includes("intermediate"), true);
      assertEquals(body.experience_levels.includes("advanced"), true);
    }
  );

  await t.step("Should reject unauthorized access", async () => {
    const response = await app.handle(
      new Request(
        `http://localhost/api/courses/${testCourse.course_id}/recommendations`,
        {
          method: "GET",
        }
      )
    );

    assertEquals(response?.status === 401 || response?.status === 403, true);
  });

  await t.step(
    "Should reject access from non-instructor for course-specific recommendations",
    async () => {
      // Create a different instructor
      const otherInstructorData = TestMockFactory.createMockUser({
        name: "Other Instructor",
        email: "other@ubc.ca",
        role: "instructor",
      });

      const otherInstructor = await userModel.createUser(otherInstructorData);
      const otherInstructorToken = await authService.generateAccessToken(
        otherInstructor
      );

      const response = await app.handle(
        new Request(
          `http://localhost/api/courses/${testCourse.course_id}/recommendations`,
          {
            method: "GET",
            headers: {
              Cookie: `access_token=${otherInstructorToken}`,
            },
          }
        )
      );

      assertEquals(response?.status, 403);
      const body = await response?.json();
      assertEquals(
        body.error,
        "You must be the course instructor to view recommendations"
      );
    }
  );

  await t.step(
    "TA Coordinator should access any course recommendations",
    async () => {
      const response = await app.handle(
        new Request(
          `http://localhost/api/courses/${testCourse.course_id}/recommendations`,
          {
            method: "GET",
            headers: {
              Cookie: `access_token=${coordinatorToken}`,
            },
          }
        )
      );

      assertEquals(response?.status, 200);
      const body = await response?.json();
      assertExists(body.candidates);
    }
  );

  await t.step("Teardown", async () => {
    await db.disconnect();
    console.log("✅ TA Recommendation System test cleanup complete");
  });
});
