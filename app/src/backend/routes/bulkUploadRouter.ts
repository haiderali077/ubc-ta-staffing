/**
 * Bulk Upload Router
 * 
 * This module handles bulk uploading of course schedules from CSV files.
 * It provides endpoints for:
 * - Uploading and validating CSV files
 * - Previewing parsed data before import
 * - Confirming and processing the import
 * - Downloading CSV templates
 * 
 * The system automatically:
 * - Creates instructors if they don't exist (with default password)
 * - Creates departments if they don't exist
 * - Updates existing courses or creates new ones
 * - Creates lab sections for courses with secondary activities
 */

import { parse } from "https://deno.land/std@0.181.0/csv/mod.ts";
import { Status } from "https://deno.land/x/oak@v12.6.0/mod.ts";
import { Context, hashPassword, Router } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { CourseModel } from "../../database/models/course.ts";
import { LabSectionModel } from "../../database/models/labSection.ts";
import { UserModel } from "../../database/models/user.ts";
import { requireRole } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

// Initialize router and dependencies
const bulkUploadRouter = new Router();

// Database connection and models
// Note: In production, these should be injected as dependencies
const db = new Database();
const authService = new AuthService(db);
const userModel = new UserModel(db);
const courseModel = new CourseModel(db);
const labSectionModel = new LabSectionModel(db);

// Temporary storage for parsed data (in production, use Redis or similar)
const uploadSessionStorage = new Map<string, ParsedCourseData[]>();

// Helper function to clean up old sessions
function cleanupOldSessions() {
  // Clean up sessions older than 1 hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [uploadId, data] of uploadSessionStorage.entries()) {
    // Extract timestamp from UUID (first part)
    const timestamp = parseInt(uploadId.split('-')[0], 16);
    if (timestamp < oneHourAgo) {
      uploadSessionStorage.delete(uploadId);
    }
  }
}

/**
 * Interface representing a raw row from the CSV file
 * Maps directly to the expected CSV column headers
 */
interface CourseScheduleRow {
  Term: string;                           // e.g., "2025W"
  Subject: string;                        // e.g., "BIOL"
  Course: string;                         // e.g., "495"
  "Sec No": string;                       // e.g., "144"
  Activity: string;                       // e.g., "Lecture"
  Creds: string;                         // e.g., "3"
  Size: string;                          // e.g., "141" (enrollment limit)
  Primary: string;                       // e.g., "1"
  "Primary Activity Repeats": string;     // e.g., "3"
  "On campus or Online": string;          // e.g., "Online Learning" or "On campus"
  Days: string;                          // e.g., "Mon Wed Fri"
  "Start Time": string;                   // e.g., "1:00 p.m."
  "End Time": string;                     // e.g., "2:30 p.m."
  "Week patterns": string;                // e.g., "2025-05-13 - 2025-06-27"
  "Secondary Activity": string;           // e.g., "Lab" (if has lab component)
  Faculty: string;                       // Faculty/Department
  Instructor: string;                    // e.g., "Scott Fazackerley"
  Location: string;                      // e.g., "BIO-Annex 1"
}

/**
 * Interface for tracking validation errors
 * Used to generate error reports for users
 */
interface ValidationError {
  row: number;                     // Row number in CSV (for user reference)
  errors: string[];                // Array of error messages
  data?: Partial<CourseScheduleRow>; // Original row data for debugging
}

/**
 * Interface for processed course data
 * This is the cleaned and validated data ready for database insertion
 */
interface ParsedCourseData {
  // Course identification
  term: string;                    // Term name (e.g., "2025W")
  courseCode: string;              // Full course code (e.g., "BIOL 495")
  courseName: string;              // Course title (extracted or generated)
  sectionCode: string;             // Full section code (e.g., "BIOL 495-144")
  sectionName: string;             // Section identifier (e.g., "Section 144")
  
  // Course details
  instructionalFormat: string;     // Type of instruction (Lecture, Lab, etc.)
  deliveryMode: string;            // "Online Learning" or "On campus"
  credits: number;                 // Credit hours (parsed from string)
  enrollmentSize: number;          // Maximum enrollment (parsed from string)
  
  // Schedule information
  days: string;                    // Days of week (e.g., "Mon Wed Fri")
  startTime: string;               // 24-hour format (e.g., "13:00")
  endTime: string;                 // 24-hour format (e.g., "14:30")
  startDate: string;               // Course start date (YYYY-MM-DD)
  endDate: string;                 // Course end date (YYYY-MM-DD)
  location: string;                // Physical location or "Online"
  
  // Instructor and additional info
  instructorName: string;          // Full name of instructor
  hasSecondaryActivity: boolean;   // Whether course has lab/tutorial
  secondaryActivity: string;       // Type of secondary activity
}

/**
 * POST /api/bulk-upload/course-schedule
 * 
 * Endpoint for uploading and validating course schedule CSV files.
 * This endpoint:
 * 1. Accepts CSV file uploads (max 50MB)
 * 2. Validates the file format and content
 * 3. Parses each row and validates required fields
 * 4. Returns preview data and validation errors
 * 5. Stores parsed data in session for confirmation step
 */
bulkUploadRouter.post('/bulk-upload/course-schedule',
  async (ctx: Context, next) => {
    await requireRole(authService, 'admin', 'ta_coordinator')(ctx, next);
  },
  async (ctx: Context) => {
    const startTime = Date.now();
    const user = (ctx.state as any).user;
    console.log(`[BULK_UPLOAD] Upload initiated by ${user.email} at ${new Date().toISOString()}`);
    
    try {
      // Check if request has body
      if (!ctx.request.hasBody) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          success: false, 
          error: "No file uploaded" 
        };
        return;
      }

      // Parse form data - CORRECTED METHOD
      const body = await ctx.request.body({ type: "form-data" });
      const formData = await body.value; // Just await the value directly
      
      console.log('[BULK_UPLOAD] Form data type:', typeof formData);
      
      // Read the form data entries
      let entries;
      if (typeof formData.read === 'function') {
        // For newer Oak versions
        entries = await formData.read({ maxSize: 50_000_000 });
      } else if (formData instanceof FormData) {
        // For FormData API
        const files: any[] = [];
        for (const [name, value] of formData) {
          if (value instanceof File) {
            const content = await value.arrayBuffer();
            files.push({
              originalName: value.name,
              filename: value.name,
              content: new Uint8Array(content),
            });
          }
        }
        entries = { files };
      } else {
        // For older Oak versions where formData is already the parsed result
        entries = formData;
      }
      
      console.log('[BULK_UPLOAD] Form data entries:', {
        hasFiles: 'files' in entries ? !!entries.files : false,
        filesCount: 'files' in entries ? entries.files?.length || 0 : 0,
        firstFileName: 'files' in entries ? entries.files?.[0]?.originalName || 'none' : 'none'
      });

      // Find the CSV file
      const files = 'files' in entries ? entries.files : [];
      const file = files?.find((f: any) => 
        f.originalName?.toLowerCase().endsWith('.csv') || 
        f.filename?.toLowerCase().endsWith('.csv')
      );

      if (!file) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          success: false, 
          error: "No CSV file found in upload. Please ensure you're uploading a .csv file." 
        };
        return;
      }

      console.log(`[BULK_UPLOAD] Processing file: ${file.originalName || file.filename} (${file.content?.length || 0} bytes)`);

      // Parse CSV content
      let csvContent: string;
      let rows: CourseScheduleRow[];
      
      try {
        // Convert Uint8Array to string
        csvContent = new TextDecoder().decode(file.content);
        console.log(`[BULK_UPLOAD] CSV content decoded: ${csvContent.length} characters`);
        console.log(`[BULK_UPLOAD] First 200 chars:`, csvContent.substring(0, 200));
        
        // Parse CSV
        const parsed = parse(csvContent, {
          skipFirstRow: false,
        }) as string[][];
        
        if (parsed.length < 2) {
          throw new Error("CSV file is empty or contains only headers");
        }
        
        // Extract headers from first row
        const headers = parsed[0];
        console.log('[BULK_UPLOAD] CSV Headers:', headers);
        
        // Map rows to objects
        rows = parsed.slice(1).map((row, index) => {
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = row[i] || '';
          });
          return obj as CourseScheduleRow;
        });
        
        console.log(`[BULK_UPLOAD] Parsed ${rows.length} data rows from CSV`);
        if (rows.length > 0) {
          console.log('[BULK_UPLOAD] First row sample:', rows[0]);
        }
        
      } catch (parseError) {
        console.error('[BULK_UPLOAD] CSV parsing error:', parseError);
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          success: false, 
          error: "Invalid CSV format. Please check the file.",
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        };
        return;
      }

      // Validate headers
      const requiredHeaders = ['Term', 'Subject', 'Course', 'Instructor'];
      const actualHeaders = Object.keys(rows[0] || {});
      const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));
      
      if (missingHeaders.length > 0) {
        console.log('[BULK_UPLOAD] Missing headers:', missingHeaders);
        console.log('[BULK_UPLOAD] Available headers:', actualHeaders);
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          success: false,
          error: `Missing required columns: ${missingHeaders.join(', ')}. Found columns: ${actualHeaders.join(', ')}`
        };
        return;
      }

      // Process and validate each row
      const validationErrors: ValidationError[] = [];
      const parsedCourses: ParsedCourseData[] = [];
      
      console.log(`[BULK_UPLOAD] Starting validation of ${rows.length} rows`);
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Row number in CSV (1-indexed, plus header)
        const errors: string[] = [];

        // Skip empty rows
        if (!row.Term && !row.Subject && !row.Course) {
          console.log(`[BULK_UPLOAD] Skipping empty row ${rowNum}`);
          continue;
        }

        // Validate required fields
        if (!row.Term?.trim()) errors.push("Term is required");
        if (!row.Subject?.trim()) errors.push("Subject is required");
        if (!row.Course?.trim()) errors.push("Course number is required");
        if (!row.Instructor?.trim()) errors.push("Instructor name is required");

        // If validation errors, track them
        if (errors.length > 0) {
          validationErrors.push({
            row: rowNum,
            errors: errors,
            data: {
              Term: row.Term,
              Subject: row.Subject,
              Course: row.Course,
              "Sec No": row["Sec No"],
              Instructor: row.Instructor
            }
          });
          continue;
        }

        // Parse valid row data
        const courseCode = `${row.Subject.trim()} ${row.Course.trim()}`;
        const sectionCode = row["Sec No"] ? `${courseCode}-${row["Sec No"]}` : courseCode;
        
        // Parse dates
        let startDate = '';
        let endDate = '';
        if (row["Week patterns"]) {
          const dateMatch = row["Week patterns"].match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            startDate = dateMatch[1];
            endDate = dateMatch[2];
          }
        }

        const parsedData: ParsedCourseData = {
          term: row.Term.trim(),
          courseCode: courseCode,
          courseName: `${courseCode} - ${row.Activity || 'Course'}`,
          sectionCode: sectionCode,
          sectionName: `Section ${row["Sec No"] || '001'}`,
          instructionalFormat: row.Activity || 'Lecture',
          deliveryMode: row["On campus or Online"] || 'On campus',
          credits: parseInt(row.Creds) || 3,
          enrollmentSize: parseInt(row.Size) || 50,
          days: row.Days?.trim() || '',
          startTime: row["Start Time"] ? convertTo24Hour(row["Start Time"]) : '09:00',
          endTime: row["End Time"] ? convertTo24Hour(row["End Time"]) : '10:30',
          startDate: startDate,
          endDate: endDate,
          location: row.Location?.trim() || (row["On campus or Online"] === "Online Learning" ? "Online" : "TBD"),
          instructorName: row.Instructor.trim(),
          hasSecondaryActivity: !!row["Secondary Activity"]?.trim(),
          secondaryActivity: row["Secondary Activity"]?.trim() || ""
        };

        parsedCourses.push(parsedData);
      }

      console.log(`[BULK_UPLOAD] Validation complete: ${parsedCourses.length} valid, ${validationErrors.length} invalid`);

      // Return validation results
      if (validationErrors.length > 0) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          success: false,
          error: `Validation failed for ${validationErrors.length} rows`,
          validRows: parsedCourses.length,
          invalidRows: validationErrors.length,
          totalRows: parsedCourses.length + validationErrors.length,
          errors: validationErrors.slice(0, 100) // Limit to first 100 errors
        };
        return;
      }

      // Store parsed data and return preview
      const uploadId = crypto.randomUUID();
      uploadSessionStorage.set(uploadId, parsedCourses);
      
      // Clean up old sessions
      if (uploadSessionStorage.size > 100) {
        cleanupOldSessions();
      }
      
      console.log(`[BULK_UPLOAD] Stored ${parsedCourses.length} courses for session ${uploadId}`);
      
      ctx.response.status = Status.OK;
      ctx.response.body = {
        success: true,
        preview: true,
        message: `${parsedCourses.length} rows validated successfully`,
        totalRows: parsedCourses.length,
        data: parsedCourses.slice(0, 20), // Preview first 20 rows
        uploadId: uploadId
      };
      
      console.log(`[BULK_UPLOAD] Upload completed successfully in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error("[BULK_UPLOAD_ERROR] Unexpected error:", error);
      console.error("[BULK_UPLOAD_ERROR] Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { 
        success: false, 
        error: "Failed to process upload. Please check server logs.",
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);

/**
 * POST /api/bulk-upload/course-schedule/confirm
 * 
 * Endpoint for confirming and processing validated course schedule data.
 * This endpoint:
 * 1. Receives the validated course data from the preview step
 * 2. Creates departments if they don't exist
 * 3. Creates instructors with default passwords if they don't exist
 * 4. Creates or updates courses in the database
 * 5. Creates lab sections for courses with secondary activities
 * 
 * All operations are wrapped in database transactions for atomicity.
 */
bulkUploadRouter.post('/bulk-upload/course-schedule/confirm',
  async (ctx: Context, next) => {
    await requireRole(authService, 'admin', 'ta_coordinator')(ctx, next);
  },
  async (ctx: Context) => {
    const user = (ctx.state as any).user;
    
    try {
      const body = await ctx.request.body().value;
      const { uploadId } = body;

      if (!uploadId) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          success: false, 
          error: "Missing upload ID" 
        };
        return;
      }

      // Retrieve the stored parsed data
      const courses = uploadSessionStorage.get(uploadId);
      
      if (!courses) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { 
          success: false, 
          error: "Upload session expired or invalid. Please upload the file again." 
        };
        return;
      }

      console.log(`[BULK_UPLOAD_CONFIRM] Processing ${courses.length} courses for upload ${uploadId}`);

      // Track processing results
      const results = {
        coursesCreated: 0,
        coursesUpdated: 0,
        sectionsCreated: 0,
        instructorsCreated: 0,
        errors: [] as { course: string; error: string }[]
      };

      // Process each course individually to avoid transaction issues
      for (const courseData of courses) {
        try {
          // Start a new transaction for each course
          await db.query('BEGIN');

          try {
            // Log course being processed
            console.log(`[BULK_UPLOAD_PROCESS] Processing course: ${courseData.courseCode} - ${courseData.courseName}`);

            // Step 1: Handle terms (use term as string, not ID lookup)
            const termName = courseData.term;
            console.log(`[BULK_UPLOAD_PROCESS] Using term: ${termName}`);

            // Step 2: Ensure instructor exists
            interface UserResult {
              user_id: number;
            }
            
            let instructorResult = await db.query<UserResult>(
              'SELECT user_id FROM users WHERE name = $1 AND role = $2',
              [courseData.instructorName, 'instructor']
            );

            let instructorId: number;
            if (instructorResult.rows.length === 0) {
              // Generate a unique email for the instructor
              const baseEmail = courseData.instructorName.toLowerCase()
                .replace(/[^a-z0-9]/g, '.')
                .replace(/\.+/g, '.')
                .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
              
              const instructorEmail = `${baseEmail}@instructor.ubc.ca`;
              const defaultPassword = await hashPassword('instructor123');
              
              console.log(`[BULK_UPLOAD_PROCESS] Creating new instructor: ${courseData.instructorName} (${instructorEmail})`);
              
              const newInstructorResult = await db.query<UserResult>(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id',
                [courseData.instructorName, instructorEmail, defaultPassword, 'instructor']
              );
              instructorId = newInstructorResult.rows[0].user_id;
              results.instructorsCreated++;
              console.log(`[BULK_UPLOAD_PROCESS] Created instructor with ID: ${instructorId}`);
            } else {
              instructorId = instructorResult.rows[0].user_id;
              console.log(`[BULK_UPLOAD_PROCESS] Found existing instructor with ID: ${instructorId}`);
            }

            // Step 3: Determine department ID
            const subject = courseData.courseCode.split(' ')[0];
            const subjectToDeptMap: { [key: string]: string } = {
              'BIOL': 'Biology',
              'PSYC': 'Psychology',
              'PSYO': 'Psychology', // Alternative code
              'ENGL': 'English',
              'STAT': 'Statistics',
              'PHYS': 'Physics', 
              'ECON': 'Economics',
              'COSC': 'Computer Science',
              'PHTH': 'Physical Therapy',
              'CPSC': 'Computer Science',
              'MATH': 'Mathematics',
            };

            const deptName = subjectToDeptMap[subject] || 'General Studies';
            console.log(`[BULK_UPLOAD_PROCESS] Mapped subject ${subject} to department: ${deptName}`);

            // Ensure department exists
            let deptResult = await db.query<{ dept_id: number }>(
              'SELECT dept_id FROM departments WHERE name = $1',
              [deptName]
            );

            let deptId: number;
            if (deptResult.rows.length === 0) {
              const newDeptResult = await db.query<{ dept_id: number }>(
                'INSERT INTO departments (name) VALUES ($1) RETURNING dept_id',
                [deptName]
              );
              deptId = newDeptResult.rows[0].dept_id;
              console.log(`[BULK_UPLOAD_PROCESS] Created new department: ${deptName} with ID: ${deptId}`);
            } else {
              deptId = deptResult.rows[0].dept_id;
            }

            // Step 4: Check if course exists
            interface CourseResult {
              course_id: number;
            }
            
            const existingCourse = await db.query<CourseResult>(
              'SELECT course_id FROM courses WHERE code = $1 AND term = $2',
              [courseData.courseCode, termName]
            );

            let courseId: number;
            
            // Format the course time as a single string (FIXED: use course_time column)
            const courseTime = courseData.startTime && courseData.endTime 
              ? `${courseData.startTime} - ${courseData.endTime}`
              : null;
            
            if (existingCourse.rows.length > 0) {
              // Update existing course
              courseId = existingCourse.rows[0].course_id;
              console.log(`[BULK_UPLOAD_PROCESS] Updating existing course ID: ${courseId}`);
              
              await db.query(
                `UPDATE courses SET 
                  title = $1, 
                  instructor_id = $2, 
                  dept_id = $3,
                  course_days = $4,
                  course_time = $5,
                  updated_at = CURRENT_TIMESTAMP
                WHERE course_id = $6`,
                [
                  courseData.courseName,
                  instructorId,
                  deptId,
                  courseData.days || null,
                  courseTime,
                  courseId
                ]
              );
              results.coursesUpdated++;
              console.log(`[BULK_UPLOAD_PROCESS] Updated course: ${courseData.courseCode}`);
            } else {
              // Create new course
              console.log(`[BULK_UPLOAD_PROCESS] Creating new course: ${courseData.courseCode}`);
              
              const newCourseResult = await db.query<CourseResult>(
                `INSERT INTO courses (code, title, term, instructor_id, dept_id, course_days, course_time, max_tas)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING course_id`,
                [
                  courseData.courseCode,
                  courseData.courseName,
                  termName,
                  instructorId,
                  deptId,
                  courseData.days || null,
                  courseTime,
                  3 // Default max TAs
                ]
              );
              courseId = newCourseResult.rows[0].course_id;
              results.coursesCreated++;
              console.log(`[BULK_UPLOAD_PROCESS] Created course with ID: ${courseId}`);
            }

            // Step 5: Create lab sections if needed
            if (courseData.hasSecondaryActivity && courseData.secondaryActivity) {
              console.log(`[BULK_UPLOAD_PROCESS] Course has secondary activity: ${courseData.secondaryActivity}`);
              
              // Check if lab section already exists
              const labCheck = await db.query(
                'SELECT lab_section_id FROM lab_sections WHERE course_id = $1 AND section_name = $2',
                [courseId, `${courseData.secondaryActivity} Section`]
              );
              
              if (labCheck.rows.length === 0) {
                // Insert into lab_sections table
                await db.query(
                  `INSERT INTO lab_sections (course_id, section_name, lab_days, lab_start_time, lab_end_time)
                  VALUES ($1, $2, $3, $4, $5)`,
                  [
                    courseId,
                    `${courseData.secondaryActivity} Section`,
                    courseData.days || '',
                    courseData.startTime || '09:00',
                    courseData.endTime || '10:30'
                  ]
                );
                results.sectionsCreated++;
                console.log(`[BULK_UPLOAD_PROCESS] Created lab section for course ID: ${courseId}`);
              } else {
                console.log(`[BULK_UPLOAD_PROCESS] Lab section already exists for course ID: ${courseId}`);
              }
            }

            // Commit this course's transaction
            await db.query('COMMIT');
            console.log(`[BULK_UPLOAD_PROCESS] Successfully processed course: ${courseData.courseCode}`);

          } catch (innerError) {
            // Rollback this course's transaction
            await db.query('ROLLBACK');
            throw innerError;
          }

        } catch (rowError) {
          // Log the specific error for this course
          const errorMessage = rowError instanceof Error ? rowError.message : 'Unknown error occurred';
          results.errors.push({
            course: courseData.courseCode,
            error: errorMessage
          });
          console.error(`[BULK_UPLOAD_ERROR] Failed to process course ${courseData.courseCode}:`, errorMessage);
          
          // Continue with the next course
          continue;
        }
      }
      
      // Clean up the stored session data
      uploadSessionStorage.delete(uploadId);

      // Log the bulk upload operation summary
      console.log(`[BULK_UPLOAD_SUMMARY] Processing completed for user ${user.email}:`);
      console.log(`[BULK_UPLOAD_SUMMARY] - Courses created: ${results.coursesCreated}`);
      console.log(`[BULK_UPLOAD_SUMMARY] - Courses updated: ${results.coursesUpdated}`);
      console.log(`[BULK_UPLOAD_SUMMARY] - Lab sections created: ${results.sectionsCreated}`);
      console.log(`[BULK_UPLOAD_SUMMARY] - New instructors created: ${results.instructorsCreated}`);
      console.log(`[BULK_UPLOAD_SUMMARY] - Errors encountered: ${results.errors.length}`);

      if (results.errors.length > 0) {
        console.log(`[BULK_UPLOAD_SUMMARY] Errors:`);
        results.errors.forEach(err => {
          console.log(`[BULK_UPLOAD_SUMMARY]   - ${err.course}: ${err.error}`);
        });
      }

      // Return success response with statistics
      ctx.response.body = {
        success: true,
        message: "Bulk upload completed",
        results: results
      };

    } catch (error) {
      console.error("Bulk upload confirmation error:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { 
        success: false, 
        error: "Failed to process bulk upload",
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
);

/**
 * GET /api/bulk-upload/template
 * 
 * Endpoint for downloading a CSV template with example data.
 * This helps users understand the expected format for bulk uploads.
 * 
 * @returns {text/csv} CSV file with headers and example rows
 */
bulkUploadRouter.get('/bulk-upload/template', async (ctx: Context) => {
  // Template content with headers and two example rows
  const templateContent = `Term,Subject,Course,Sec No,Activity,Creds,Size,Primary,Primary Activity Repeats,On campus or Online,Days,Start Time,End Time,Week patterns,Secondary Activity,Faculty,Instructor,Location
2025W,BIOL,495,144,Lecture,3,141,1,3,Online Learning,Mon Wed Fri,1:00 p.m.,2:30 p.m.,2025-05-13 - 2025-06-27,Lab,,Scott Fazackerley,BIO-Annex 1
2025S,PSYO,166,266,Discussion,4,73,3,3,On campus,Fri,3:30 p.m.,5:00 p.m.,2025-05-13 - 2025-06-27,Discussion,,John O'Connor,BIO-Annex 1`;

  // Set response headers for file download
  ctx.response.headers.set('Content-Type', 'text/csv');
  ctx.response.headers.set('Content-Disposition', 'attachment; filename="course_schedule_template.csv"');
  ctx.response.body = templateContent;
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert time string from 12-hour to 24-hour format
 * Handles various input formats (e.g., "1:00 p.m.", "1:00pm", "1:00 PM")
 * 
 * @param {string} timeStr - Time in 12-hour format
 * @returns {string} Time in 24-hour format (HH:MM)
 */
function convertTo24Hour(timeStr: string): string {
  // Match various 12-hour time formats
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);
  
  if (!match) {
    // If no match, assume it's already in 24-hour format or return default
    return timeStr.includes(':') ? timeStr : '09:00';
  }

  let [, hours, minutes, period] = match;
  let hour = parseInt(hours);
  const isPM = period.toLowerCase().includes('p');

  // Convert to 24-hour format
  if (isPM && hour !== 12) {
    hour += 12;
  } else if (!isPM && hour === 12) {
    hour = 0;
  }

  // Format as HH:MM
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

export { bulkUploadRouter };

/**
 * Router Features:
 * 
 * 1. CSV Upload & Validation:
 *    - Validates file format and size
 *    - Checks required columns
 *    - Validates each row
 *    - Returns detailed error reports
 * 
 * 2. Data Preview:
 *    - Shows first 20 rows before import
 *    - Stores all data in session
 *    - Provides upload ID for confirmation
 * 
 * 3. Automatic Creation:
 *    - Creates instructors with default passwords
 *    - Creates departments based on course subjects
 *    - Updates existing courses or creates new ones
 *    - Creates lab sections for secondary activities
 * 
 * 4. Enhanced Logging:
 *    - Detailed logging throughout the process
 *    - Tracks each course processing
 *    - Provides summary statistics
 *    - Logs all errors with context
 * 
 * 5. Transaction Safety:
 *    - Each course processed in separate transaction
 *    - Rollback on errors
 *    - Continues processing remaining courses
 * 
 * 6. Template Download:
 *    - Provides CSV template with example data
 *    - Shows expected format
 *    - Includes all required columns
 */