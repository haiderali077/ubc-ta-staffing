import { Database } from "../config.ts";

export async function createSystemSettingsTable(db: Database): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_id SERIAL PRIMARY KEY,
      key VARCHAR(255) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL DEFAULT 'text',
      category VARCHAR(100) NOT NULL DEFAULT 'general',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for faster lookups
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_system_settings_key 
    ON system_settings(key)
  `);

  // Create index for category-based queries
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_system_settings_category 
    ON system_settings(category)
  `);

  // Insert default system settings
  await db.query(`
    INSERT INTO system_settings (key, value, description, type, category) VALUES
    ('ta_application_deadline', '2025-07-07', 'Deadline for students to submit TA applications', 'date', 'application_deadlines'),
    ('instructor_request_deadline', '2025-06-15', 'Deadline for instructors to submit TA requests', 'date', 'application_deadlines'),
    ('session_timeout_minutes', '30', 'User session timeout in minutes', 'number', 'security')
    ON CONFLICT (key) DO NOTHING
  `);

  console.log("System settings table created successfully");
} 