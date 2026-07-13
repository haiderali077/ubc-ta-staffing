import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createCourseCompletionTables = async (database: Database): Promise<void> => {
  // Student course completions table
  const completionSchema = `
    completion_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_code VARCHAR(20) NOT NULL,
    course_title VARCHAR(255),
    grade_percentage INTEGER NOT NULL CHECK (grade_percentage >= 0 AND grade_percentage <= 100),
    credits DECIMAL(3,1),
    term_taken VARCHAR(50),
    year_taken INTEGER,
    grade_letter VARCHAR(5),
    course_level INTEGER DEFAULT 100, -- 100, 200, 300, 400 for course difficulty level
    is_verified BOOLEAN DEFAULT FALSE,
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('transcript', 'manual')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_code, term_taken)
  `;
  await createTableIfNotExists(database, 'student_course_completions', completionSchema);

  // Course TA requirements table
  const requirementsSchema = `
    requirement_id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    prerequisite_courses TEXT[],
    minimum_grade_percentage INTEGER DEFAULT 70,
    recommended_courses TEXT[],
    recommended_grade_percentage INTEGER DEFAULT 60,
    required_skills TEXT[],
    preferred_skills TEXT[],
    minimum_year_of_study INTEGER DEFAULT 2,
    prefer_previous_ta_experience BOOLEAN DEFAULT FALSE,
    minimum_overall_gpa DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `;
  await createTableIfNotExists(database, 'course_ta_requirements', requirementsSchema);

  // Skills categories table
  const skillsSchema = `
    skill_id SERIAL PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `;
  await createTableIfNotExists(database, 'skill_categories', skillsSchema);

  // Create indexes for performance
  try {
    await database.query(`CREATE INDEX IF NOT EXISTS idx_course_completions_user_course ON student_course_completions(user_id, course_code)`);
    await database.query(`CREATE INDEX IF NOT EXISTS idx_course_completions_grade ON student_course_completions(grade_percentage)`);
    await database.query(`CREATE INDEX IF NOT EXISTS idx_course_completions_year ON student_course_completions(year_taken)`);
    console.log("✅ Created indexes for course completion tables");
  } catch (error) {
    console.log("⚠️ Index creation failed (may already exist):", error);
  }

  // Insert common CS skills
  try {
    await database.query(`
      INSERT INTO skill_categories (skill_name, category, description) VALUES
      ('Python', 'programming', 'Python programming language'),
      ('JavaScript', 'programming', 'JavaScript programming language'),
      ('Java', 'programming', 'Java programming language'),
      ('C++', 'programming', 'C++ programming language'),
      ('C', 'programming', 'C programming language'),
      ('React', 'frameworks', 'React JavaScript library'),
      ('Node.js', 'frameworks', 'Node.js runtime environment'),
      ('Machine Learning', 'concepts', 'Machine learning concepts and algorithms'),
      ('Data Structures', 'concepts', 'Data structures and algorithms'),
      ('Web Development', 'concepts', 'Web development concepts'),
      ('Database Design', 'concepts', 'Database design and SQL'),
      ('Git', 'tools', 'Version control with Git'),
      ('Linux', 'tools', 'Linux operating system'),
      ('AWS', 'tools', 'Amazon Web Services cloud platform'),
      ('Algorithms', 'concepts', 'Algorithm design and analysis'),
      ('Software Engineering', 'concepts', 'Software engineering principles'),
      ('Computer Graphics', 'concepts', 'Computer graphics and visualization'),
      ('Networks', 'concepts', 'Computer networks and protocols'),
      ('Security', 'concepts', 'Computer security and cryptography'),
      ('AI', 'concepts', 'Artificial intelligence')
      ON CONFLICT (skill_name) DO NOTHING
    `);
    console.log(" Inserted common CS skills");
  } catch (error) {
    console.log(" Skills insertion failed (may already exist):", error);
  }

  console.log("Created course completion and recommendation tables");
};