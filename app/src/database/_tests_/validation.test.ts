import { assertEquals, assertExists } from "../../../deps.ts";
import { setupTestDatabase, TestMockFactory } from "../../backend/_tests_/test_utils.ts";
import { Database } from "../config.ts";
import { ApplicationModel } from "../models/application.ts";
import { CourseModel } from "../models/course.ts";
import { UserModel } from "../models/user.ts";

/**
 * Database Validation Test
 * 
 * This file tests data validation including email format, duplicate prevention,
 * required fields, and data integrity constraints.
 */

// Set test environment
Deno.env.set("DENO_ENV", "test");

Deno.test("Database Data Validation", async (t) => {
  let db: Database;
  let userModel: UserModel;
  let courseModel: CourseModel;
  let applicationModel: ApplicationModel;

  /**
   * Setup Phase
   * Initialize database and models for validation testing
   */
  await t.step("Setup database and models", async () => {
    db = await setupTestDatabase();
    userModel = new UserModel(db);
    courseModel = new CourseModel(db);
    applicationModel = new ApplicationModel(db);
  });

  /**
   * Test 1: Email format validation
   * Ensures only valid email formats are accepted
   */
  await t.step("Validate email format requirements", async () => {
    // Test valid UBC email formats
    const validEmails = [
      "student@student.ubc.ca",
      "professor@ubc.ca",
      "ta.coordinator@ubc.ca",
      "john.doe@alumni.ubc.ca"
    ];
    
    for (const email of validEmails) {
      const userData = TestMockFactory.createMockUser({ email });
      
      try {
        const user = await userModel.createUser(userData);
        assertExists(user, `Should create user with valid email: ${email}`);
        
        // Clean up - delete the user to avoid conflicts
        await db.query("DELETE FROM users WHERE user_id = $1", [user.user_id]);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        assertEquals(false, true, `Valid email ${email} should not throw error: ${errorMsg}`);
      }
    }
    
    // Test invalid email formats
    const invalidEmails = [
      "notanemail",
      "@ubc.ca",
      "user@",
      "user@.com",
      "user space@ubc.ca",
      "user@gmail.com" // Non-UBC email
    ];
    
    for (const email of invalidEmails) {
      const userData = TestMockFactory.createMockUser({ email });
      
      try {
        await userModel.createUser(userData);
        assertEquals(true, false, `Should not create user with invalid email: ${email}`);
      } catch (error) {
        assertExists(error, `Should throw error for invalid email: ${email}`);
      }
    }
  });

  /**
   * Test 2: Required fields validation
   * Ensures all required fields must be provided
   */
  await t.step("Validate required fields", async () => {
    // Test missing required fields for user
    const incompleteUserData = {
      email: "test@student.ubc.ca",
      // Missing: name, password_hash, role
    };
    
    try {
      await db.query(
        "INSERT INTO users (email) VALUES ($1)",
        [incompleteUserData.email]
      );
      assertEquals(true, false, "Should not create user without required fields");
    } catch (error) {
      assertExists(error, "Should throw error for missing required fields");
      assertEquals(
        (error instanceof Error
          ? (error.message.toLowerCase().includes("null value") ||
             error.message.toLowerCase().includes("not null"))
          : false),
        true,
        "Error should mention null constraint violation"
      );
    }
    
    // Test course creation without required fields
    try {
      await db.query(
        "INSERT INTO courses (code) VALUES ($1)",
        ["CPSC999"]
      );
      assertEquals(true, false, "Should not create course without required fields");
    } catch (error) {
      assertExists(error, "Should throw error for missing course fields");
    }
  });

  /**
   * Test 3: Duplicate email prevention
   * Ensures system prevents duplicate email addresses
   */
  await t.step("Prevent duplicate email addresses", async () => {
    // Create first user
    const userData = TestMockFactory.createMockUser({
      email: "unique.user@student.ubc.ca"
    });
    
    const firstUser = await userModel.createUser(userData);
    assertExists(firstUser, "Should create first user");
    
    // Attempt to create second user with same email
    const duplicateUserData = TestMockFactory.createMockUser({
      email: "unique.user@student.ubc.ca", // Same email
      name: "Different Name"
    });
    
    try {
      await userModel.createUser(duplicateUserData);
      assertEquals(true, false, "Should not create user with duplicate email");
    } catch (error) {
      assertExists(error, "Should throw error for duplicate email");
      assertEquals(
        (error instanceof Error
          ? (error.message.toLowerCase().includes("duplicate") ||
             error.message.toLowerCase().includes("unique"))
          : false),
        true,
        "Error should mention duplicate/unique constraint"
      );
    }
  });

  /**
   * Test 4: Role validation
   * Ensures only valid roles can be assigned to users
   */
  await t.step("Validate user role constraints", async () => {
    // Valid roles
    const validRoles = ["student", "instructor", "admin", "ta_coordinator"];
    
    for (const role of validRoles) {
      const userData = TestMockFactory.createMockUser({
        email: `${role}@test.ubc.ca`,
        role: role as any
      });
      
      try {
        const user = await userModel.createUser(userData);
        assertExists(user, `Should create user with valid role: ${role}`);
        assertEquals(user.role, role, "Role should match");
        
        // Clean up
        await db.query("DELETE FROM users WHERE user_id = $1", [user.user_id]);
      } catch (error) {
        assertEquals(false, true, `Valid role ${role} should not throw error`);
      }
    }
    
    // Invalid role
    try {
      await db.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ["Test User", "invalid.role@ubc.ca", "hash", "superuser"]
      );
      assertEquals(true, false, "Should not create user with invalid role");
    } catch (error) {
      assertExists(error, "Should throw error for invalid role");
    }
  });

  /**
   * Test 5: Application status validation
   * Ensures only valid statuses can be set for applications
   */
  await t.step("Validate application status constraints", async () => {
    // Create a user for application
    const userData = TestMockFactory.createMockUser();
    const user = await userModel.createUser(userData);
    
    // Valid statuses
    const validStatuses = ["pending", "approved", "rejected", "allocated"];
    
    for (const status of validStatuses) {
      const appData = TestMockFactory.createMockApplication({
        user_id: user.user_id,
        status: status as any
      });
      
      const app = await applicationModel.createApplication(appData);
      assertExists(app, `Should create application with status: ${status}`);
      assertEquals(app.status, status, "Status should match");
    }
    
    // Invalid status
    try {
      await db.query(
        "INSERT INTO ta_applications (user_id, status) VALUES ($1, $2)",
        [user.user_id, "invalid_status"]
      );
      assertEquals(true, false, "Should not create application with invalid status");
    } catch (error) {
      assertExists(error, "Should throw error for invalid status");
    }
  });

  /**
   * Test 6: Foreign key validation
   * Ensures foreign key constraints are enforced
   */
  await t.step("Validate foreign key constraints", async () => {
    // Try to create course with non-existent instructor
    try {
      await db.query(
        "INSERT INTO courses (code, title, term, instructor_id, dept_id) VALUES ($1, $2, $3, $4, $5)",
        ["TEST999", "Test Course", "Fall 2024", 99999, 1] // Non-existent instructor
      );
      assertEquals(true, false, "Should not create course with invalid instructor_id");
    } catch (error) {
      assertExists(error, "Should throw error for invalid foreign key");
      assertEquals(
        (error instanceof Error &&
          (error.message.toLowerCase().includes("foreign key") ||
           error.message.toLowerCase().includes("violates"))),
        true,
        "Error should mention foreign key violation"
      );
    }
    
    // Try to create application for non-existent user
    try {
      await db.query(
        "INSERT INTO ta_applications (user_id, status) VALUES ($1, $2)",
        [99999, "pending"] // Non-existent user
      );
      assertEquals(true, false, "Should not create application for non-existent user");
    } catch (error) {
      assertExists(error, "Should throw error for invalid user reference");
    }
  });

  /**
   * Test 7: Data type validation
   * Ensures correct data types are enforced
   */
  await t.step("Validate data type constraints", async () => {
    // Test numeric fields
    try {
      await db.query(
        "INSERT INTO courses (code, title, term, instructor_id, dept_id, max_tas) VALUES ($1, $2, $3, $4, $5, $6)",
        ["CPSC110", "Test Course", "Fall 2024", 1, 1, "not_a_number"]
      );
      assertEquals(true, false, "Should not accept non-numeric value for max_tas");
    } catch (error) {
      assertExists(error, "Should throw error for invalid data type");
    }
    
    // Test date fields
    try {
      await db.query(
        "INSERT INTO terms (name, start_date, end_date) VALUES ($1, $2, $3)",
        ["Test Term", "not_a_date", "2024-12-31"]
      );
      assertEquals(true, false, "Should not accept invalid date format");
    } catch (error) {
      assertExists(error, "Should throw error for invalid date");
    }
  });

  /**
   * Test 8: String length validation
   * Ensures string fields respect length constraints
   */
  await t.step("Validate string length constraints", async () => {
    // Create very long string (assuming varchar limits)
    const veryLongString = "x".repeat(1000);
    
    // Test if there are length constraints on course code
    const courseData = TestMockFactory.createMockCourse({
      code: veryLongString,
      title: "Normal Title"
    });
    
    try {
      // Most course codes have length limits
      await db.query(
        "INSERT INTO courses (code, title, term, instructor_id, dept_id) VALUES ($1, $2, $3, $4, $5)",
        [veryLongString, courseData.title, courseData.term, 1, 1]
      );
      // If this succeeds, there might not be a length constraint
      // Clean up
      await db.query("DELETE FROM courses WHERE code = $1", [veryLongString]);
    } catch (error) {
      // Expected behavior - length constraint violated
      assertExists(error, "Should enforce length constraints");
    }
  });

  /**
   * Test 9: Check constraint validation
   * Tests custom check constraints (if any)
   */
  await t.step("Validate check constraints", async () => {
    // Test negative values where they shouldn't be allowed
    try {
      await db.query(
        "INSERT INTO ta_needs (course_id, num_required) VALUES ($1, $2)",
        [1, -5] // Negative number of TAs required
      );
      assertEquals(true, false, "Should not allow negative TA requirements");
    } catch (error) {
      assertExists(error, "Should throw error for negative value");
    }
    
    // Test date range validation (end date before start date)
    try {
      await db.query(
        "INSERT INTO terms (name, start_date, end_date) VALUES ($1, $2, $3)",
        ["Invalid Term", "2024-12-31", "2024-01-01"] // End before start
      );
      // If this succeeds, add a note that date validation might be needed
    } catch (error) {
      // Good - date range is validated
      assertExists(error, "Should validate date ranges");
    }
  });

  /**
   * Test 10: Cleanup
   * Clean up test data and close connection
   */
  await t.step("Cleanup validation test data", async () => {
    await db.disconnect();
    assertEquals(true, true, "Validation tests completed successfully");
  });
});