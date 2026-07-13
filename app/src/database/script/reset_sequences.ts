#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Script to reset all database sequences to prevent duplicate key violations
 * 
 * Usage: deno run --allow-net --allow-env reset_sequences.ts
 */

import { Database } from '../config.ts';

async function resetSequences(db: Database): Promise<void> {
  try {
    console.log("🔄 Resetting database sequences...");

    // Reset all sequences to the current maximum ID + 1
    const sequences = [
      { table: 'departments', id_column: 'dept_id', sequence: 'departments_dept_id_seq' },
      { table: 'terms', id_column: 'term_id', sequence: 'terms_term_id_seq' },
      { table: 'users', id_column: 'user_id', sequence: 'users_user_id_seq' },
      { table: 'user_profiles', id_column: 'profile_id', sequence: 'user_profiles_profile_id_seq' },
      { table: 'course_templates', id_column: 'template_id', sequence: 'course_templates_template_id_seq' },
      { table: 'courses', id_column: 'course_id', sequence: 'courses_course_id_seq' },
      { table: 'lab_sections', id_column: 'lab_section_id', sequence: 'lab_sections_lab_section_id_seq' },
      { table: 'ta_applications', id_column: 'application_id', sequence: 'ta_applications_application_id_seq' },
      { table: 'applicationrankings', id_column: 'id', sequence: 'applicationrankings_id_seq' },
      { table: 'ta_needs', id_column: 'need_id', sequence: 'ta_needs_need_id_seq' },
      { table: 'ta_allocations', id_column: 'allocation_id', sequence: 'ta_allocations_allocation_id_seq' },
      { table: 'student_profiles', id_column: 'profile_id', sequence: 'student_profiles_profile_id_seq' },
      { table: 'professor_references', id_column: 'reference_id', sequence: 'professor_references_reference_id_seq' },
      { table: 'domain_areas', id_column: 'id', sequence: 'domain_areas_id_seq' },
      { table: 'notifications', id_column: 'notification_id', sequence: 'notifications_notification_id_seq' },
      { table: 'system_settings', id_column: 'setting_id', sequence: 'system_settings_setting_id_seq' }
    ];

    for (const { table, id_column, sequence } of sequences) {
      try {
        // Get the current maximum ID from the table
        const maxIdResult = await db.query(
          `SELECT COALESCE(MAX(${id_column}), 0) as max_id FROM ${table}`
        );
        const maxId = Number(maxIdResult.rows[0].max_id);

        // Reset the sequence to start from max_id + 1
        if (maxId > 0) {
          await db.query(`SELECT setval('${sequence}', ${maxId}, true)`);
          console.log(`  ✅ Reset ${sequence} to ${maxId}`);
        } else {
          console.log(`  ⚠️  Table ${table} is empty, skipping sequence reset`);
        }
      } catch (error) {
        // Ignore errors for tables/sequences that don't exist
        console.log(`  ⚠️  Could not reset ${sequence}: ${error.message}`);
      }
    }

    console.log("✅ Database sequences reset successfully");
  } catch (error: unknown) {
    console.error("Error resetting sequences:", error);
    throw new Error(String(error));
  }
}

async function main() {
  const config = {
    hostname: (globalThis as any).Deno?.env?.get("DB_HOST") || "localhost",
    port: parseInt((globalThis as any).Deno?.env?.get("DB_PORT") || "5432"),
    user: (globalThis as any).Deno?.env?.get("DB_USER") || "allocaid_user",
    password: (globalThis as any).Deno?.env?.get("DB_PASSWORD") || "password",
    database: (globalThis as any).Deno?.env?.get("DB_NAME") || "allocaid_db"
  };

  console.log(`Connecting to database: ${config.hostname}:${config.port}/${config.database}`);
  
  const db = new Database(config);
  
  try {
    await db.connect();
    console.log("✅ Connected to database");
    
    await resetSequences(db);
    
  } catch (error) {
    console.error("❌ Error:", error);
    if ((globalThis as any).Deno) {
      (globalThis as any).Deno.exit(1);
    }
  } finally {
    await db.disconnect();
    console.log("✅ Database connection closed");
  }
}

if (import.meta.main) {
  main();
} 