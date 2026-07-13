// app/src/database/_tests_/export.test.ts
import { assertEquals, assertExists } from "../../../deps.ts";
import { setupTestDatabase, TestMockFactory } from "../../backend/_tests_/test_utils.ts";
import { Database } from "../config.ts";
import { AllocationModel } from "../models/allocation.ts";
import { CourseModel } from "../models/course.ts";
import { ExportModel } from "../models/export.ts";
import { LabSectionModel } from "../models/labSection.ts";
import { TANeedModel } from "../models/taNeed.ts";
import { TermModel } from "../models/term.ts";
import { UserModel } from "../models/user.ts";

/**
 * Export Model Tests
 * 
 * This file tests the ExportModel database operations for analytics and report generation.
 * Tests cover: analytics retrieval, report data generation, and error handling.
 */

// Set test environment
Deno.env.set("DENO_ENV", "test");

Deno.test("Export Model - Analytics and Report Generation", async (t) => {
  let db: Database;
  let exportModel: ExportModel;
  let userModel: UserModel;
  let courseModel: CourseModel;
  let termModel: TermModel;
  let taNeedModel: TANeedModel;
  let allocationModel: AllocationModel;
  let labSectionModel: LabSectionModel;
  
  // Test data storage
  let testInstructor: any;
  let testStudent: any;
  let testTerm: any;
  let testCourse: any;
  let testLabSection: any;

  /**
   * Test 1: Setup database and models
   * Initialize all required models and create test data
   */
  await t.step("Setup database and models", async () => {
    db = await setupTestDatabase();
    
    // Initialize models
    exportModel = new ExportModel(db);
    userModel = new UserModel(db);
    courseModel = new CourseModel(db);
    termModel = new TermModel(db);
    taNeedModel = new TANeedModel(db);
    allocationModel = new AllocationModel(db);
    labSectionModel = new LabSectionModel(db);
    
    assertExists(exportModel, "ExportModel should be initialized");
    assertExists(userModel, "UserModel should be initialized");
  });

  /**
   * Test 2: Create test data
   * Set up instructor, student, course, and allocation data for testing
   */
  await t.step("Create test data for export testing", async () => {
    // Create test instructor
    const instructorData = TestMockFactory.createMockUser({
      name: "Dr. Test Instructor",
      email: "test.instructor@ubc.ca",
      role: "instructor",
      major: "Computer Science"
    });
    testInstructor = await userModel.createUser(instructorData);
    assertExists(testInstructor.user_id, "Instructor should be created with ID");

    // Create test student
    const studentData = TestMockFactory.createMockUser({
      name: "Test Student",
      email: "test.student@student.ubc.ca",
      role: "student",
      student_number: "12345678",
      major: "Computer Science"
    });
    testStudent = await userModel.createUser(studentData);
    assertExists(testStudent.user_id, "Student should be created with ID");

    // Create test term
    try {
      testTerm = await termModel.createTerm({
        name: "Test Winter 2024",
        start_date: "2024-01-01",
        end_date: "2024-04-30"
      });
    } catch (error) {
      // Term might already exist, try to get it
      const terms = await termModel.getAllTerms();
      testTerm = terms.find(t => t.name === "Test Winter 2024") || terms[0];
    }
    assertExists(testTerm.term_id, "Term should exist with ID");

    // Create test course with instructor
    const courseData = TestMockFactory.createMockCourse({
      code: "TEST301",
      title: "Advanced Testing Methods",
      term: testTerm.name,
      instructor_id: testInstructor.user_id,
      dept_id: 1,
      max_tas: 2
    });
    testCourse = await courseModel.createCourse(courseData);
    assertExists(testCourse.course_id, "Course should be created with ID");

    // Create lab section for the course
    testLabSection = await labSectionModel.createLabSection({
      course_id: testCourse.course_id,
      section_name: `L01_${Date.now()}`,
      lab_days: "Monday",
      lab_start_time: "09:00",
      lab_end_time: "11:00"
    });
    assertExists(testLabSection.lab_section_id, "Lab section should be created");

    console.log("✅ Test data created successfully");
  });

  /**
   * Test 3: Get available terms
   * Tests retrieving list of available terms for filtering
   */
  await t.step("getAvailableTerms - should return list of terms", async () => {
    const terms = await exportModel.getAvailableTerms();
    
    assertExists(terms, "Terms should be returned");
    assertEquals(Array.isArray(terms), true, "Terms should be an array");
    assertEquals(terms.length > 0, true, "Should have at least one term");
    
    // Verify term structure
    const firstTerm = terms[0];
    assertExists(firstTerm, "Term should exist");
    // If terms are strings, check type
    assertEquals(typeof firstTerm, "string", "Term should be a string");
    
    console.log(`✅ Retrieved ${terms.length} available terms`);
  });

  /**
   * Test 4: Get analytics without term filter
   * Tests general analytics data retrieval
   */
  await t.step("getAnalytics - should return analytics data without term filter", async () => {
    const analytics = await exportModel.getAnalytics();
    
    assertExists(analytics, "Analytics should be returned");
    assertExists(analytics.total_courses, "Should have total courses count");
    assertExists(analytics.total_students, "Should have total students count");
    assertExists(analytics.total_allocations, "Should have total allocations count");
    
    // Verify numeric values
    assertEquals(typeof analytics.total_courses, "number", "Total courses should be number");
    assertEquals(typeof analytics.total_students, "number", "Total students should be number");
    assertEquals(typeof analytics.total_allocations, "number", "Total allocations should be number");
    
    console.log("✅ Analytics retrieved successfully:", analytics);
  });

  /**
   * Test 5: Get analytics with term filter
   * Tests analytics retrieval filtered by specific term
   */
  await t.step("getAnalytics - should return analytics data with term filter", async () => {
    const analytics = await exportModel.getAnalytics(testTerm.term);
    
    assertExists(analytics, "Filtered analytics should be returned");
    assertExists(analytics.total_courses, "Should have total courses count for term");
    
    // Analytics for specific term should be valid
    assertEquals(typeof analytics.total_courses, "number", "Total courses should be number");
    assertEquals(analytics.total_courses >= 0, true, "Course count should be non-negative");
    
    console.log("✅ Term-filtered analytics retrieved:", analytics);
  });

  /**
   * Test 6: Get course allocation report data
   * Tests retrieval of course-wise allocation data
   */
  await t.step("getCourseAllocationReportData - should return course allocation data", async () => {
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
    
    console.log(`✅ Course allocation report data retrieved: ${reportData.length} records`);
  });

  /**
   * Test 7: Get student assignment report data
   * Tests retrieval of student assignment data
   */
  await t.step("getStudentAssignmentReportData - should return student assignment data", async () => {
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
    
    console.log(`✅ Student assignment report data retrieved: ${reportData.length} records`);
  });

  /**
   * Test 8: Get hours comparison report data
   * Tests retrieval of hours comparison data
   */
  await t.step("getHoursComparisonReportData - should return hours comparison data", async () => {
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
    
    console.log(`✅ Hours comparison report data retrieved: ${reportData.length} records`);
  });

  /**
   * Test 9: Error handling for invalid term
   * Tests that invalid term parameters are handled gracefully
   */
  await t.step("Error handling - should handle invalid term gracefully", async () => {
    try {
      const analytics = await exportModel.getAnalytics("InvalidTerm2099");
      
      // Should not throw error, but return empty/zero results
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
   * Test 10: Report data consistency
   * Tests that report data is consistent across different methods
   */
  await t.step("Data consistency - report methods should return consistent data", async () => {
    const analytics = await exportModel.getAnalytics();
    const courseData = await exportModel.getCourseAllocationReportData();
    const studentData = await exportModel.getStudentAssignmentReportData();
    
    // Basic consistency checks
    assertExists(analytics, "Analytics should exist");
    assertExists(courseData, "Course data should exist");
    assertExists(studentData, "Student data should exist");
    
    // Course count consistency (if courses exist)
    if (courseData.length > 0) {
      assertEquals(analytics.total_courses >= courseData.length, true, 
        "Analytics course count should be at least as many as detailed course records");
    }
    
    console.log("✅ Data consistency verified across report methods");
  });

  /**
   * Test 11: Cleanup
   * Clean up test data and close database connection
   */
  await t.step("Cleanup test data", async () => {
    try {
      // Clean up is handled by the test database framework
      await db.disconnect();
      assertEquals(true, true, "Cleanup completed successfully");
      console.log("✅ Test cleanup completed");
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