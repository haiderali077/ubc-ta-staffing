/**
 * Database migration script to add conflict detection scheduling fields to courses table
 * UR 2.7: Must be able to view conflicts when scheduling students
 * 
 * Adds the following fields to the courses table:
 * - schedule_days: JSON array of days (e.g., ["Monday", "Wednesday", "Friday"])
 * - start_time: VARCHAR for start time (e.g., "09:00")
 * - end_time: VARCHAR for end time (e.g., "11:00") 
 * - weekly_hours: INTEGER for total weekly hours
 */

import { Database } from '../config.ts';

export async function addCourseSchedulingFields(database: Database): Promise<void> {
  console.log("🔄 Adding conflict detection scheduling fields to courses table...");

  try {
    // Check if columns already exist to avoid duplicate additions
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses' 
      AND column_name IN ('schedule_days', 'start_time', 'end_time', 'weekly_hours')
    `;
    
    const existingColumns = await database.query(checkColumnsQuery);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);

    // Add schedule_days column (JSON array of days)
    if (!existingColumnNames.includes('schedule_days')) {
      await database.query(`
        ALTER TABLE courses 
        ADD COLUMN schedule_days TEXT[]
      `);
      console.log("✅ Added schedule_days column");
    } else {
      console.log("⏭️ schedule_days column already exists");
    }

    // Add start_time column
    if (!existingColumnNames.includes('start_time')) {
      await database.query(`
        ALTER TABLE courses 
        ADD COLUMN start_time VARCHAR(10)
      `);
      console.log("✅ Added start_time column");
    } else {
      console.log("⏭️ start_time column already exists");
    }

    // Add end_time column
    if (!existingColumnNames.includes('end_time')) {
      await database.query(`
        ALTER TABLE courses 
        ADD COLUMN end_time VARCHAR(10)
      `);
      console.log("✅ Added end_time column");
    } else {
      console.log("⏭️ end_time column already exists");
    }

    // Add weekly_hours column
    if (!existingColumnNames.includes('weekly_hours')) {
      await database.query(`
        ALTER TABLE courses 
        ADD COLUMN weekly_hours INTEGER CHECK (weekly_hours >= 0)
      `);
      console.log("✅ Added weekly_hours column");
    } else {
      console.log("⏭️ weekly_hours column already exists");
    }

    // Add helpful comments for the new columns
    await database.query(`
      COMMENT ON COLUMN courses.schedule_days IS 'Array of days when course meets (e.g., {Monday,Wednesday,Friday})';
      COMMENT ON COLUMN courses.start_time IS 'Course start time in HH:MM format (e.g., 09:00)';
      COMMENT ON COLUMN courses.end_time IS 'Course end time in HH:MM format (e.g., 11:00)';
      COMMENT ON COLUMN courses.weekly_hours IS 'Total weekly hours for the course';
    `);

    // Migrate existing data from course_days and course_time to new fields
    console.log("🔄 Migrating existing course schedule data...");
    await migrateExistingScheduleData(database);

    console.log("✅ Successfully added conflict detection scheduling fields to courses table");

  } catch (error) {
    console.error("❌ Error adding scheduling fields:", error);
    throw error;
  }
}

/**
 * Migrate existing course_days and course_time data to new structured fields
 */
async function migrateExistingScheduleData(database: Database): Promise<void> {
  try {
    // Get all courses with existing schedule data
    const coursesQuery = `
      SELECT course_id, course_days, course_time 
      FROM courses 
      WHERE course_days IS NOT NULL OR course_time IS NOT NULL
    `;
    
    const courses = await database.query(coursesQuery);
    
    for (const course of courses.rows) {
      const { course_id, course_days, course_time } = course;
      
      let scheduleDays: string[] = [];
      let startTime: string | null = null;
      let endTime: string | null = null;
      let weeklyHours: number | null = null;

      // Parse course_days if available
      if (course_days) {
        scheduleDays = parseCoursedays(course_days);
      }

      // Parse course_time if available  
      if (course_time) {
        const timeRange = parseCourseTime(course_time);
        startTime = timeRange.start;
        endTime = timeRange.end;
        
        // Calculate weekly hours if we have both time and days
        if (startTime && endTime && scheduleDays.length > 0) {
          weeklyHours = calculateWeeklyHours(startTime, endTime, scheduleDays.length);
        }
      }

      // Update the course with migrated data
      if (scheduleDays.length > 0 || startTime || endTime || weeklyHours) {
        const updateQuery = `
          UPDATE courses 
          SET 
            schedule_days = $2,
            start_time = $3,
            end_time = $4,
            weekly_hours = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE course_id = $1
        `;
        
        await database.query(updateQuery, [
          course_id,
          scheduleDays.length > 0 ? scheduleDays : null,
          startTime,
          endTime,
          weeklyHours
        ]);
        
        console.log(`✅ Migrated schedule data for course ${course_id}`);
      }
    }
    
    console.log(`✅ Migrated schedule data for ${courses.rows.length} courses`);
    
  } catch (error) {
    console.error("Error migrating schedule data:", error);
    // Don't throw error here as the schema changes are more important
  }
}

/**
 * Parse various course_days formats into standardized array
 */
function parseCoursedays(courseDays: string): string[] {
  if (!courseDays) return [];
  
  const dayMappings: Record<string, string> = {
    'M': 'Monday',
    'T': 'Tuesday', 
    'W': 'Wednesday',
    'R': 'Thursday',
    'F': 'Friday',
    'S': 'Saturday',
    'U': 'Sunday',
    'MON': 'Monday',
    'TUE': 'Tuesday',
    'WED': 'Wednesday', 
    'THU': 'Thursday',
    'FRI': 'Friday',
    'SAT': 'Saturday',
    'SUN': 'Sunday'
  };

  const normalized = courseDays.toUpperCase().trim();
  
  // Handle common formats
  if (normalized.includes(',')) {
    // Format: "Monday, Wednesday, Friday" or "MON, WED, FRI"
    return normalized.split(',')
      .map(day => day.trim())
      .map(day => dayMappings[day] || day)
      .filter(Boolean);
  } else if (normalized.includes(' ')) {
    // Format: "Monday Wednesday Friday" or "MON WED FRI"
    return normalized.split(' ')
      .map(day => day.trim())
      .map(day => dayMappings[day] || day)
      .filter(Boolean);
  } else {
    // Format: "MWF" or "TR" (single letters)
    return normalized.split('')
      .map(char => dayMappings[char])
      .filter(Boolean);
  }
}

/**
 * Parse course_time into start and end times
 */
function parseCourseTime(courseTime: string): { start: string | null; end: string | null } {
  if (!courseTime) return { start: null, end: null };
  
  const normalized = courseTime.trim();
  
  // Common time range formats
  const timeRangePatterns = [
    /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/,  // "09:00-11:00"
    /(\d{1,2}):(\d{2})\s*to\s*(\d{1,2}):(\d{2})/i, // "09:00 to 11:00"
    /(\d{1,2})\s*-\s*(\d{1,2})/,                    // "9-11" 
  ];
  
  for (const pattern of timeRangePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      if (match.length === 5) {
        // Full time format with minutes
        const startHour = match[1].padStart(2, '0');
        const startMin = match[2];
        const endHour = match[3].padStart(2, '0');
        const endMin = match[4];
        return {
          start: `${startHour}:${startMin}`,
          end: `${endHour}:${endMin}`
        };
      } else if (match.length === 3) {
        // Hour only format
        const startHour = match[1].padStart(2, '0');
        const endHour = match[2].padStart(2, '0');
        return {
          start: `${startHour}:00`,
          end: `${endHour}:00`
        };
      }
    }
  }
  
  return { start: null, end: null };
}

/**
 * Calculate weekly hours based on daily session duration and number of days
 */
function calculateWeeklyHours(startTime: string, endTime: string, numDays: number): number {
  try {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const sessionHours = (endMinutes - startMinutes) / 60;
    return Math.round(sessionHours * numDays * 100) / 100; // Round to 2 decimal places
  } catch {
    return 0;
  }
}

// Run migration if this file is executed directly
if (import.meta.main) {
  const { initializeDatabase } = await import('../init.ts');
  
  try {
    console.log("🚀 Starting course scheduling fields migration...");
    const database = await initializeDatabase();
    await addCourseSchedulingFields(database);
    console.log("🎉 Migration completed successfully!");
    Deno.exit(0);
  } catch (error) {
    console.error("💥 Migration failed:", error);
    Deno.exit(1);
  }
}