// app/src/database/create_tables/examAvailabilitySchema.ts
// ✅ SAFE VERSION: Enforces graduate-only rule in backend, not DB

import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

/**
 * Creates the GTA exam availability table
 * This table stores date ranges when GTAs are available during exam periods
 */
export const createGTAExamAvailabilityTable = async (database: Database): Promise<void> => {
  const schema = `
    availability_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    term_id INTEGER REFERENCES terms(term_id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    is_single_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
  `;
  
  await createTableIfNotExists(database, 'gta_exam_availability', schema);
  console.log("✅ Created gta_exam_availability table");
  
  // Create index for faster queries
  try {
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_gta_availability_user_term 
      ON gta_exam_availability(user_id, term_id)
    `);
    console.log("✅ Created index for GTA exam availability queries");
  } catch (error) {
    console.log("⚠️ Index creation skipped:", (error as Error).message);
  }
};

/**
 * Creates conflict detection view for overlapping availability
 * This view helps identify potential scheduling conflicts
 */
export const createAvailabilityConflictView = async (database: Database): Promise<void> => {
  try {
    await database.query(`
      CREATE OR REPLACE VIEW gta_availability_conflicts AS
      SELECT 
        a1.availability_id AS availability_1,
        a2.availability_id AS availability_2,
        a1.user_id,
        a1.start_date AS start_1,
        a1.end_date AS end_1,
        a2.start_date AS start_2,
        a2.end_date AS end_2,
        a1.term_id
      FROM gta_exam_availability a1
      JOIN gta_exam_availability a2 
        ON a1.user_id = a2.user_id 
        AND a1.availability_id != a2.availability_id
        AND a1.term_id = a2.term_id
      WHERE (
        a1.start_date <= a2.end_date AND a1.end_date >= a2.start_date
      )
    `);
    console.log("✅ Created availability conflict detection view");
  } catch (error) {
    console.log("⚠️ Conflict view creation skipped:", (error as Error).message);
  }
};

