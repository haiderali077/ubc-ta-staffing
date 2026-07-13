import { Database } from "../config.ts";
import { createTableIfNotExists } from "./schemaHelper.ts";

export const createTAApplicationsTable = async (
  database: Database
): Promise<void> => {
  const schema = `
        application_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'allocated')),
        notes TEXT,
        domain_areas JSONB,
        application_type VARCHAR(20) CHECK (application_type IN ('Undergraduate', 'Graduate', 'PhD', 'UTA', 'GTA')),
        term_availability TEXT
    `;
  await createTableIfNotExists(database, "ta_applications", schema);

  // Auto-migration: Ensure new columns exist for existing tables
  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS domain_areas JSONB
        `);
    console.log("✅ Ensured domain_areas column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ domain_areas column migration not needed:", error);
  }

  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS application_type VARCHAR(20) CHECK (application_type IN ('Undergraduate', 'Graduate', 'PhD', 'UTA', 'GTA'))
        `);
    console.log("✅ Ensured application_type column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ application_type column migration not needed:", error);
  }

  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS term_availability TEXT
        `);
    console.log(
      "✅ Ensured term_availability column exists in ta_applications"
    );
  } catch (error) {
    console.log("ℹ️ term_availability column migration not needed:", error);
  }

  // Additional migrations for snapshot fields added in recent updates
  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS technical_skills TEXT
        `);
    console.log("✅ Ensured technical_skills column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ technical_skills column migration not needed:", error);
  }

  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS relevant_coursework TEXT
        `);
    console.log("✅ Ensured relevant_coursework column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ relevant_coursework column migration not needed:", error);
  }

  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS overall_gpa NUMERIC
        `);
    console.log("✅ Ensured overall_gpa column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ overall_gpa column migration not needed:", error);
  }

  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS expected_graduation TEXT
        `);
    console.log("✅ Ensured expected_graduation column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ expected_graduation column migration not needed:", error);
  }

  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS weekly_availability TEXT
        `);
    console.log("✅ Ensured weekly_availability column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ weekly_availability column migration not needed:", error);
  }

  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS teaching_experience TEXT
        `);
    console.log("✅ Ensured teaching_experience column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ teaching_experience column migration not needed:", error);
  }

  // Add updated_at column for proper timestamp tracking
  try {
    await database.query(`
            ALTER TABLE ta_applications 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
    console.log("✅ Ensured updated_at column exists in ta_applications");
  } catch (error) {
    console.log("ℹ️ updated_at column migration not needed:", error);
  }

  console.log("Created ta_applications table with enhanced columns");
};

export const createApplicationRankingsTable = async (
  database: Database
): Promise<void> => {
  const schema = `
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES ta_applications(application_id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        rank INTEGER NOT NULL CHECK (rank > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(application_id, course_id),
        UNIQUE(application_id, rank)
    `;
  await createTableIfNotExists(database, "applicationrankings", schema);
  console.log("Created applicationrankings table");
};

export const createTANeedsTable = async (database: Database): Promise<void> => {
  const schema = `
        need_id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        hours_required INTEGER NOT NULL DEFAULT 1 CHECK (hours_required > 0),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
        qualifications TEXT,
        lab_tutorial_skills TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
  await createTableIfNotExists(database, "ta_needs", schema);

  // Auto-migration: Ensure qualifications and lab_tutorial_skills columns exist for existing tables
  try {
    await database.query(`
            ALTER TABLE ta_needs 
            ADD COLUMN IF NOT EXISTS qualifications TEXT
        `);
    console.log("✅ Ensured qualifications column exists in ta_needs");
  } catch (error) {
    console.log("ℹ️ Qualifications column migration not needed");
  }

  try {
    await database.query(`
            ALTER TABLE ta_needs 
            ADD COLUMN IF NOT EXISTS lab_tutorial_skills TEXT
        `);
    console.log("✅ Ensured lab_tutorial_skills column exists in ta_needs");
  } catch (error) {
    console.log("ℹ️ Lab_tutorial_skills column migration not needed");
  }

  console.log("Created ta_needs table");
};

export const createTAAllocationsTable = async (
  database: Database
): Promise<void> => {
  const schema = `
        allocation_id SERIAL PRIMARY KEY,
        lab_section_id INTEGER NOT NULL REFERENCES lab_sections(lab_section_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        allocated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        notes TEXT,
        is_marker BOOLEAN DEFAULT FALSE,
        UNIQUE(lab_section_id, user_id)
    `;
  await createTableIfNotExists(database, "ta_allocations", schema);

  // Auto-migration: Ensure is_marker column exists for existing tables
  try {
    await database.query(`
            ALTER TABLE ta_allocations 
            ADD COLUMN IF NOT EXISTS is_marker BOOLEAN DEFAULT FALSE
        `);
    console.log("✅ Ensured is_marker column exists in ta_allocations");
  } catch (error) {
    console.log("ℹ️ is_marker column migration not needed:", error);
  }

  console.log("Created ta_allocations table");
};

// NEW: Create domain areas table with data
export const createDomainAreasTable = async (
  database: Database
): Promise<void> => {
  const schema = `
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
  await createTableIfNotExists(database, "domain_areas", schema);
  console.log("Created domain_areas table");

  // Insert default domain areas
  try {
    const insertQuery = `
        INSERT INTO domain_areas (name, description) VALUES
        ('Web Development', 'Frontend and backend web technologies'),
        ('Algorithms & Data Structures', 'Computational algorithms and data organization'),
        ('Database Systems', 'Database design, SQL, and data management'),
        ('Machine Learning', 'AI, ML algorithms, and data science'),
        ('Software Engineering', 'Software design principles and development practices'),
        ('Systems Programming', 'Operating systems, networks, and low-level programming'),
        ('Human-Computer Interaction', 'UI/UX design and user experience research'),
        ('Graphics & Visualization', 'Computer graphics, game development, and data visualization'),
        ('Security & Cryptography', 'Information security and cryptographic systems'),
        ('Theory of Computation', 'Computational complexity and theoretical computer science')
        ON CONFLICT (name) DO NOTHING
        `;
    await database.query(insertQuery);
    console.log("Inserted default domain areas data");
  } catch (error) {
    console.log("Domain areas data already exists or error inserting:", error);
  }
};
