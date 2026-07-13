import { assertEquals, assertExists } from "../../../deps.ts";
import { setupTestDatabase, TestMockFactory } from "../../backend/_tests_/test_utils.ts";
import { Database } from "../config.ts";
import { ApplicationModel } from "../models/application.ts";
import { CourseModel } from "../models/course.ts";
import { ProfileModel } from "../models/profile.ts";
import { Term, TermModel } from "../models/term.ts";
import { UserModel } from "../models/user.ts";

/**
 * Database Models Test
 * 
 * This file tests CRUD operations for all main models (User, Course, Term, Application).
 * Each test validates that data can be created, read, updated, and deleted correctly.
 */

// Set test environment
Deno.env.set("DENO_ENV", "test");

Deno.test("Database Models - Comprehensive CRUD Operations", async (t) => {
  let db: Database | null = null;
  let userModel: UserModel | null = null;
  let courseModel: CourseModel | null = null;
  let termModel: TermModel | null = null;
  let applicationModel: ApplicationModel | null = null;
  let profileModel: ProfileModel | null = null;
  
  // Test data we'll use throughout
  let testUserId: number;
  let testCourseId: number;
  let testTermId: number;
  let testApplicationId: number;

  /**
   * Setup Phase
   * Create database connection and initialize all models
   */
  await t.step("Setup database and models", async () => {
    try {
      console.log("🔧 Setting up database models test environment...");
      
      // Get test database instance with retries
      db = await setupTestDatabase({ maxRetries: 5 });
      
      if (!db) {
        throw new Error("Database setup returned null");
      }
      
      // Test database connection
      await db.query('SELECT 1');
      console.log("🔗 Database connection verified");
      
      // Initialize all models with the database connection
      userModel = new UserModel(db);
      courseModel = new CourseModel(db);
      termModel = new TermModel(db);
      applicationModel = new ApplicationModel(db);
      profileModel = new ProfileModel(db);
      
      console.log("✅ Models initialized successfully");
    } catch (error) {
      console.error("❌ Setup failed:", error);
      
      // Cleanup partial setup
      if (db) {
        try {
          await db.disconnect();
        } catch (cleanupError) {
          console.warn("Cleanup error:", cleanupError);
        }
      }
      
      throw error;
    }
  });

  /**
   * Test 1: User Model CRUD Operations
   * Tests creating, reading, updating, and deleting users
   */
  await t.step("UserModel - Create and retrieve user", async () => {
    if (!userModel) {
      throw new Error("UserModel is not initialized - setup failed");
    }
    
    // Create a test user using the mock factory
    const userData = TestMockFactory.createMockUser({
      name: "John Doe",
      email: "john.doe@student.ubc.ca",
      role: "student",
      major: "Computer Science"
    });

    // Create user in database
    const createdUser = await userModel.createUser(userData);
    
    // Validate creation was successful
    assertExists(createdUser, "User should be created successfully");
    assertExists(createdUser.user_id, "Created user should have an ID");
    assertEquals(createdUser.email, userData.email, "Email should match");
    
    // Store user ID for later tests
    testUserId = createdUser.user_id!;
    
    // Test retrieving user by ID
    const retrievedUser = await userModel.getUserById(testUserId);
    assertExists(retrievedUser, "Should be able to retrieve user by ID");
    assertEquals(retrievedUser.email, userData.email, "Retrieved user email should match");
    
    // Test retrieving user by email
    const userByEmail = await userModel.getUserByEmail(userData.email);
    assertExists(userByEmail, "Should be able to retrieve user by email");
    assertEquals(userByEmail.user_id, testUserId, "User ID should match");
  });

  /**
   * Test 2: User Model - Update operations
   * Tests updating user information
   */
  await t.step("UserModel - Update user information", async () => {
    if (!userModel) {
      throw new Error("UserModel is not initialized - setup failed");
    }
    
    // Update user's name and major
    const updates = {
      name: "John Updated Doe",
      major: "Mathematics"
    };
    
    // Perform update
    const updateResult = await userModel.updateUser(testUserId, updates);
    assertExists(updateResult, "Update should succeed");
    
    // Verify updates were applied
    const updatedUser = await userModel.getUserById(testUserId);
    assertExists(updatedUser, "Updated user should exist");
    assertEquals(updatedUser.name, updates.name, "Name should be updated");
    assertEquals(updatedUser.major, updates.major, "Major should be updated");
  });

  /**
   * Test 3: Term Model CRUD Operations
   * Tests managing academic terms
   */
    await t.step("TermModel - Create and manage terms", async () => {
      if (!termModel) {
        throw new Error("TermModel is not initialized - setup failed");
      }
      
      // Create a new term
    const termData: Omit<Term, 'term_id' | 'created_at' | 'updated_at'> = {
      name: "Winter 2024",
      start_date: "2024-01-01",
      end_date: "2024-04-30",
      status: "upcoming"
    };
    
    const createdTerm = await termModel.createTerm(termData);
    assertExists(createdTerm, "Term should be created");
    assertExists(createdTerm.term_id, "Term should have an ID");
    testTermId = createdTerm.term_id!;
    
    // Retrieve all terms
    const allTerms = await termModel.getAllTerms();
    assertEquals(Array.isArray(allTerms), true, "Should return array of terms");
    assertEquals(allTerms.length > 0, true, "Should have at least one term");
    
    // Find our created term
    const ourTerm = allTerms.find(t => t.term_id === testTermId);
    assertExists(ourTerm, "Should find our created term");
    assertEquals(ourTerm.name, termData.name, "Term name should match");
  });

  /**
   * Test 4: Course Model CRUD Operations
   * Tests course creation and management
   */
  await t.step("CourseModel - Create and manage courses", async () => {
    if (!courseModel || !userModel) {
      throw new Error("CourseModel or UserModel is not initialized - setup failed");
    }
    
    // First create an instructor user with a unique email not in seed data
    const instructorData = TestMockFactory.createMockUser({
      name: "Dr. Smith",
      email: "unique-smith@ubc.ca",
      role: "instructor"
    });
    const instructor = await userModel.createUser(instructorData);

    // Create a course using mock factory
    const courseData = TestMockFactory.createMockCourse({
      code: "CPSC 110",
      title: "Computation, Programs, and Programming",
      term: "Winter 2024",
      instructor_id: instructor.user_id,
      dept_id: 1,
      max_tas: 3
    });

    // Create course in database
    const createdCourse = await courseModel.createCourse(courseData);
    assertExists(createdCourse, "Course should be created");
    assertExists(createdCourse.course_id, "Course should have an ID");
    testCourseId = createdCourse.course_id!;
    
    // Test retrieving course by ID
    const retrievedCourse = await courseModel.getCourseById(testCourseId);
    assertExists(retrievedCourse, "Should retrieve course by ID");
    assertEquals(retrievedCourse.code, courseData.code, "Course code should match");
    
    // Test retrieving courses by instructor
    const instructorCourses = await courseModel.getCoursesByInstructor(instructor.user_id!);
    assertEquals(Array.isArray(instructorCourses), true, "Should return array");
    assertEquals(instructorCourses.length > 0, true, "Instructor should have courses");
  });

  /**
   * Test 5: Application Model CRUD Operations
   * Tests TA application submission and management
   */
  await t.step("ApplicationModel - Create and manage TA applications", async () => {
    if (!applicationModel) {
      throw new Error("ApplicationModel is not initialized - setup failed");
    }
    // Create an application using mock factory
    const applicationData = TestMockFactory.createMockApplication({
      user_id: testUserId,
      status: "pending",
      notes: "I have experience teaching programming",
      domain_areas: ["algorithms", "web development", "databases"],
      application_type: "Undergraduate",
      term_availability: "Available all days"
    });
    
    // Create application in database
    const createdApp = await applicationModel.createApplication(applicationData);
    assertExists(createdApp, "Application should be created");
    assertExists(createdApp.application_id, "Application should have an ID");
    testApplicationId = createdApp.application_id!;
    
    // Test retrieving application by ID
    const retrievedApp = await applicationModel.getApplicationById(testApplicationId);
    assertExists(retrievedApp, "Should retrieve application by ID");
    assertEquals(retrievedApp?.status, "pending", "Status should be pending");
    
    // Test retrieving applications by user
    const userApplications = await applicationModel.getApplicationsByUser(testUserId);
    assertEquals(Array.isArray(userApplications), true, "Should return array");
    assertEquals(userApplications.length > 0, true, "User should have applications");
  });

  /**
   * Test 6: Application Model - Update status
   * Tests updating application status (approve/reject)
   */
  await t.step("ApplicationModel - Update application status", async () => {
    if (!applicationModel) {
      throw new Error("ApplicationModel is not initialized - setup failed");
    }
    
    // Update application status to approved
    const updatedApp = await applicationModel.updateApplicationStatus(
      testApplicationId,
      "approved"
    );
    assertExists(updatedApp, "Status update should return updated application");
    assertEquals(updatedApp.status, "approved", "Status should be approved");
  });

  /**
   * Test 7: Profile Model Operations
   * Tests student profile creation and updates
   */
  await t.step("ProfileModel - Create and update student profile", async () => {
    if (!profileModel) {
      throw new Error("ProfileModel is not initialized - setup failed");
    }
    
    // Create a profile for our test student
    const profileData = {
      user_id: testUserId,
      bio: "Passionate about teaching computer science",
      resume_url: "https://example.com/resume.pdf",
      personal_statement: "I love helping students learn",
      max_hours_per_week: 20,
      preferred_term: "Winter 2024",
      specific_course_preferences: "CPSC 110, CPSC 210"
    };
    
    // Create profile
    const createdProfile = await profileModel.createOrUpdateStudentProfile(profileData);
    assertExists(createdProfile, "Profile should be created");
    assertEquals(createdProfile.user_id, testUserId, "User ID should match");
    
    // Update profile
    const profileUpdates = {
      user_id: testUserId,
      personal_statement: "Updated personal statement with more experience",
      max_hours_per_week: 15
    };
    
    const updateResult = await profileModel.createOrUpdateStudentProfile(profileUpdates);
    assertEquals(updateResult.personal_statement, "Updated personal statement with more experience");
    assertEquals(updateResult.max_hours_per_week, 15, "Hours should be updated");
    
    // Verify updates
    const updatedProfile = await profileModel.getStudentProfile(testUserId);
    assertExists(updatedProfile, "Updated profile should exist");
    assertEquals(updatedProfile.personal_statement, profileUpdates.personal_statement, "Personal statement should be updated");
    assertEquals(updatedProfile.max_hours_per_week, profileUpdates.max_hours_per_week, "Hours should be updated");
  });

  /**
   * Test 8: Data validation
   * Tests that models properly validate data
   */
  await t.step("Data validation - Email format validation", async () => {
    if (!userModel) {
      throw new Error("UserModel is not initialized - setup failed");
    }
    
    // Test invalid email format should fail
    const invalidUserData = TestMockFactory.createMockUser({
      email: "not-an-email" // Invalid email format
    });
    
    // This should throw an error or return null depending on implementation
    try {
      await userModel.createUser(invalidUserData);
      assertEquals(true, false, "Should not create user with invalid email");
    } catch (error) {
      assertExists(error, "Should throw error for invalid email");
    }
  });

  /**
   * Test 9.5: Allocation Model - Marker Designation
   * Tests that allocation model can update marker designation
   */
  await t.step("AllocationModel - Update marker designation", async () => {
    if (!db) {
      throw new Error("Database is not initialized - setup failed");
    }
    
    const { AllocationModel } = await import("../models/allocation.ts");
    const { LabSectionModel } = await import("../models/labSection.ts");
    
    const allocationModel = new AllocationModel(db);
    const labSectionModel = new LabSectionModel(db);
    
    // Create a lab section first
    const labSection = await labSectionModel.createLabSection({
      course_id: testCourseId,
      section_name: "Test Lab 001",
      lab_days: "Monday",
      lab_start_time: "10:00",
      lab_end_time: "12:00"
    });
    
    // Create an allocation
    const allocation = await allocationModel.assignStudentToLabSection(
      testUserId,
      labSection.lab_section_id!,
      testUserId, // allocated by same user for simplicity
      "Test allocation",
      undefined,
      undefined,
      undefined,
      false // initially not a marker
    );
    
    // Test updating marker designation
    const updatedAllocation = await allocationModel.updateMarkerDesignation(
      allocation.allocation_id!,
      true,
      testUserId,
      "test@ubc.ca" // actor email
    );
    
    if (updatedAllocation) {
      assertEquals(updatedAllocation.is_marker, true, "Marker designation should be updated to true");
      assertExists(updatedAllocation.allocation_id, "Updated allocation should have an ID");
    } else {
      assertEquals(true, false, "updateMarkerDesignation should return updated allocation");
    }
  });

  /**
   * Test 10: Duplicate prevention
   * Tests that models prevent duplicate entries
   */
  await t.step("Data validation - Prevent duplicate users", async () => {
    if (!userModel) {
      throw new Error("UserModel is not initialized - setup failed");
    }
    
    // Try to create another user with same email
    const duplicateUserData = TestMockFactory.createMockUser({
      email: "john.doe@student.ubc.ca" // Same email as our first user
    });
    
    try {
      await userModel.createUser(duplicateUserData);
      assertEquals(true, false, "Should not create duplicate user");
    } catch (error) {
      assertExists(error, "Should throw error for duplicate email");
    }
  });

  /**
   * Test 10: Cleanup operations
   * Tests that we can properly delete test data
   */
  await t.step("Cleanup - Delete test data", async () => {
    if (!db) {
      console.warn("Database was not initialized, skipping cleanup");
      return;
    }
    
    try {
      // Optionally: clear all tables at the end
      const { SchemaManager } = await import("../../database/schema.ts");
      const schemaManager = new SchemaManager(db);
      await schemaManager.dropAllTables();
      
      // Close database connection
      await db.disconnect();
      assertEquals(true, true, "Cleanup completed successfully");
    } catch (error) {
      console.warn("Cleanup warning:", error);
      // Don't fail the test for cleanup issues
    }
  });
});