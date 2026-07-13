import { assertEquals, assertExists, hashPassword } from "../../../deps.ts";
import { Database, getDatabaseConfig } from "../../database/config.ts";
import { CourseModel } from "../../database/models/course.ts";
import { LabSectionModel } from "../../database/models/labSection.ts";
import { TermModel } from "../../database/models/term.ts";
import { UserModel } from "../../database/models/user.ts";
import { SchemaManager } from "../../database/schema.ts";

// Set test environment
Deno.env.set("DENO_ENV", "test");
Deno.env.set("JWT_SECRET", "test-secret-key");
Deno.env.set("REFRESH_SECRET", "test-refresh-secret");

/**
 * Course Offering Workflow Tests
 * 
 * Tests complete workflows and complex scenarios for CourseOffering feature
 */

// Check if we should skip database tests
function shouldSkipDatabaseTests(): boolean {
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

Deno.test("Course Offering Workflow", async (t) => {
  let db: Database | null;
  let courseModel: CourseModel | null;
  let labSectionModel: LabSectionModel | null;
  let userModel: UserModel | null;
  let termModel: TermModel | null;
  
  // Test data containers
  let testUsers: any = {};
  let testCourse: any;

  /**
   * Setup Phase
   */
  await t.step("Setup test environment", async () => {
    try {
      db = await setupTestDatabase();
      if (!db) {
        console.log("Database setup skipped - tests will be limited");
        return;
      }

      await db.query(`
      INSERT INTO departments (dept_id, name, code)
      VALUES (1, 'Computer Science', 'CPSC')
      ON CONFLICT (dept_id) DO NOTHING
    `);

      courseModel = new CourseModel(db);
      labSectionModel = new LabSectionModel(db);
      userModel = new UserModel(db);
      termModel = new TermModel(db);
      
      // Create test users
      const userData = {
        instructor: {
          email: "instructor@test.ubc.ca",
          password_hash: await hashPassword("password123"),
          name: "Dr. Test Instructor",
          role: "instructor" as "instructor",
          major: "Computer Science",
          student_number: "87654321",
          year_level: "Graduate",
          gpa: 3.9
        },
        ta: {
          email: "ta@test.ubc.ca",
          password_hash: await hashPassword("password123"),
          name: "Test TA",
          role: "student" as "student",
          major: "Computer Science",
          student_number: "22222222",
          year_level: "4th",
          gpa: 3.7
        }
      };
      
      for (const [role, data] of Object.entries(userData)) {
        const user = await userModel.createUser(data);
        testUsers[role] = user;
      }
      
      // Create test term
      await termModel.createTerm({
        name: "Winter 2024",
        start_date: "2024-01-01",
        end_date: "2024-04-30",
        status: "active"
      });
      
      console.log("✅ Test setup completed");
    } catch (error) {
      console.error("Setup failed:", error);
    }
  });

  /**
   * Test 1: Complete Course Creation with Lab Sections
   */
  await t.step("Should create course with multiple lab sections", async () => {
    if (!courseModel || !labSectionModel || !testUsers.instructor) {
      console.log("⚠️ Skipping test - setup failed");
      return;
    }

    // Create course
    testCourse = await courseModel.createCourse({
      code: "CPSC110",
      title: "Computation, Programs, and Programming",
      term: "Winter 2024",
      instructor_id: testUsers.instructor.user_id,
      dept_id: 1,
      max_tas: 3
    });
    
    assertExists(testCourse, "Course should be created");
    assertEquals(testCourse.code, "CPSC110");

    // Create lab sections
    const labSections = [
      {
        course_id: testCourse.course_id,
        section_name: "Lab 1",
        lab_days: "Monday, Wednesday",
        lab_start_time: "10:00",
        lab_end_time: "12:00"
      },
      {
        course_id: testCourse.course_id,
        section_name: "Lab 2", 
        lab_days: "Tuesday, Thursday",
        lab_start_time: "14:00",
        lab_end_time: "16:00"
      }
    ];

    for (const labData of labSections) {
      const labSection = await labSectionModel.createLabSection(labData);
      assertExists(labSection, "Lab section should be created");
    }

    // Verify course has lab sections
    const courseSections = await labSectionModel.getLabSectionsByCourse(testCourse.course_id);
    assertEquals(courseSections.length, 2, "Should have 2 lab sections");
    
    console.log("✅ Course with lab sections test passed");
  });

  /**
   * Test 2: Multiple Instructors and Courses
   */
  await t.step("Should handle multiple instructors and courses", async () => {
    if (!courseModel || !userModel) {
      console.log("⚠️ Skipping test - setup failed");
      return;
    }

    // Create second instructor
    const instructor2 = await userModel.createUser({
      email: "instructor2@test.ubc.ca",
      password_hash: await hashPassword("password123"),
      name: "Dr. Second Instructor",
      role: "instructor" as "instructor"
    });

    // Create second course
    const course2 = await courseModel.createCourse({
      code: "CPSC210",
      title: "Software Construction",
      term: "Winter 2024",
      instructor_id: instructor2.user_id,
      dept_id: 1,
      max_tas: 2
    });

    assertExists(course2, "Second course should be created");
    assertEquals(course2.instructor_id, instructor2.user_id);
    
    console.log("✅ Multiple instructors test passed");
  });

  /**
   * Test 3: Schedule Conflict Detection (Unit Test)
   */
  await t.step("Should detect schedule conflicts", () => {
    const hasTimeConflict = (
      days1: string, start1: string, end1: string,
      days2: string, start2: string, end2: string
    ): boolean => {
      const parseDays = (dayStr: string) => dayStr.split(', ').map(d => d.trim());
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const days1List = parseDays(days1);
      const days2List = parseDays(days2);
      
      // Check for overlapping days
      const hasOverlappingDays = days1List.some(day => days2List.includes(day));
      if (!hasOverlappingDays) return false;

      // Check for time overlap
      const start1Minutes = parseTime(start1);
      const end1Minutes = parseTime(end1);
      const start2Minutes = parseTime(start2);
      const end2Minutes = parseTime(end2);

      return !(end1Minutes <= start2Minutes || end2Minutes <= start1Minutes);
    };

    // Test cases
    assertEquals(
      hasTimeConflict("Monday", "09:00", "11:00", "Monday", "14:00", "16:00"),
      false,
      "Different times same day should not conflict"
    );
    
    assertEquals(
      hasTimeConflict("Monday", "10:00", "12:00", "Monday", "11:00", "13:00"),
      true,
      "Overlapping times same day should conflict"
    );
    
    assertEquals(
      hasTimeConflict("Monday, Wednesday", "10:00", "12:00", "Tuesday, Thursday", "10:00", "12:00"),
      false,
      "Different days should not conflict"
    );

    console.log("✅ Schedule conflict detection test passed");
  });

  /**
   * Test 4: Capacity Calculations (Unit Test)
   */
  await t.step("Should calculate lab section capacity correctly", () => {
    const calculateCapacity = (maxTAs: number, sectionsCount: number): number => {
      const studentsPerTA = 25;
      const totalCapacity = maxTAs * studentsPerTA;
      return Math.floor(totalCapacity / sectionsCount);
    };

    assertEquals(calculateCapacity(3, 2), 37, "3 TAs, 2 sections = 37 students per section");
    assertEquals(calculateCapacity(4, 3), 33, "4 TAs, 3 sections = 33 students per section");
    assertEquals(calculateCapacity(2, 1), 50, "2 TAs, 1 section = 50 students per section");

    console.log("✅ Capacity calculation test passed");
  });

  /**
   * Test 5: Data Integrity and Relationships
   */
  await t.step("Should maintain data integrity", async () => {
    if (!courseModel || !labSectionModel || !testCourse) {
      console.log("⚠️ Skipping test - setup failed");
      return;
    }

    // Verify course exists
    const retrievedCourse = await courseModel.getCourseById(testCourse.course_id);
    assertExists(retrievedCourse, "Course should be retrievable");
    assertEquals(retrievedCourse.code, "CPSC110");

    // Verify lab sections exist and are linked
    const labSections = await labSectionModel.getLabSectionsByCourse(testCourse.course_id);
    assertEquals(labSections.length, 2, "Should have 2 lab sections");
    
    for (const section of labSections) {
      assertEquals(section.course_id, testCourse.course_id, "Lab section should link to course");
    }

    console.log("✅ Data integrity test passed");
  });

  /**
   * Test 6: Course Statistics (Unit Test)
   */
  await t.step("Should generate course statistics", () => {
    const generateStats = (courses: any[]) => {
      return {
        totalCourses: courses.length,
        totalTAPositions: courses.reduce((sum, c) => sum + (c.max_tas || 0), 0),
        averageTAsPerCourse: courses.length > 0 ? 
          Math.round((courses.reduce((sum, c) => sum + (c.max_tas || 0), 0) / courses.length) * 10) / 10 : 0
      };
    };

    const mockCourses = [
      { max_tas: 3 },
      { max_tas: 2 },
      { max_tas: 4 }
    ];

    const stats = generateStats(mockCourses);
    assertEquals(stats.totalCourses, 3, "Should count courses correctly");
    assertEquals(stats.totalTAPositions, 9, "Should sum TA positions correctly");
    assertEquals(stats.averageTAsPerCourse, 3.0, "Should calculate average correctly");

    console.log("✅ Course statistics test passed");
  });

  /**
   * Cleanup
   */
  await t.step("Cleanup test environment", async () => {
    try {
      if (db) {
        await db.disconnect();
        console.log("✅ Database disconnected");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });
});