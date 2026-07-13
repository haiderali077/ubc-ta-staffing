import { Database } from '../config.ts';

export const createArchiveSchema = async (database: Database): Promise<void> => {
  try {
    console.log("Creating archive system schema...");

    // 1. Add archive columns to terms table
    await database.query(`
      ALTER TABLE terms 
      ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL
    `);
    console.log("✅ Added archive columns to terms table");

    // 2. Create archive_logs table
    await database.query(`
      CREATE TABLE IF NOT EXISTS archive_logs (
        log_id SERIAL PRIMARY KEY,
        term_id INTEGER NOT NULL REFERENCES terms(term_id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL CHECK (action IN ('ARCHIVED', 'UNARCHIVED')),
        archived_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE SET NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        metadata JSONB -- Store additional context like course count, student count, etc.
      )
    `);
    console.log("✅ Created archive_logs table");

    // 3. Create archived_data_summary table for quick stats
    await database.query(`
      CREATE TABLE IF NOT EXISTS archived_data_summary (
        summary_id SERIAL PRIMARY KEY,
        term_id INTEGER NOT NULL REFERENCES terms(term_id) ON DELETE CASCADE,
        total_courses INTEGER DEFAULT 0,
        total_applications INTEGER DEFAULT 0,
        total_allocations INTEGER DEFAULT 0,
        total_students INTEGER DEFAULT 0,
        total_instructors INTEGER DEFAULT 0,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(term_id)
      )
    `);
    console.log("✅ Created archived_data_summary table");

    // 4. Create indexes for better performance
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_terms_archived ON terms(archived);
      CREATE INDEX IF NOT EXISTS idx_terms_archived_at ON terms(archived_at);
      CREATE INDEX IF NOT EXISTS idx_archive_logs_term ON archive_logs(term_id);
      CREATE INDEX IF NOT EXISTS idx_archive_logs_date ON archive_logs(archived_at);
      CREATE INDEX IF NOT EXISTS idx_archived_summary_term ON archived_data_summary(term_id);
    `);
    console.log("✅ Created archive indexes");

    // 5. Create view for easy archive browsing
    await database.query(`
      CREATE OR REPLACE VIEW archived_terms_view AS
      SELECT 
        t.term_id,
        t.name,
        t.start_date,
        t.end_date,
        t.archived,
        t.archived_at,
        t.archived_by,
        u.name as archived_by_name,
        u.email as archived_by_email,
        ads.total_courses,
        ads.total_applications,
        ads.total_allocations,
        ads.total_students,
        ads.total_instructors
      FROM terms t
      LEFT JOIN users u ON t.archived_by = u.user_id
      LEFT JOIN archived_data_summary ads ON t.term_id = ads.term_id
      WHERE t.archived = TRUE
      ORDER BY t.archived_at DESC
    `);
    console.log("✅ Created archived_terms_view");

    console.log("🎉 Archive system schema created successfully!");

  } catch (error) {
    console.error("❌ Error creating archive schema:", error);
    throw error;
  }
};

// Migration function to update existing terms
export const migrateExistingTerms = async (database: Database): Promise<void> => {
  try {
    console.log("Migrating existing terms...");

    // Set all existing terms to not archived
    await database.query(`
      UPDATE terms 
      SET archived = FALSE 
      WHERE archived IS NULL
    `);

    console.log("✅ Migrated existing terms");
  } catch (error) {
    console.error("❌ Error migrating existing terms:", error);
    throw error;
  }
};
