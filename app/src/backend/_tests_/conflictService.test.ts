/**
 * Comprehensive tests for ConflictService
 * UR 2.7: Must be able to view conflicts when scheduling students
 */

import { assertEquals, assertRejects } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { Database } from "../../database/config.ts";
import { ConflictService, ConflictType, ConflictSeverity, AssignmentRequest } from "../services/conflictService.ts";
import { setupTestDatabase } from "./test_utils.ts";

// Set test environment
Deno.env.set("DENO_ENV", "test");

// Test database setup
let database: Database;
let conflictService: ConflictService;

// Test data IDs (will be populated during setup)
let testUserId: number;
let testLabSectionId: number;
let testCourseId: number;
let testExistingAssignmentId: number;

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  // Use shared test database setup
  console.log("🔧 Setting up ConflictService test environment...");
  database = await setupTestDatabase({ maxRetries: 5 });
  
  if (!database) {
    throw new Error("Database setup returned null");
  }
  
  conflictService = new ConflictService(database);

  // Clean up any existing test data
  await cleanupTestData();

  // Create test data
  await createTestData();
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  try {
    // Clean up in reverse dependency order
    await database.query("DELETE FROM ta_allocations WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE '%test%')");
    await database.query("DELETE FROM student_profiles WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE '%test%')");
    await database.query("DELETE FROM lab_sections WHERE course_id IN (SELECT course_id FROM courses WHERE code LIKE '%TEST%')");
    await database.query("DELETE FROM courses WHERE code LIKE '%TEST%'");
    await database.query("DELETE FROM users WHERE email LIKE '%test%'");
    await database.query("DELETE FROM departments WHERE name LIKE '%Test%'");
  } catch (error) {
    console.log("Cleanup note:", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Create test data
 */
async function createTestData() {
  // Create test department (departments table only has name column)
  const deptResult = await database.query(`
    INSERT INTO departments (name)
    VALUES ('Test Computer Science')
    RETURNING dept_id
  `);
  const deptId = deptResult.rows[0].dept_id;

  // Create test user
  const userResult = await database.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Test Student', 'test.student@test.com', 'hash', 'student')
    RETURNING user_id
  `);
  testUserId = userResult.rows[0].user_id as number;

  // Create student profile with availability
  await database.query(`
    INSERT INTO student_profiles (
      user_id, 
      weekly_availability, 
      max_hours_per_week,
      preferred_course_types,
      specific_course_preferences
    )
    VALUES ($1, $2, $3, $4, $5)
  `, [
    testUserId,
    JSON.stringify({
      "monday": ["09:00-12:00", "14:00-17:00"],
      "tuesday": ["10:00-15:00"],
      "wednesday": ["09:00-12:00", "14:00-17:00"],
      "thursday": ["10:00-15:00"],
      "friday": ["09:00-12:00"]
    }),
    20,
    JSON.stringify({}),
    ""
  ]);

  // Create test course
  const courseResult = await database.query(`
    INSERT INTO courses (
      code, 
      title, 
      term, 
      dept_id,
      max_tas,
      course_days,
      course_time
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING course_id
  `, [
    'TEST_COSC_101',
    'Test Computer Science Course',
    'Fall 2025',
    deptId,
    5,
    'MWF',
    '10:00-12:00'
  ]);
  testCourseId = courseResult.rows[0].course_id as number;

  // Create test lab section
  const labResult = await database.query(`
    INSERT INTO lab_sections (
      course_id,
      section_name,
      lab_days,
      lab_start_time,
      lab_end_time
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING lab_section_id
  `, [
    testCourseId,
    'L01',
    'MWF',
    '10:00',
    '12:00'
  ]);
  testLabSectionId = labResult.rows[0].lab_section_id as number;

  // Create conflicting lab section
  const conflictingLabResult = await database.query(`
    INSERT INTO lab_sections (
      course_id,
      section_name,
      lab_days,
      lab_start_time,
      lab_end_time
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING lab_section_id
  `, [
    testCourseId,
    'L02',
    'MW',
    '11:00',
    '13:00'
  ]);

  // Create existing assignment for conflict testing
  const assignmentResult = await database.query(`
    INSERT INTO ta_allocations (
      user_id,
      lab_section_id,
      allocated_by,
      status
    )
    VALUES ($1, $2, $3, $4)
    RETURNING allocation_id
  `, [
    testUserId,
    conflictingLabResult.rows[0].lab_section_id as number,
    testUserId,
    'active'
  ]);
  testExistingAssignmentId = assignmentResult.rows[0].allocation_id as number;
}

/**
 * Test suite for ConflictService
 */
Deno.test({
  name: "ConflictService - Setup and Teardown",
  async fn() {
    await setupTestEnvironment();
    console.log("✅ Test environment setup complete");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - No Conflicts Scenario",
  async fn() {
    // Create a separate course to avoid duplicate assignment conflicts
    const noConflictsCourseResult = await database.query(`
      INSERT INTO courses (
        code, 
        title, 
        term, 
        dept_id,
        max_tas,
        course_days,
        course_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING course_id
    `, [
      'TEST_NO_CONFLICTS_101',
      'Test No Conflicts Course',
      'Fall 2025',
      1, // Using department ID 1
      5, // Normal capacity
      'TR',
      '12:00-14:00'
    ]);
    const noConflictsCourseId = noConflictsCourseResult.rows[0].course_id as number;

    // Create a non-conflicting lab section
    const nonConflictingLabResult = await database.query(`
      INSERT INTO lab_sections (
        course_id,
        section_name,
        lab_days,
        lab_start_time,
        lab_end_time
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING lab_section_id
    `, [
      noConflictsCourseId,
      'L03',
      'TR',
      '12:00',
      '14:00'
    ]);

    const assignmentRequest: AssignmentRequest = {
      userId: testUserId,
      labSectionId: nonConflictingLabResult.rows[0].lab_section_id as number
    };

    const result = await conflictService.checkAssignmentConflicts(assignmentRequest);

    // Debug: Log the conflicts to understand what's being detected
    if (result.hasConflicts) {
      console.log("DEBUG: Conflicts detected:", JSON.stringify(result.conflicts, null, 2));
      console.log("DEBUG: Summary:", JSON.stringify(result.summary, null, 2));
    }

    assertEquals(result.hasConflicts, false, "Should have no conflicts");
    assertEquals(result.conflicts.length, 0, "Should have no conflict details");
    assertEquals(result.summary.totalConflicts, 0, "Summary should show no conflicts");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Time Conflict Detection",
  async fn() {
    const assignmentRequest: AssignmentRequest = {
      userId: testUserId,
      labSectionId: testLabSectionId // This conflicts with existing assignment
    };

    const result = await conflictService.checkAssignmentConflicts(assignmentRequest);

    assertEquals(result.hasConflicts, true, "Should detect conflicts");
    
    const timeConflicts = result.conflicts.filter(c => c.type === ConflictType.TIME_CONFLICT);
    assertEquals(timeConflicts.length > 0, true, "Should detect time conflicts");
    assertEquals(timeConflicts[0].severity, ConflictSeverity.CRITICAL, "Time conflicts should be critical");
    assertEquals(timeConflicts[0].canOverride, false, "Time conflicts should not be overridable");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Availability Conflict Detection",
  async fn() {
    // Create lab section outside student availability
    const unavailableLabResult = await database.query(`
      INSERT INTO lab_sections (
        course_id,
        section_name,
        lab_days,
        lab_start_time,
        lab_end_time
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING lab_section_id
    `, [
      testCourseId,
      'L04',
      'S',  // Saturday - student not available
      '10:00',
      '12:00'
    ]);

    const assignmentRequest: AssignmentRequest = {
      userId: testUserId,
      labSectionId: unavailableLabResult.rows[0].lab_section_id as number
    };

    const result = await conflictService.checkAssignmentConflicts(assignmentRequest);

    assertEquals(result.hasConflicts, true, "Should detect availability conflicts");
    
    const availabilityConflicts = result.conflicts.filter(c => c.type === ConflictType.AVAILABILITY_CONFLICT);
    assertEquals(availabilityConflicts.length > 0, true, "Should detect availability conflicts");
    assertEquals(availabilityConflicts[0].canOverride, true, "Availability conflicts should be overridable");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Hours Constraint Detection",
  async fn() {
    // Update student profile to have very low hour limit
    await database.query(`
      UPDATE student_profiles 
      SET max_hours_per_week = 3
      WHERE user_id = $1
    `, [testUserId]);

    // Create lab section that would exceed hours
    const highHoursLabResult = await database.query(`
      INSERT INTO lab_sections (
        course_id,
        section_name,
        lab_days,
        lab_start_time,
        lab_end_time
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING lab_section_id
    `, [
      testCourseId,
      'L05',
      'TR',
      '09:00',
      '12:00'  // 3 hours per session, 2 days = 6 hours total
    ]);

    const assignmentRequest: AssignmentRequest = {
      userId: testUserId,
      labSectionId: highHoursLabResult.rows[0].lab_section_id as number
    };

    const result = await conflictService.checkAssignmentConflicts(assignmentRequest);

    assertEquals(result.hasConflicts, true, "Should detect hours conflicts");
    
    const hoursConflicts = result.conflicts.filter(c => c.type === ConflictType.HOURS_CONFLICT);
    assertEquals(hoursConflicts.length > 0, true, "Should detect hours conflicts");

    // Reset hour limit for other tests
    await database.query(`
      UPDATE student_profiles 
      SET max_hours_per_week = 20
      WHERE user_id = $1
    `, [testUserId]);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Course Capacity Detection",
  async fn() {
    // Create course with max_tas = 1 for capacity testing
    const capacityTestCourseResult = await database.query(`
      INSERT INTO courses (
        code, 
        title, 
        term, 
        dept_id,
        max_tas,
        course_days,
        course_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING course_id
    `, [
      'TEST_CAPACITY_101',
      'Test Capacity Course',
      'Fall 2025',
      1, // Using department ID 1
      1, // max_tas = 1 for testing capacity limits
      'TR',
      '14:00-15:00'
    ]);
    const capacityTestCourseId = capacityTestCourseResult.rows[0].course_id as number;

    // Create lab section with very low capacity
    const lowCapacityLabResult = await database.query(`
      INSERT INTO lab_sections (
        course_id,
        section_name,
        lab_days,
        lab_start_time,
        lab_end_time
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING lab_section_id
    `, [
      capacityTestCourseId,
      'L06',
      'TR',
      '14:00',
      '15:00'
    ]);

    // Add existing assignment to fill capacity
    await database.query(`
      INSERT INTO ta_allocations (
        user_id,
        lab_section_id,
        allocated_by,
        status
      )
      VALUES ($1, $2, $3, $4)
    `, [
      testUserId,
      lowCapacityLabResult.rows[0].lab_section_id as number,
      testUserId,
      'active'
    ]);

    // Create second user for capacity test
    const userResult2 = await database.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Test Student 2', 'test.student2@test.com', 'hash', 'student')
      RETURNING user_id
    `);
    const testUserId2 = userResult2.rows[0].user_id as number;

    const assignmentRequest: AssignmentRequest = {
      userId: testUserId2,
      labSectionId: lowCapacityLabResult.rows[0].lab_section_id as number
    };

    const result = await conflictService.checkAssignmentConflicts(assignmentRequest);

    assertEquals(result.hasConflicts, true, "Should detect capacity conflicts");
    
    const capacityConflicts = result.conflicts.filter(c => c.type === ConflictType.COURSE_CAPACITY);
    assertEquals(capacityConflicts.length > 0, true, "Should detect capacity conflicts");
    assertEquals(capacityConflicts[0].canOverride, true, "Capacity conflicts should be overridable");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Duplicate Assignment Detection",
  async fn() {
    // Try to assign student to same course they're already assigned to
    const assignmentRequest: AssignmentRequest = {
      userId: testUserId,
      labSectionId: testLabSectionId
    };

    const result = await conflictService.checkAssignmentConflicts(assignmentRequest);

    assertEquals(result.hasConflicts, true, "Should detect conflicts");
    
    const duplicateConflicts = result.conflicts.filter(c => c.type === ConflictType.EXISTING_ASSIGNMENT);
    assertEquals(duplicateConflicts.length > 0, true, "Should detect existing assignment conflicts");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Get All Assignment Conflicts",
  async fn() {
    const allConflicts = await conflictService.getAllAssignmentConflicts();

    assertEquals(Array.isArray(allConflicts), true, "Should return array of conflicts");
    assertEquals(allConflicts.length > 0, true, "Should find existing conflicts");
    
    // Verify structure of conflict results
    const firstResult = allConflicts[0];
    assertEquals(typeof firstResult.hasConflicts, 'boolean', "Should have hasConflicts boolean");
    assertEquals(Array.isArray(firstResult.conflicts), true, "Should have conflicts array");
    assertEquals(typeof firstResult.summary, 'object', "Should have summary object");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Error Handling",
  async fn() {
    // Test with invalid user ID
    const invalidAssignmentRequest: AssignmentRequest = {
      userId: -1,
      labSectionId: testLabSectionId
    };

    await assertRejects(
      async () => {
        await conflictService.checkAssignmentConflicts(invalidAssignmentRequest);
      },
      Error,
      "User with ID -1 does not exist"
    );

    // Test with invalid lab section ID
    const invalidLabRequest: AssignmentRequest = {
      userId: testUserId,
      labSectionId: -1
    };

    await assertRejects(
      async () => {
        await conflictService.checkAssignmentConflicts(invalidLabRequest);
      },
      Error,
      "Lab section with ID -1 does not exist"
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Performance Test",
  async fn() {
    const startTime = Date.now();
    
    // Run multiple conflict checks to test performance
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(conflictService.checkAssignmentConflicts({
        userId: testUserId,
        labSectionId: testLabSectionId
      }));
    }
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Performance test: ${duration}ms for 10 conflict checks`);
    assertEquals(duration < 5000, true, "Should complete 10 conflict checks within 5 seconds");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "ConflictService - Cleanup",
  async fn() {
    try {
      await cleanupTestData();
      if (database) {
        await database.disconnect();
      }
      console.log("✅ Test cleanup complete");
    } catch (error) {
      console.warn("⚠️ Cleanup warning:", error);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});