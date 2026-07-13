import { z } from "../../deps.ts";
import { Database } from "./config.ts";
// Imports from BOTH branches have been combined
import {
  createApplicationRankingsTable,
  createDomainAreasTable,
  createTAAllocationsTable,
  createTAApplicationsTable,
  createTANeedsTable,
} from "./create_tables/applicationSchema.ts";
import { createPasswordResetTokensTable, createRefreshTokensTable } from "./create_tables/authSchema.ts"; // From development branch
import {
  createCourseTemplatesTable,
  createCoursesTable,
} from "./create_tables/courseSchema.ts";
import { createDepartmentsTable } from "./create_tables/departmentSchema.ts";
import { createLabSectionsTable } from "./create_tables/labSectionSchema.ts";
import {
  addPasswordResetOtpTableComment,
  createPasswordResetOtpTable
} from './create_tables/passwordResetOtpSchema.ts';
import {
  createReferencesTable,
  createStudentProfilesTable,
} from "./create_tables/profileSchema.ts";
import { createSystemSettingsTable } from "./create_tables/systemSettingsSchema.ts";

import {
  createNotificationsTable,
  createUserNotificationPreferencesTable,
  migrateNotificationSchema,
} from "../database/create_tables/notificationSchema.ts";

import { createAuditLogsTable, createSystemUsageMetricsTable } from "./create_tables/auditLogSchema.ts";
import { createTermsTable } from "./create_tables/termSchema.ts";
import {
  createUserProfilesTable,
  createUsersTable,
  migrateUsersTable,
} from "./create_tables/userSchema.ts";

// RESOLVED: Archive imports from your feature branch
import { createArchiveSchema, migrateExistingTerms } from "./create_tables/archiveSchema.ts";


import {
  createAvailabilityConflictView,
  createGTAExamAvailabilityTable
} from "./create_tables/examAvailabilitySchema.ts";

// NEW: Recommendation Enhancement imports
import {
  createCourseTARequirementsTable,
  createSkillCategoriesTable,
  createStudentCourseCompletionsTable,
  createTAPerformanceTable,
  createTranscriptImportsTable,
  createUserSkillsTable
} from "./create_tables/recommendationEnhancementsSchema.ts";

// Helper to get environment variable safely
function getEnvVar(key: string): string | undefined {
  try {
    // @ts-ignore: Deno may not be available in all environments
    if (
      typeof Deno !== "undefined" &&
      Deno.env &&
      typeof Deno.env.get === "function"
    ) {
      // @ts-ignore
      return Deno.env.get(key);
    }
  } catch {}
  return undefined;
}

export class SchemaManager {
  private db: Database;
  private isTestEnv: boolean;

  constructor(database: Database) {
    this.db = database;
    this.isTestEnv = Deno.env.get("DENO_ENV") === "test";
  }

  private log(message: string, forceLog = false): void {
    if (!this.isTestEnv || forceLog) {
      console.log(message);
    }
  }

  async createAllTables(): Promise<void> {
    try {
      this.log("Creating database schema...");

      // Combined list of tables to create from BOTH branches
      await createDepartmentsTable(this.db);
      await createTermsTable(this.db);
      await createUsersTable(this.db);
      await migrateUsersTable(this.db);
      await createUserProfilesTable(this.db);
      await createCourseTemplatesTable(this.db);
      await createCoursesTable(this.db);
      await createLabSectionsTable(this.db);
      await createTAApplicationsTable(this.db);
      await createApplicationRankingsTable(this.db);
      await createTANeedsTable(this.db);
      await createTAAllocationsTable(this.db);
      await createStudentProfilesTable(this.db);
      await createReferencesTable(this.db);
      await createRefreshTokensTable(this.db);
      await createPasswordResetTokensTable(this.db);
      await createDomainAreasTable(this.db);
      await createAuditLogsTable(this.db);
      await createSystemUsageMetricsTable(this.db);
      await createSystemSettingsTable(this.db);
      await createNotificationsTable(this.db);
      await createUserNotificationPreferencesTable(this.db);
      await createPasswordResetOtpTable(this.db);
      await addPasswordResetOtpTableComment(this.db);
      await createArchiveSchema(this.db);
      await migrateExistingTerms(this.db);
      await migrateNotificationSchema(this.db); // ADD THIS LINE

      
      // NEW: GTA Exam Availability tables from development branch
      await createGTAExamAvailabilityTable(this.db);
      await createAvailabilityConflictView(this.db);
      
      // NEW: Recommendation Enhancement tables
      // IMPORTANT: Create skill_categories BEFORE user_skills
      await createSkillCategoriesTable(this.db);
      await createCourseTARequirementsTable(this.db);
      await createStudentCourseCompletionsTable(this.db);
      await createUserSkillsTable(this.db);
      await createTAPerformanceTable(this.db);
      await createTranscriptImportsTable(this.db);

      console.log("Database schema created successfully");
      this.log("Database schema created successfully", true); // Force this to always log

      // Auto-seed required test data in development (but not in test environment)
      const isTestEnv = getEnvVar("DENO_ENV") === "test" || 
                        getEnvVar("NODE_ENV") === "test" || 
                        getEnvVar("ENVIRONMENT") === "test";
      
      if (getEnvVar("ENVIRONMENT") === "development" && !isTestEnv) {
        await this.seedRequiredTestData();
      }
    } catch (error) {
      console.error("Error creating database schema:", error);
      throw error;
    }
  }
  
  // FIXED: Now includes instructor_id links with proper user creation
  async seedRequiredTestData(): Promise<void> {
    try {
      console.log("🌱 Seeding required test data...");

      // Import required dependencies
      const { hashPassword } = await import("../../deps.ts");

      // Step 1: Ensure departments exist first (required for courses)
      await this.db.query(`
        INSERT INTO departments (dept_id, name) VALUES
        (1, 'Computer Science'),
        (2, 'Mathematics'),
        (3, 'Engineering')
        ON CONFLICT (dept_id) DO NOTHING
      `);

      // Step 2: Ensure terms exist (required for courses)
      await this.db.query(`
        INSERT INTO terms (term_id, name, start_date, end_date, status) VALUES
        (1, 'Fall 2024', '2024-09-01', '2024-12-31', 'active'),
        (2, 'Spring 2025', '2025-01-01', '2025-04-30', 'upcoming')
        ON CONFLICT (term_id) DO NOTHING
      `);

      // Step 3: Create test users
      const adminPasswordHash = await hashPassword("admin123");
      const taCoordPasswordHash = await hashPassword("tacoord123");
      const studentPasswordHash = await hashPassword("student123");
      const instructorPasswordHash = await hashPassword("instructor123");

      await this.db.query(`
        INSERT INTO users (name, email, password_hash, role, major, is_active) VALUES
        ('Admin User', 'admin@example.com', $1, 'admin', NULL, true),
        ('TA Coordinator', 'tacoord@example.com', $2, 'ta_coordinator', NULL, true),
        ('Student User', 'student@example.com', $3, 'student', 'Computer Science', true),
        ('Instructor User', 'instructor@example.com', $4, 'instructor', NULL, true)
        ON CONFLICT (email) DO NOTHING
      `, [adminPasswordHash, taCoordPasswordHash, studentPasswordHash, instructorPasswordHash]);

      // Step 4: Now seed courses with proper instructor_id links
      await this.db.query(`
        INSERT INTO courses (course_id, code, title, term, dept_id, instructor_id, max_tas) VALUES
        (1, 'CPSC 110', 'Computation, Programs, and Programming', 'Fall 2024', 1, 2, 3),
        (2, 'CPSC 210', 'Software Construction', 'Fall 2024', 1, 2, 5),
        (3, 'CPSC 221', 'Basic Algorithms and Data Structures', 'Spring 2025', 1, 2, 4),
        (4, 'MATH 101', 'Integral Calculus', 'Fall 2024', 2, 2, 2),
        (5, 'MATH 200', 'Calculus III', 'Spring 2025', 2, 2, 2)
        ON CONFLICT (course_id) DO NOTHING
      `);

      console.log("✅ Required test data seeded successfully with instructor links");
    } catch (error) {
      console.log("⚠️ Test data seeding error (may be expected if data exists):", error);
    }
  }

  async dropAllTables(): Promise<void> {
    // Combined list of tables to drop from BOTH branches
    const tables = [
      "gta_exam_availability",  // NEW: Add to drop list
      "user_skills",            // NEW: Recommendation enhancement tables
      "ta_performance",         // NEW: Recommendation enhancement tables
      "transcript_imports",     // NEW: Recommendation enhancement tables
      "student_course_completions", // NEW: Added
      "course_ta_requirements",     // NEW: Added
      "skill_categories",           // NEW: Added (drop last due to dependencies)
      "system_usage_metrics",
      "audit_logs",
      "lab_sections",
      "ta_allocations",
      "ta_needs",
      "application_rankings",
      "ta_applications",
      ' "professor_references" ',
      "student_profiles",
      "courses",
      "course_templates",
      "user_profiles",
      "refresh_tokens", // From development branch
      "password_reset_tokens",
      "users",
      "terms",
      "departments",
      "domain_areas", // Added domain_areas
      "system_settings",
      "notifications",
      "user_notification_preferences",
      // RESOLVED: Add archive tables to drop list
      "archived_data_summary",
      "archive_logs"
    ];

    for (const table of tables) {
      await this.db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`Dropped ${table} table`);
    }
    
    // Drop views separately
    await this.db.query(`DROP VIEW IF EXISTS gta_availability_conflicts CASCADE`);
    await this.db.query(`DROP VIEW IF EXISTS archived_terms_view CASCADE`); // RESOLVED: Add archive view
    console.log("Dropped views");
  }

  // FIXED: Updated seedSampleData with proper instructor assignments
  async seedSampleData(): Promise<void> {
    try {
      console.log("Seeding sample data...");

      // Insert departments
      await this.db.query(`
        INSERT INTO departments (name) VALUES
        ('Computer Science'),
        ('Mathematics'),
        ('Engineering')
        ON CONFLICT (name) DO NOTHING
      `);

      // Insert sample terms
      await this.db.query(`
        INSERT INTO terms (name, start_date, end_date, status) VALUES
        ('Fall 2024', '2024-09-01', '2024-12-31', 'upcoming'),
        ('Winter 2025', '2025-01-01', '2025-04-30', 'upcoming'),
        ('Summer 2025', '2025-05-01', '2025-08-31', 'upcoming')
        ON CONFLICT (name) DO NOTHING
      `);

      // Insert sample users (with TA Coordinator)
      await this.db.query(`
        INSERT INTO users (name, email, password_hash, role, student_number, major) VALUES 
        ('Admin User', 'admin@ubc.ca', '$2b$10$hashedpassword1', 'admin', NULL, 'Computer Science'),
        ('TA Coordinator', 'tacoord@ubc.ca', '$2b$10$hashedpassword2', 'ta_coordinator', NULL, 'Computer Science'),
        ('Dr. Smith', 'smith@ubc.ca', '$2b$10$hashedpassword3', 'instructor', NULL, 'Computer Science'),
        ('Dr. Johnson', 'johnson@ubc.ca', '$2b$10$hashedpassword4', 'instructor', NULL, 'Mathematics'),
        ('Alice Student', 'alice@student.ubc.ca', '$2b$10$hashedpassword5', 'student', '12345678', 'Computer Science'),
        ('Bob Student', 'bob@student.ubc.ca', '$2b$10$hashedpassword6', 'student', '87654321', 'Computer Science'),
        ('Carol Student', 'carol@student.ubc.ca', '$2b$10$hashedpassword7', 'student', '11223344', 'Mathematics')
        ON CONFLICT (email) DO NOTHING
      `);

      // Insert course templates - using code as conflict target (has UNIQUE constraint)
      await this.db.query(`
        INSERT INTO course_templates (code, title, description, dept_id) VALUES
        ('CPSC 110', 'Computation, Programs, and Programming', 'Standard undergraduate course requiring 2 TAs', 1),
        ('CPSC 210', 'Software Construction', 'Large lecture course requiring 4 TAs', 1),
        ('CPSC 221', 'Basic Algorithms and Data Structures', 'Lab-intensive course requiring 3 TAs', 1),
        ('MATH 101', 'Integral Calculus', 'Standard math course', 2)
        ON CONFLICT (code) DO NOTHING
      `);

      // FIXED: Insert sample courses with proper instructor assignments
      // Dr. Smith (user_id = 3) gets CPSC courses, Dr. Johnson (user_id = 4) gets MATH courses
      await this.db.query(`
        INSERT INTO courses (course_id, code, title, term, instructor_id, dept_id, template_id, max_tas) VALUES
        (1, 'CPSC 110', 'Computation, Programs, and Programming', 'Fall 2024', 3, 1, 1, 3),
        (2, 'CPSC 210', 'Software Construction', 'Fall 2024', 3, 1, 2, 5),
        (3, 'CPSC 221', 'Basic Algorithms and Data Structures', 'Spring 2025', 3, 1, 3, 4),
        (4, 'MATH 101', 'Integral Calculus', 'Fall 2024', 4, 2, 4, 2),
        (5, 'MATH 200', 'Calculus III', 'Spring 2025', 4, 2, 4, 2)
        ON CONFLICT (course_id) DO NOTHING
      `);

      // Insert sample student profiles - using user_id as conflict target (has UNIQUE constraint)
      await this.db.query(`
        INSERT INTO student_profiles (user_id, personal_statement, max_hours_per_week, preferred_term, specific_course_preferences, additional_notes) VALUES
        (5, 'I am passionate about computer science and enjoy helping others learn.', 15, 'Fall 2024', 'CPSC 110, CPSC 210', 'Available on weekdays and evenings'),
        (6, 'I have experience in software development and want to share my knowledge.', 10, 'Fall 2024', 'CPSC 210, CPSC 221', 'Prefer afternoon sessions'),
        (7, 'I excel in mathematics and have been tutoring for 2 years.', 12, 'Spring 2025', 'MATH 101, MATH 200', 'Available on weekends')
        ON CONFLICT (user_id) DO NOTHING
      `);

      // Insert sample references - using (user_id, reference_email) as conflict target
      await this.db.query(`
        INSERT INTO professor_references (user_id, reference_name, reference_email) VALUES
        (5, 'Professor Smith', 'smith@ubc.ca'),
        (5, 'Dr. Anderson', 'anderson@ubc.ca'),
        (6, 'Dr. Johnson', 'johnson@ubc.ca'),
        (7, 'Professor Martinez', 'martinez@ubc.ca')
        ON CONFLICT (user_id, reference_email) DO NOTHING
      `);

      // NEW: Insert sample skills and user skills for recommendation testing
      await this.db.query(`
        INSERT INTO skill_categories (skill_name, category) VALUES
        ('Python', 'programming'),
        ('Java', 'programming'),
        ('JavaScript', 'programming'),
        ('Data Structures', 'technical'),
        ('Algorithms', 'technical'),
        ('Teaching', 'soft'),
        ('Communication', 'soft')
        ON CONFLICT (skill_name) DO NOTHING
      `);

      // Add skills for sample students
      await this.db.query(`
        INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_experience) 
        SELECT 5, skill_id, 4, 2 FROM skill_categories WHERE skill_name IN ('Python', 'Java', 'Teaching')
        ON CONFLICT (user_id, skill_id) DO NOTHING
      `);

      await this.db.query(`
        INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_experience) 
        SELECT 6, skill_id, 5, 3 FROM skill_categories WHERE skill_name IN ('JavaScript', 'Data Structures', 'Communication')
        ON CONFLICT (user_id, skill_id) DO NOTHING
      `);

      // NEW: Insert sample course completions for students
      await this.db.query(`
        INSERT INTO student_course_completions (user_id, course_code, course_title, grade_percentage, credits, term_taken, year_taken, is_verified, source) VALUES
        (5, 'CPSC 110', 'Computation, Programs, and Programming', 85, 4, 'Fall', 2022, true, 'transcript'),
        (5, 'CPSC 210', 'Software Construction', 88, 4, 'Spring', 2023, true, 'transcript'),
        (6, 'CPSC 110', 'Computation, Programs, and Programming', 92, 4, 'Fall', 2021, true, 'transcript'),
        (6, 'CPSC 210', 'Software Construction', 95, 4, 'Spring', 2022, true, 'transcript'),
        (6, 'CPSC 221', 'Basic Algorithms and Data Structures', 90, 4, 'Fall', 2022, true, 'transcript'),
        (7, 'MATH 100', 'Differential Calculus', 94, 3, 'Fall', 2022, true, 'transcript'),
        (7, 'MATH 101', 'Integral Calculus', 91, 3, 'Spring', 2023, true, 'transcript')
        ON CONFLICT (user_id, course_code, term_taken) DO NOTHING
      `);

      console.log("Sample data seeded successfully with proper instructor assignments and recommendation enhancements");
    } catch (error) {
      console.error("Error seeding sample data:", error);
      throw error;
    }
  }

  // FIXED: Updated seedTestData with proper instructor links
  async seedTestData(): Promise<void> {
    try {
      console.log("Seeding test data...");

      // Import required dependencies
      const { hashPassword } = await import("../../deps.ts");

      // Insert departments
      await this.db.query(`
        INSERT INTO departments (name) VALUES
        ('Computer Science'),
        ('Mathematics'),
        ('Engineering')
        ON CONFLICT (name) DO NOTHING
      `);

      // Insert sample terms
      await this.db.query(`
        INSERT INTO terms (name, start_date, end_date, status) VALUES
        ('Fall 2024', '2024-09-01', '2024-12-31', 'upcoming'),
        ('Winter 2025', '2025-01-01', '2025-04-30', 'upcoming'),
        ('Summer 2025', '2025-05-01', '2025-08-31', 'upcoming')
        ON CONFLICT (name) DO NOTHING
      `);

      // Hash passwords for test users
      const adminPasswordHash = await hashPassword("admin123");
      const taCoordPasswordHash = await hashPassword("tacoord123"); 
      const smithPasswordHash = await hashPassword("instructor123");
      const johnsonPasswordHash = await hashPassword("instructor456");
      const janePasswordHash = await hashPassword("student123");
      const johnPasswordHash = await hashPassword("student456");

      // Insert test users with properly hashed passwords
      await this.db.query(`
        INSERT INTO users (name, email, password_hash, role, student_number, major) VALUES 
        ('Admin User', 'admin@ubc.ca', $1, 'admin', NULL, 'Computer Science'),
        ('TA Coordinator', 'tacoord@ubc.ca', $2, 'ta_coordinator', NULL, 'Computer Science'),
        ('Dr. Smith', 'smith@ubc.ca', $3, 'instructor', NULL, 'Computer Science'),
        ('Dr. Johnson', 'johnson@ubc.ca', $4, 'instructor', NULL, 'Mathematics'),
        ('Jane Doe', 'jane.doe@student.ubc.ca', $5, 'student', '12345678', 'Computer Science'),
        ('John Smith', 'john.smith@student.ubc.ca', $6, 'student', '87654321', 'Computer Science')
        ON CONFLICT (email) DO NOTHING
      `, [
        adminPasswordHash,
        taCoordPasswordHash,
        smithPasswordHash,
        johnsonPasswordHash,
        janePasswordHash,
        johnPasswordHash
      ]);

      // FIXED: Insert sample courses with instructor_id links
      await this.db.query(`
        INSERT INTO courses (code, title, dept_id, term, instructor_id) VALUES
        ('CPSC 110', 'Computation, Programs, and Programming', 1, 1, 3),
        ('CPSC 210', 'Software Construction', 1, 1, 3),
        ('MATH 100', 'Differential Calculus', 2, 1, 4)
        ON CONFLICT (code, term) DO NOTHING
      `);

      // NEW: Insert test skills categories
      await this.db.query(`
        INSERT INTO skill_categories (skill_name, category) VALUES
        ('Python', 'programming'),
        ('Java', 'programming'),
        ('C++', 'programming'),
        ('Teaching', 'soft'),
        ('Communication', 'soft')
        ON CONFLICT (skill_name) DO NOTHING
      `);

      // NEW: Add sample course completions for test students
      await this.db.query(`
        INSERT INTO student_course_completions (user_id, course_code, grade_percentage, term_taken, year_taken, is_verified) 
        SELECT user_id, 'CPSC 110', 85, 'Fall', 2023, true 
        FROM users WHERE email = 'jane.doe@student.ubc.ca'
        ON CONFLICT (user_id, course_code, term_taken) DO NOTHING
      `);

      await this.db.query(`
        INSERT INTO student_course_completions (user_id, course_code, grade_percentage, term_taken, year_taken, is_verified) 
        SELECT user_id, 'CPSC 210', 90, 'Spring', 2024, true 
        FROM users WHERE email = 'john.smith@student.ubc.ca'
        ON CONFLICT (user_id, course_code, term_taken) DO NOTHING
      `);

      console.log("Test data seeded successfully with instructor links and recommendation enhancements");
      console.log("Test users:");
      console.log("   Admin: admin@ubc.ca / admin123");
      console.log("   TA Coordinator: tacoord@ubc.ca / tacoord123");
      console.log("   Instructor 1: smith@ubc.ca / instructor123");
      console.log("   Instructor 2: johnson@ubc.ca / instructor456");
      console.log("   Student 1: jane.doe@student.ubc.ca / student123");
      console.log("   Student 2: john.smith@student.ubc.ca / student456");
    } catch (error) {
      console.error("Error seeding test data:", error);
      throw error;
    }
  }
}

export const userRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['student', 'instructor', 'admin', 'ta_coordinator']),
  student_number: z.string().optional(),
  major: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long")
});

export const courseSchema = z.object({
  code: z.string().regex(/^[A-Z]{2,4}\s\d{3}$/),
  title: z.string().min(5).max(100),
  term: z.string().min(5),
  instructor_id: z.number().int().positive()

});
