// app/src/database/create_tables/notificationSchema.ts
import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createNotificationsTable = async (database: Database): Promise<void> => {
  const schema = `
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
      'application_submitted',
      'application_updated',
      'application_accepted', 
      'application_rejected',
      'deadline_reminder',
      'interview_scheduled',
      'document_required',
      'allocation_confirmed',
      'ta_request_update',
      'allocation_finalized',
      'course_assignment_update'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    read_at TIMESTAMP,
    related_application_id INTEGER REFERENCES ta_applications(application_id) ON DELETE SET NULL,
    related_course_id INTEGER REFERENCES courses(course_id) ON DELETE SET NULL,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    scheduled_for TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `;
  await createTableIfNotExists(database, 'notifications', schema);
  console.log("Created notifications table");
};

export const createUserNotificationPreferencesTable = async (database: Database): Promise<void> => {
  const schema = `
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    deadline_reminders BOOLEAN DEFAULT TRUE,
    application_updates BOOLEAN DEFAULT TRUE,
    allocation_updates BOOLEAN DEFAULT TRUE,
    ta_request_updates BOOLEAN DEFAULT TRUE,
    reminder_days_before INTEGER DEFAULT 3 CHECK (reminder_days_before >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `;
  await createTableIfNotExists(database, 'user_notification_preferences', schema);
  console.log("Created user notification preferences table");
};

// Optional: Add migration function to update existing tables
export const migrateNotificationSchema = async (database: Database): Promise<void> => {
  try {
    // Update the type constraint to include new notification types
    await database.query(`
      ALTER TABLE notifications 
      DROP CONSTRAINT IF EXISTS notifications_type_check,
      ADD CONSTRAINT notifications_type_check 
      CHECK (type IN (
        'application_submitted',
        'application_updated',
        'application_accepted', 
        'application_rejected',
        'deadline_reminder',
        'interview_scheduled',
        'document_required',
        'allocation_confirmed',
        'ta_request_update',
        'allocation_finalized',
        'course_assignment_update'
      ))
    `);
    console.log("✅ Updated notification type constraints");
  } catch (error) {
    console.log("ℹ️ Notification type constraint update not needed:", error.message);
  }

  try {
    // Add new preference column if it doesn't exist
    await database.query(`
      ALTER TABLE user_notification_preferences 
      ADD COLUMN IF NOT EXISTS ta_request_updates BOOLEAN DEFAULT TRUE
    `);
    console.log("✅ Added ta_request_updates column");
  } catch (error) {
    console.log("ℹ️ ta_request_updates column already exists:", error.message);
  }
};
