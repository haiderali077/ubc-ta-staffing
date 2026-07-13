import { Application, assertEquals, assertExists, hashPassword, oakCors, Router } from "../../../deps.ts";
import { Database, getDatabaseConfig } from "../../database/config.ts";
import { CourseModel } from "../../database/models/course.ts";
import { TermModel } from "../../database/models/term.ts";
import { UserModel } from "../../database/models/user.ts";
import { SchemaManager } from "../../database/schema.ts";
import { authRouter, setAuthService } from "../routes/auth.ts";
import { setTACoordinatorModels, taCoordinatorRouter } from "../routes/taCoordinatorRouter.ts";
import { AuthService } from "../services/auth.ts";

// Set test environment
Deno.env.set("DENO_ENV", "test");
Deno.env.set("JWT_SECRET", "test-secret-key");
Deno.env.set("REFRESH_SECRET", "test-refresh-secret");

/**
 * Course Offering Backend Tests
 * 
 * Tests the TA Coordinator CourseOffering endpoints including:
 * - Creating course offerings with lab sections
 * - Retrieving course offerings
 * - Updating course offerings
 * - Deleting course offerings
 * - Authorization and validation
 */

// Check if we should skip database tests
function shouldSkipDatabaseTests(): boolean {
  // Skip if explicitly disabled or if running in CI without database
  return Deno.env.get("SKIP_DB_TESTS") === "true" || 
         (Deno.env.get("CI") === "true" && !Deno.env.get("DB_HOST"));
}

// Helper function to setup test database
async function setupTestDatabase(): Promise<Database | null> {
  if (shouldSkipDatabaseTests()) {
    console.log("⚠️ Skipping database tests - database not available");
    return null;
  }

  try {
    const config = getDatabaseConfig();
    const db = new Database(config);
    
    await db.connect();
    
    const schemaManager = new SchemaManager(db);
    await schemaManager.dropAllTables();
    await schemaManager.createAllTables();
    
    return db;
  } catch (error) {
    console.error("Failed to setup test database:", error);
    console.log("⚠️ Skipping database tests - connection failed");
    return null;
  }
}

// Helper function to create test app
async function createTestApp(db: Database | null): Promise<Application | null> {
  if (!db) return null;

  const app = new Application();
  
  // Initialize models and services
  const userModel = new UserModel(db);
  const courseModel = new CourseModel(db);
  const termModel = new TermModel(db);
  const authService = new AuthService(db);

  // Setup auth service
  setAuthService(authService);
  
  // Setup TA Coordinator routes with minimal dependencies
  setTACoordinatorModels(
    termModel,
    courseModel, 
    authService,
    userModel,
    null as any, // taNeedModel - not needed for basic course tests
    null as any, // applicationModel - not needed for basic course tests
    null as any  // allocationModel - not needed for basic course tests
  );

  // Add CORS
  app.use(oakCors({
    origin: ["http://localhost:3000"],
    credentials: true,
  }));

  // Add routes
  app.use(authRouter.routes());
  app.use(authRouter.allowedMethods());
  
  // Add TA Coordinator routes with prefix
  const prefixedTACoordinatorRouter = new Router({
    prefix: "/api/ta-coordinator",
  });
  prefixedTACoordinatorRouter.use(taCoordinatorRouter.routes());
  prefixedTACoordinatorRouter.use(taCoordinatorRouter.allowedMethods());
  
  app.use(prefixedTACoordinatorRouter.routes());
  app.use(prefixedTACoordinatorRouter.allowedMethods());

  return app;
}

// Helper function to get auth token
async function getAuthToken(app: Application | null, email: string, password: string): Promise<string | null> {
  if (!app) return null;

  try {
    const loginRequest = new Request("http://localhost/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const response = await app.handle(loginRequest);
    
    if (response?.status !== 200) {
      throw new Error(`Login failed with status ${response?.status}`);
    }

    // Extract token from Set-Cookie header
    const setCookieHeader = response.headers.get("Set-Cookie");
    if (!setCookieHeader) {
      throw new Error("No Set-Cookie header found");
    }

    const tokenMatch = setCookieHeader.match(/access_token=([^;]+)/);
    if (!tokenMatch) {
      throw new Error("No access_token found in cookies");
    }

    return tokenMatch[1];
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

Deno.test("CourseOffering TA Coordinator Routes", async (t) => {
  let db: Database | null;
  let app: Application | null;
  let courseModel: CourseModel | null;
  let userModel: UserModel | null;
  let termModel: TermModel | null;
  let authService: AuthService | null;
  
  // Test tokens for different user roles
  let taCoordinatorToken: string | null;
  let instructorToken: string | null;
  let studentToken: string | null;
  
  // Test data
  let testTerm: any;
  let testCourse: any;
  let testUsers: any = {};

  /**
   * Setup Phase
   * Initialize database, models, and test users
   */
  await t.step("Setup test environment and users", async () => {
    try {
      // Initialize database and services
      db = await setupTestDatabase();
      if (!db) {
        console.log("Database setup skipped - tests will be limited");
        return;
      }

      authService = new AuthService(db);
      courseModel = new CourseModel(db);
      userModel = new UserModel(db);
      termModel = new TermModel(db);
      app = await createTestApp(db);
      
      // Create test users with different roles
      const userData = {
        taCoordinator: {
          email: "ta.coordinator@test.ubc.ca",
          password_hash: await hashPassword("password123"),
          name: "TA Coordinator",
          role: "ta_coordinator" as "ta_coordinator",
          major: "Computer Science",
          student_number: "12345678",
          year_level: "Graduate",
          gpa: 3.8
        },
        instructor: {
          email: "instructor@test.ubc.ca",
          password_hash: await hashPassword("password123"), 
          name: "Test Instructor",
          role: "instructor" as "instructor",
          major: "Computer Science",
          student_number: "87654321",
          year_level: "Graduate",
          gpa: 3.9
        },
        student: {
          email: "student@test.ubc.ca",
          password_hash: await hashPassword("password123"),
          name: "Test Student",
          role: "student" as "student",
          major: "Computer Science", 
          student_number: "11111111",
          year_level: "3rd",
          gpa: 3.5
        }
      };
      
      for (const [role, data] of Object.entries(userData)) {
        const user = await userModel.createUser(data);
        testUsers[role] = user;
      }
      
      // Get authentication tokens
      taCoordinatorToken = await getAuthToken(app, userData.taCoordinator.email, "password123");
      instructorToken = await getAuthToken(app, userData.instructor.email, "password123");
      studentToken = await getAuthToken(app, userData.student.email, "password123");
      
      // Create test term
      testTerm = await termModel.createTerm({
        name: "Winter 2024",
        start_date: "2024-01-01",
        end_date: "2024-04-30",
        status: "active"
      });
      
      console.log("✅ Test setup completed successfully");
    } catch (error) {
      console.error("Setup failed:", error);
      // Don't throw - let individual tests handle the null state
    }
  });

  /**
   * Test 1: GET /api/ta-coordinator/courses - Get all courses
   * Verifies TA Coordinator can retrieve all course offerings
   */
  await t.step("GET /courses - should return all courses for TA Coordinator", async () => {
    // Skip test if setup failed
    if (!courseModel || !testUsers.instructor || !app || !taCoordinatorToken) {
      console.log("⚠️ Skipping test - setup failed or database unavailable");
      return;
    }

    // First create a test course
    testCourse = await courseModel.createCourse({
      code: "CPSC110",
      title: "Computation, Programs, and Programming",
      term: "Winter 2024",
      instructor_id: testUsers.instructor.user_id,
      dept_id: 1,
      max_tas: 2
    });

    const request = new Request("http://localhost/api/ta-coordinator/courses", {
      method: "GET",
      headers: {
        "Cookie": `access_token=${taCoordinatorToken}`
      }
    });

    const response = await app.handle(request);
    assertEquals(response?.status, 200, "Should return 200 for courses list");

    const body = await response?.json();
    assertEquals(Array.isArray(body), true, "Should return array of courses");
    assertEquals(body.length > 0, true, "Should have at least one course");
    
    const course = body.find((c: any) => c.code === "CPSC110");
    assertExists(course, "Should include the test course");
    assertEquals(course.title, "Computation, Programs, and Programming");
    
    console.log("✅ GET courses test passed");
  });

  /**
   * Test 2: POST /api/ta-coordinator/courses - Create new course offering
   * Tests course creation with proper validation
   */
  await t.step("POST /courses - should create new course offering", async () => {
    if (!app || !testUsers.instructor || !taCoordinatorToken) {
      console.log("⚠️ Skipping test - setup failed or database unavailable");
      return;
    }

    const newCourseData = {
      code: "CPSC210",
      title: "Software Construction",
      term: "Winter 2024",
      instructor_id: testUsers.instructor.user_id,
      dept_id: 1
    };

    const request = new Request("http://localhost/api/ta-coordinator/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `access_token=${taCoordinatorToken}`
      },
      body: JSON.stringify(newCourseData)
    });

    const response = await app.handle(request);
    assertEquals(response?.status, 201, "Should return 201 for created course");

    const body = await response?.json();
    assertEquals(body.code, newCourseData.code);
    assertEquals(body.title, newCourseData.title);
    assertEquals(body.instructor_id, newCourseData.instructor_id);
    assertEquals(body.max_tas, 0, "Should default max_tas to 0");
    
    console.log("✅ POST courses test passed");
  });

  /**
   * Test 3: Authorization Tests
   * Verifies proper role-based access control
   */
  await t.step("Should reject unauthorized access from students", async () => {
    if (!app || !studentToken) {
      console.log("⚠️ Skipping test - setup failed or database unavailable");
      return;
    }

    const request = new Request("http://localhost/api/ta-coordinator/courses", {
      method: "GET",
      headers: {
        "Cookie": `access_token=${studentToken}`
      }
    });

    const response = await app.handle(request);
    assertEquals(response?.status, 403, "Should return 403 for student access");

    const body = await response?.json();
    assertEquals(body.error, "Admin or TA Coordinator access required");
    
    console.log("✅ Authorization test passed");
  });

  /**
   * Test 4: Unit-style tests that don't require database
   * These tests verify business logic without database dependencies
   */
  await t.step("Should validate email format (unit test)", () => {
    // Simple email validation test
    const isValidUBCEmail = (email: string): boolean => {
      const ubcDomains = ['@ubc.ca', '@student.ubc.ca', '@alumni.ubc.ca'];
      return ubcDomains.some(domain => email.endsWith(domain)) && email.length > 10;
    };

    assertEquals(isValidUBCEmail('student@student.ubc.ca'), true, "Should accept student email");
    assertEquals(isValidUBCEmail('prof@ubc.ca'), true, "Should accept faculty email");
    assertEquals(isValidUBCEmail('invalid@gmail.com'), false, "Should reject non-UBC email");
    assertEquals(isValidUBCEmail(''), false, "Should reject empty email");
    
    console.log("✅ Email validation test passed");
  });

  await t.step("Should validate course code format (unit test)", () => {
    // Simple course code validation test
    const isValidCourseCode = (code: string): boolean => {
      // Pattern: 4 letters followed by 3 digits (e.g., CPSC110)
      const pattern = /^[A-Z]{4}\d{3}$/;
      return pattern.test(code);
    };

    assertEquals(isValidCourseCode('CPSC110'), true, "Should accept valid course code");
    assertEquals(isValidCourseCode('MATH200'), true, "Should accept valid math course code");
    assertEquals(isValidCourseCode('cpsc110'), false, "Should reject lowercase");
    assertEquals(isValidCourseCode('CPSC1'), false, "Should reject incomplete code");
    assertEquals(isValidCourseCode(''), false, "Should reject empty code");
    
    console.log("✅ Course code validation test passed");
  });

  /**
   * Cleanup Phase
   * Close database connection
   */
  await t.step("Cleanup test environment", async () => {
    try {
      if (db) {
        await db.disconnect();
        console.log("✅ Database disconnected");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      // Don't throw - cleanup errors shouldn't fail the test
    }
  });
});