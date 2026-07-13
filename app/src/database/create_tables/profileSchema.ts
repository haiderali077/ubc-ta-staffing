import { Database } from "../config.ts";
import { createTableIfNotExists } from "./schemaHelper.ts";

export const createStudentProfilesTable = async (
  database: Database
): Promise<void> => {
  const schema = `
        profile_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        overall_gpa DECIMAL(3,2) CHECK (overall_gpa >= 0 AND overall_gpa <= 4.33),
        year_of_study INTEGER,
        expected_graduation DATE,
        application_type VARCHAR(20) DEFAULT 'Undergraduate' CHECK (application_type IN ('Undergraduate', 'Graduate', 'PhD')),
        personal_statement TEXT,
        weekly_availability TEXT,
        max_hours_per_week INTEGER,
        preferred_term VARCHAR(50),
        preferred_course_types JSONB,
        specific_course_preferences TEXT,
        additional_notes TEXT,
        relevant_coursework TEXT,
        teaching_experience TEXT,
        technical_skills TEXT,
        transcript_url VARCHAR(500),
        is_submitted BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
  await createTableIfNotExists(database, "student_profiles", schema);
  console.log("Created student_profiles table");
};

export const createReferencesTable = async (
  database: Database
): Promise<void> => {
  const schema = `
        reference_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        reference_name VARCHAR(255) NOT NULL,
        reference_email VARCHAR(255) NOT NULL,
        reference_letter_url VARCHAR(500),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, reference_email)
    `;
  await createTableIfNotExists(database, "professor_references", schema);
  console.log("Created professor_references table");
};
