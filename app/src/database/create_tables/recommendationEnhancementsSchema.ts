import { Database } from "../config.ts";

/**
 * Create skill_categories table (MUST be created before user_skills)
 */
export async function createSkillCategoriesTable(db: Database): Promise<void> {
  try {
    // Create the table directly without using createTableIfNotExists
    await db.query(`
      CREATE TABLE IF NOT EXISTS skill_categories (
        skill_id SERIAL PRIMARY KEY,
        skill_name VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created skill_categories table");
  
    // Insert default skill categories
    const insertDefaultSkills = `
      INSERT INTO skill_categories (skill_name, category) VALUES
      ('Python', 'programming'),
      ('Java', 'programming'),
      ('JavaScript', 'programming'),
      ('C++', 'programming'),
      ('C', 'programming'),
      ('TypeScript', 'programming'),
      ('React', 'framework'),
      ('Node.js', 'framework'),
      ('Django', 'framework'),
      ('Spring', 'framework'),
      ('Git', 'tools'),
      ('Docker', 'tools'),
      ('SQL', 'database'),
      ('MongoDB', 'database'),
      ('PostgreSQL', 'database'),
      ('Data Structures', 'technical'),
      ('Algorithms', 'technical'),
      ('Machine Learning', 'technical'),
      ('Database Design', 'technical'),
      ('System Design', 'technical'),
      ('Teaching', 'soft'),
      ('Communication', 'soft'),
      ('Leadership', 'soft'),
      ('Problem Solving', 'soft'),
      ('Team Collaboration', 'soft')
      ON CONFLICT (skill_name) DO NOTHING
    `;
    
    try {
      await db.query(insertDefaultSkills);
      console.log("✅ Inserted default skill categories");
    } catch (error) {
      console.log("Skill categories already exist or error:", error);
    }
  } catch (error) {
    console.error("Error creating skill_categories table:", error);
    throw error;
  }
}

/**
 * Create user_skills table for tracking student skills
 */
export async function createUserSkillsTable(db: Database): Promise<void> {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_skills (
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        skill_id INTEGER NOT NULL REFERENCES skill_categories(skill_id) ON DELETE CASCADE,
        proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
        years_experience DECIMAL(3,1),
        last_used DATE,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, skill_id)
      )
    `);
    console.log("Created user_skills table");
  
    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
    `);
  } catch (error) {
    console.error("Error creating user_skills table:", error);
    throw error;
  }
}

/**
 * Create course_ta_requirements table for storing course-specific TA requirements
 */
export async function createCourseTARequirementsTable(db: Database): Promise<void> {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS course_ta_requirements (
        requirement_id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        prerequisite_courses TEXT[],
        minimum_grade_percentage INTEGER DEFAULT 60,
        recommended_courses TEXT[],
        recommended_grade_percentage INTEGER DEFAULT 50,
        required_skills TEXT[],
        preferred_skills TEXT[],
        minimum_year_of_study INTEGER DEFAULT 2,
        prefer_previous_ta_experience BOOLEAN DEFAULT FALSE,
        minimum_overall_gpa DECIMAL(3,2) DEFAULT 3.0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id)
      )
    `);
    console.log("Created course_ta_requirements table");
  
    // Create index for course lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_course_requirements_course_id ON course_ta_requirements(course_id);
    `);
  } catch (error) {
    console.error("Error creating course_ta_requirements table:", error);
    throw error;
  }
}

/**
 * Create student_course_completions table for tracking completed courses
 */
export async function createStudentCourseCompletionsTable(db: Database): Promise<void> {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS student_course_completions (
        completion_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        course_code VARCHAR(20) NOT NULL,
        course_title VARCHAR(200),
        grade_percentage INTEGER CHECK (grade_percentage >= 0 AND grade_percentage <= 100),
        credits DECIMAL(3,1),
        term_taken VARCHAR(50),
        year_taken INTEGER,
        grade_letter VARCHAR(3),
        course_level INTEGER,
        is_verified BOOLEAN DEFAULT FALSE,
        source VARCHAR(20) CHECK (source IN ('transcript', 'manual')) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_code, term_taken)
      )
    `);
    console.log("Created student_course_completions table");
  
    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_course_completions_user_id ON student_course_completions(user_id);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_course_completions_course_code ON student_course_completions(course_code);
    `);
  } catch (error) {
    console.error("Error creating student_course_completions table:", error);
    throw error;
  }
}

/**
 * Create ta_performance table for tracking TA performance evaluations
 */
export async function createTAPerformanceTable(db: Database): Promise<void> {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ta_performance (
        performance_id SERIAL PRIMARY KEY,
        allocation_id INTEGER REFERENCES ta_allocations(allocation_id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(course_id) ON DELETE SET NULL,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        term VARCHAR(50) NOT NULL,
        instructor_rating DECIMAL(2,1) CHECK (instructor_rating >= 1 AND instructor_rating <= 5),
        student_feedback_score DECIMAL(3,2) CHECK (student_feedback_score >= 0 AND student_feedback_score <= 5),
        attendance_rate DECIMAL(3,2) CHECK (attendance_rate >= 0 AND attendance_rate <= 1),
        tasks_completed INTEGER DEFAULT 0,
        tasks_assigned INTEGER DEFAULT 0,
        strengths TEXT,
        areas_for_improvement TEXT,
        would_rehire BOOLEAN,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(user_id)
      )
    `);
    console.log("Created ta_performance table");
  
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_ta_performance_user_id ON ta_performance(user_id);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_ta_performance_course_id ON ta_performance(course_id);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_ta_performance_term ON ta_performance(term);
    `);
  } catch (error) {
    console.error("Error creating ta_performance table:", error);
    throw error;
  }
}

/**
 * Create transcript_imports table for tracking bulk transcript uploads
 */
export async function createTranscriptImportsTable(db: Database): Promise<void> {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS transcript_imports (
        import_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        import_status VARCHAR(20) CHECK (import_status IN ('processing', 'completed', 'failed')),
        courses_imported INTEGER DEFAULT 0,
        imported_data JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created transcript_imports table");
    
    // Create index
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_transcript_imports_user_id ON transcript_imports(user_id);
    `);
  } catch (error) {
    console.error("Error creating transcript_imports table:", error);
    throw error;
  }
}
