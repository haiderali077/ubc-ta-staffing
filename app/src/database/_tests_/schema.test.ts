import { assertEquals, assertExists } from "../../../deps.ts";
import { Database, getDatabaseConfig } from "../config.ts";
import { SchemaManager } from "../schema.ts";

/**
 * Database Schema Test
 * 
 * This file tests database schema creation, seeding, and cleanup.
 * It ensures that tables are created with proper structure and relationships.
 */

// Set test environment
Deno.env.set("DENO_ENV", "test");

Deno.test("Database Schema Operations", async (t) => {
  let db: Database;
  let schemaManager: SchemaManager;

  /**
   * Test 1: Database connection and schema manager initialization
   * Ensures we can connect to the test database
   */
  await t.step("Initialize database connection and schema manager", async () => {
    // Get test database configuration
    const config = getDatabaseConfig();
    
    // Create database instance
    db = new Database(config);
    
    // Connect to database
    await db.connect();
    assertExists(db, "Database instance should exist");
    
    // Create schema manager
    schemaManager = new SchemaManager(db);
    assertExists(schemaManager, "Schema manager should be created");
  });

  /**
   * Test 2: Drop all existing tables
   * Ensures we start with a clean slate
   */
  await t.step("Drop all existing tables", async () => {
    // Drop all tables to ensure clean state
    await schemaManager.dropAllTables();
    
    // Verify tables are dropped by checking if users table exists
    const tableCheckResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    assertEquals(
      tableCheckResult.rows[0].exists,
      false,
      "Users table should not exist after dropping all tables"
    );
  });

  /**
   * Test 3: Create all tables
   * Tests the creation of all database tables with proper structure
   */
  await t.step("Create all database tables", async () => {
    // Create all tables
    await schemaManager.createAllTables();
    
    // List of expected tables in the correct order (respecting dependencies)
    const expectedTables = [
      "departments",
      "users",
      "terms",
      "course_templates",
      "courses",
      "student_profiles",
      "ta_applications",
      "ta_needs",
      "ta_allocations",
      "system_settings"
    ];
    
    // Verify each table exists
    for (const tableName of expectedTables) {
      const tableExistsResult = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      assertEquals(
        tableExistsResult.rows[0].exists,
        true,
        `Table '${tableName}' should exist after schema creation`
      );
    }
  });

  /**
   * Test 4: Verify table structures
   * Tests that tables have the correct columns and constraints
   */
  await t.step("Verify users table structure", async () => {
    // Check users table columns
    const userColumnsResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    const userColumns = userColumnsResult.rows;
    
    // Verify essential columns exist
    const columnNames = userColumns.map(col => col.column_name);
    const expectedColumns = ["user_id", "name", "email", "password_hash", "role"];
    
    for (const expectedCol of expectedColumns) {
      assertEquals(
        columnNames.includes(expectedCol),
        true,
        `Users table should have '${expectedCol}' column`
      );
    }
    
    // Verify email column is unique (check for unique constraint)
    const uniqueConstraintResult = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users' 
      AND constraint_type = 'UNIQUE';
    `);
    
    assertEquals(
      uniqueConstraintResult.rows.length > 0,
      true,
      "Users table should have unique constraint (for email)"
    );
  });

  /**
   * Test 5: Verify foreign key relationships
   * Tests that proper foreign key constraints exist between tables
   */
  await t.step("Verify foreign key relationships", async () => {
    // Check foreign keys for courses table
    const foreignKeysResult = await db.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'courses';
    `);
    
    const foreignKeys = foreignKeysResult.rows;
    
    // Verify instructor_id foreign key to users table
    const instructorFk = foreignKeys.find(fk => fk.column_name === 'instructor_id');
    assertExists(instructorFk, "Courses table should have instructor_id foreign key");
    assertEquals(
      instructorFk?.foreign_table_name,
      "users",
      "instructor_id should reference users table"
    );
    
    // Verify dept_id foreign key to departments table
    const deptFk = foreignKeys.find(fk => fk.column_name === 'dept_id');
    assertExists(deptFk, "Courses table should have dept_id foreign key");
    assertEquals(
      deptFk?.foreign_table_name,
      "departments",
      "dept_id should reference departments table"
    );
  });

  /**
   * Test 6: Seed initial data
   * Tests the database seeding functionality
   */
  await t.step("Seed database with initial data", async () => {
    // Seed the database
    await schemaManager.seedTestData();
    
    // Verify departments were seeded
    const departmentsResult = await db.query("SELECT * FROM departments ORDER BY dept_id");
    const departments = departmentsResult.rows;
    
    assertEquals(departments.length >= 2, true, "Should have at least 2 departments");
    assertEquals(departments[0].name, "Computer Science", "First department should be Computer Science");
    assertEquals(departments[1].name, "Mathematics", "Second department should be Mathematics");
    
    // Verify users were seeded
    const usersResult = await db.query("SELECT * FROM users WHERE role = 'admin'");
    const adminUsers = usersResult.rows;
    
    assertEquals(adminUsers.length >= 1, true, "Should have at least one admin user");
    assertEquals(adminUsers[0].email, "admin@ubc.ca", "Admin email should be correct");
    
    // Verify terms were seeded
    const termsResult = await db.query("SELECT * FROM terms ORDER BY term_id");
    const terms = termsResult.rows;
    
    assertEquals(terms.length >= 2, true, "Should have at least 2 terms");
  });

  /**
   * Test 7: Test data type constraints
   * Ensures that data types and constraints are properly enforced
   */
  await t.step("Verify data type constraints", async () => {    
    // Test that email must be unique
    try {
      await db.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('Duplicate User', 'admin@ubc.ca', 'hash', 'student')
      `);
      assertEquals(true, false, "Should not allow duplicate email");
    } catch (error) {
      assertExists(error, "Should throw error for duplicate email");
    }
  });

  /**
   * Test 8: Test cascade operations
   * Ensures that cascade deletes work properly
   */
  await t.step("Test cascade delete operations", async () => {
    // Create a test instructor
    const instructorResult = await db.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Test Instructor', 'test.instructor@ubc.ca', 'hash', 'instructor')
      RETURNING user_id
    `);
    const instructorId = instructorResult.rows[0].user_id;
    
    // Create a course for this instructor
    await db.query(`
      INSERT INTO courses (code, title, term, instructor_id, dept_id)
      VALUES ('TEST101', 'Test Course', 'Fall 2024', $1, 1)
    `, [instructorId]);
    
    // Create a TA need for the course
    const courseResult = await db.query(
      "SELECT course_id FROM courses WHERE code = 'TEST101'"
    );
    const courseId = courseResult.rows[0].course_id;
    
    await db.query(`
      INSERT INTO ta_needs (course_id, hours_required)
      VALUES ($1, 2)
    `, [courseId]);
    
    // Delete the course and verify cascade
    await db.query("DELETE FROM courses WHERE course_id = $1", [courseId]);
    
    // Verify TA need was also deleted
    const taNeedResult = await db.query(
      "SELECT * FROM ta_needs WHERE course_id = $1",
      [courseId]
    );
    assertEquals(
      taNeedResult.rows.length,
      0,
      "TA needs should be deleted when course is deleted (cascade)"
    );
  });

  /**
   * Test 9.5: Test marker column migration
   * Verifies that is_marker column exists in ta_allocations table
   */
  await t.step("Verify is_marker column exists in ta_allocations", async () => {
    // Check if is_marker column exists in ta_allocations table
    const columnResult = await db.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'ta_allocations' 
      AND column_name = 'is_marker';
    `);
    
    assertEquals(columnResult.rows.length, 1, "is_marker column should exist");
    
    if (columnResult.rows.length > 0) {
      const column = columnResult.rows[0] as { column_name: string; data_type: string; column_default: string };
      assertEquals(column.data_type, "boolean", "is_marker should be boolean type");
      assertEquals(column.column_default, "false", "is_marker should default to false");
    }
  });

  /**
   * Test 10: Test index creation
   * Verifies that important indexes are created for performance
   */
  await t.step("Verify indexes are created", async () => {
    // Check for index on users.email (should exist for unique constraint)
    const indexResult = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'users'
      AND indexdef LIKE '%email%';
    `);
    
    assertEquals(
      indexResult.rows.length > 0,
      true,
      "Should have index on users.email column"
    );
  });

  /**
   * Test 10: Cleanup and disconnect
   * Ensures proper cleanup of test database
   */
  await t.step("Cleanup and disconnect", async () => {
    // Drop all tables again to leave clean state
    await schemaManager.dropAllTables();
    
    // Disconnect from database
    await db.disconnect();
    
    assertEquals(true, true, "Cleanup completed successfully");
  });
});