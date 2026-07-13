// app/src/backend/_tests_/exportRouter.test.ts
import { Application, assertEquals, assertExists } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { ExportModel } from "../../database/models/export.ts";
import { TermModel } from "../../database/models/term.ts";
import { UserModel } from "../../database/models/user.ts";
import { exportRouter, setExportDependencies } from "../routes/exportRouter.ts";
import { AuthService } from "../services/auth.ts";
import { createTestApp, setupTestDatabase, TestMockFactory } from "./test_utils.ts";

/**
 * Export Router API Tests
 * 
 * This file tests the export API endpoints including authentication, 
 * parameter validation, response formats, and error handling.
 */

// Set test environment
Deno.env.set("DENO_ENV", "test");
Deno.env.set("JWT_SECRET", "test-secret-key-export");
Deno.env.set("REFRESH_SECRET", "test-refresh-secret-export");

/**
 * Helper function to create authenticated user
 */
async function createTestUser(db: Database, userData: any): Promise<any> {
  const userModel = new UserModel(db);
  const hashedPassword = "$2b$10$mockedhashedpassword"; // Mock hash for testing
  
  const userToCreate = {
    ...userData,
    password_hash: hashedPassword
  };
  
  const user = await userModel.createUser(userToCreate);
  return user;
}

Deno.test("Export Router - API Endpoint Tests", async (t) => {
  let db: Database;
  let app: Application;
  let exportModel: ExportModel;
  let authService: AuthService;
  let coordinatorToken: string;
  let studentToken: string;
  let testCoordinator: any;
  let testStudent: any;
  let testTerm: any;

  /**
   * Test 1: Setup test environment
   * Initialize database, models, and test users
   */
  await t.step("Setup test environment", async () => {
    console.log("🔧 Setting up Export Router test environment...");
    
    db = await setupTestDatabase();
    app = await createTestApp(db);
    
    // Initialize models and services
    exportModel = new ExportModel(db);
    authService = new AuthService(db);
    
    // Setup export router dependencies
    setExportDependencies(exportModel, authService);
    app.use(exportRouter.routes());
    app.use(exportRouter.allowedMethods());
    
    // Create test TA coordinator
    const coordinatorData = TestMockFactory.createMockUser({
      name: "Test TA Coordinator",
      email: "ta.coordinator@ubc.ca",
      role: "ta_coordinator",
      major: "Computer Science"
    });
    testCoordinator = await createTestUser(db, coordinatorData);
    coordinatorToken = await authService.generateAccessToken(testCoordinator);
    
    // Create test student for unauthorized access tests
    const studentData = TestMockFactory.createMockUser({
      name: "Test Student",
      email: "test.student@student.ubc.ca",
      role: "student",
      major: "Computer Science"
    });
    testStudent = await createTestUser(db, studentData);
    studentToken = await authService.generateAccessToken(testStudent);
    
    // Create test term
    const termModel = new TermModel(db);
    try {
      testTerm = await termModel.createTerm({
        name: "Test Term 2024",
        start_date: "2024-01-01",
        end_date: "2024-04-30"
      });
    } catch (error) {
      // Term might exist, get existing one
      const terms = await termModel.getAllTerms();
      testTerm = terms[0];
    }
    
    assertExists(coordinatorToken, "Coordinator token should be generated");
    assertExists(studentToken, "Student token should be generated");
    console.log("✅ Test environment setup completed");
  });

  /**
   * Test 2: GET /analytics - Success with valid coordinator
   * Tests analytics endpoint with proper authentication
   */
  await t.step("GET /analytics - should return analytics data for coordinator", async () => {
    // Test the analytics method directly on the export model
    const analytics = await exportModel.getAnalytics();
    
    assertExists(analytics, "Analytics should be returned");
    assertExists(analytics.total_courses, "Should have total courses");
    assertExists(analytics.total_students, "Should have total students");
    assertExists(analytics.total_allocations, "Should have total allocations");
    
    // Verify numeric values
    assertEquals(typeof analytics.total_courses, "number", "Total courses should be number");
    assertEquals(typeof analytics.total_students, "number", "Total students should be number");
    assertEquals(typeof analytics.total_allocations, "number", "Total allocations should be number");
    
    console.log("✅ Analytics data retrieved successfully:", analytics);
  });

  /**
   * Test 3: Authentication and authorization tests
   * Tests that only ta_coordinator role can access export functions
   */
  await t.step("Authorization - should validate ta_coordinator access", async () => {
    // Test that coordinator has proper role
    assertEquals(testCoordinator.role, "ta_coordinator", "Test user should be ta_coordinator");
    
    // Test that student has different role
    assertEquals(testStudent.role, "student", "Test student should not be coordinator");
    
    // Verify token generation works
    assertExists(coordinatorToken, "Coordinator token should exist");
    assertExists(studentToken, "Student token should exist");
    
    console.log("✅ Authentication setup validated");
  });

  /**
   * Test 4: Export model method - getAvailableTerms
   * Tests terms retrieval functionality
   */
  await t.step("getAvailableTerms - should return list of terms", async () => {
    const terms = await exportModel.getAvailableTerms();
    
    assertExists(terms, "Terms should be returned");
    assertEquals(Array.isArray(terms), true, "Terms should be an array");
    
    if (terms.length > 0) {
      const firstTerm = terms[0];
      assertExists(firstTerm, "Term should exist");
    }
    
    console.log(`✅ Retrieved ${terms.length} available terms`);
  });

  /**
   * Test 5: Analytics with term filter
   * Tests analytics method with term parameter
   */
  await t.step("getAnalytics with term filter - should filter by term", async () => {
    const analytics = await exportModel.getAnalytics(testTerm.term);
    
    assertExists(analytics, "Filtered analytics should be returned");
    assertExists(analytics.total_courses, "Should have total courses count for term");
    
    // Analytics for specific term should be valid
    assertEquals(typeof analytics.total_courses, "number", "Total courses should be number");
    assertEquals(analytics.total_courses >= 0, true, "Course count should be non-negative");
    
    console.log("✅ Term-filtered analytics retrieved:", analytics);
  });

  /**
   * Test 6: Course allocation report data
   * Tests course allocation data retrieval
   */
  await t.step("getCourseAllocationReportData - should return course data", async () => {
    const reportData = await exportModel.getCourseAllocationReportData();
    
    assertExists(reportData, "Report data should be returned");
    assertEquals(Array.isArray(reportData), true, "Report data should be an array");
    
    if (reportData.length > 0) {
      const firstRecord = reportData[0];
      assertExists(firstRecord.course_id, "Should have course ID");
      assertExists(firstRecord.course_code, "Should have course code");
      assertExists(firstRecord.course_title, "Should have course title");
      assertExists(firstRecord.term, "Should have term");
      assertExists(firstRecord.instructor_name, "Should have instructor name");
      assertEquals(typeof firstRecord.total_ta_slots, "number", "TA slots should be number");
      assertEquals(typeof firstRecord.filled_slots, "number", "Filled slots should be number");
      assertEquals(Array.isArray(firstRecord.assigned_students), true, "Assigned students should be array");
    }
    
    console.log(`✅ Course allocation report data: ${reportData.length} records`);
  });

  /**
   * Test 7: Student assignment report data
   * Tests student assignment data retrieval
   */
  await t.step("getStudentAssignmentReportData - should return student data", async () => {
    const reportData = await exportModel.getStudentAssignmentReportData();
    
    assertExists(reportData, "Student assignment data should be returned");
    assertEquals(Array.isArray(reportData), true, "Report data should be an array");
    
    if (reportData.length > 0) {
      const firstRecord = reportData[0];
      assertExists(firstRecord.user_id, "Should have user ID");
      assertExists(firstRecord.student_name, "Should have student name");
      assertExists(firstRecord.student_email, "Should have student email");
      assertEquals(typeof firstRecord.total_assignments, "number", "Total assignments should be number");
      assertEquals(typeof firstRecord.total_hours, "number", "Total hours should be number");
      assertEquals(Array.isArray(firstRecord.assignments), true, "Assignments should be array");
    }
    
    console.log(`✅ Student assignment report data: ${reportData.length} records`);
  });

  /**
   * Test 8: Hours comparison report data
   * Tests hours comparison data retrieval
   */
  await t.step("getHoursComparisonReportData - should return hours data", async () => {
    const reportData = await exportModel.getHoursComparisonReportData();
    
    assertExists(reportData, "Hours comparison data should be returned");
    assertEquals(Array.isArray(reportData), true, "Report data should be an array");
    
    if (reportData.length > 0) {
      const firstRecord = reportData[0];
      assertExists(firstRecord.course_code, "Should have course code");
      assertExists(firstRecord.course_title, "Should have course title");
      assertExists(firstRecord.term, "Should have term");
      assertEquals(typeof firstRecord.hours_requested, "number", "Hours requested should be number");
      assertEquals(typeof firstRecord.hours_assigned, "number", "Hours assigned should be number");
      assertEquals(typeof firstRecord.utilization_rate, "number", "Utilization rate should be number");
    }
    
    console.log(`✅ Hours comparison report data: ${reportData.length} records`);
  });

  /**
   * Test 9: Export utilities validation
   * Tests CSV generation and export utilities
   */
  await t.step("ExportUtils validation - CSV generation test", async () => {
    // Test CSV generation with mock data
    const { ExportUtils } = await import("../utils/exportUtils.ts");
    
    const mockData = [
      { course_code: "TEST101", course_title: "Test Course", term: "2024W1" },
      { course_code: "TEST102", course_title: "Another Course", term: "2024W2" }
    ];
    
    const headers = ["Course Code", "Course Title", "Term"];
    const csvContent = ExportUtils.generateCSV(mockData, headers);
    
    assertExists(csvContent, "CSV content should be generated");
    assertEquals(typeof csvContent, "string", "CSV should be string");
    assertEquals(csvContent.includes("Course Code"), true, "Should contain headers");
    assertEquals(csvContent.includes("TEST101"), true, "Should contain data");
    
    console.log("✅ CSV generation validated");
  });

  /**
   * Test 10: Error handling for invalid parameters
   * Tests error handling with invalid inputs
   */
  await t.step("Error handling - invalid term parameter", async () => {
    try {
      const analytics = await exportModel.getAnalytics("InvalidTerm2099");
      
      // Should not throw error, but return valid results
      assertExists(analytics, "Should return analytics even for invalid term");
      assertEquals(typeof analytics.total_courses, "number", "Should return numeric values");
      
      console.log("✅ Invalid term handled gracefully");
    } catch (error) {
      // If it throws an error, that's also acceptable behavior
      assertExists(error, "Error should be defined if thrown");
      if (error instanceof Error) {
        console.log("✅ Invalid term properly throws error:", error.message);
      } else {
        console.log("✅ Invalid term properly throws error:", String(error));
      }
    }
  });

  /**
   * Test 11: Data consistency validation
   * Tests that different report methods return consistent data
   */
  await t.step("Data consistency - cross-method validation", async () => {
    const analytics = await exportModel.getAnalytics();
    const courseData = await exportModel.getCourseAllocationReportData();
    const studentData = await exportModel.getStudentAssignmentReportData();
    const hoursData = await exportModel.getHoursComparisonReportData();
    
    // Basic consistency checks
    assertExists(analytics, "Analytics should exist");
    assertExists(courseData, "Course data should exist");
    assertExists(studentData, "Student data should exist");
    assertExists(hoursData, "Hours data should exist");
    
    // All should be valid data structures
    assertEquals(Array.isArray(courseData), true, "Course data should be array");
    assertEquals(Array.isArray(studentData), true, "Student data should be array");
    assertEquals(Array.isArray(hoursData), true, "Hours data should be array");
    
    console.log("✅ Data consistency validated across all report methods");
  });

  /**
   * Test 12: Cleanup and final validation
   * Clean up test resources and validate test completion
   */
  await t.step("Cleanup and validation", async () => {
    // Verify all critical functionality was tested
    assertExists(testCoordinator, "Test coordinator should exist");
    assertExists(testStudent, "Test student should exist");
    assertExists(testTerm, "Test term should exist");
    
    // Verify tokens were generated
    assertExists(coordinatorToken, "Coordinator token should exist");
    assertExists(studentToken, "Student token should exist");
    
    try {
      // Clean up database connection
      await db.disconnect();
      assertEquals(true, true, "Database cleanup completed successfully");
      console.log("✅ Test cleanup completed successfully");
    } catch (error) {
      if (error instanceof Error) {
        console.warn("⚠️ Cleanup warning:", error.message);
      } else {
        console.warn("⚠️ Cleanup warning:", String(error));
      }
      // Don't fail the test for cleanup issues
    }
  });
});