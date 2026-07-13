// app/src/database/seeders/dummy-data.ts
import { hashPassword } from '../../../deps.ts';
import { Database } from '../config.ts';

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random element from array
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to generate random number between min and max
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate GPA
function randomGPA(): number {
  return Math.round((Math.random() * 2.33 + 2.0) * 100) / 100; // GPA between 2.0 and 4.33
}

// Data generators for each table
export class DummyDataLoader {
  private db: Database;
  
  // Store IDs for reference
  private userIds: { [key: string]: number } = {};
  private courseIds: number[] = [];
  private labSectionIds: number[] = [];
  private termIds: number[] = [];
  private deptIds: number[] = [];
  private applicationIds: number[] = [];
  private courseTemplateIds: number[] = [];
  
  // Counters for successful inserts
  private insertCounts: { [key: string]: number } = {};
  private errors: { table: string; error: string; details?: any }[] = [];

  constructor(database: Database) {
    this.db = database;
  }

  // Helper method to track successful inserts
  private trackInsert(table: string, count: number = 1) {
    this.insertCounts[table] = (this.insertCounts[table] || 0) + count;
  }

  // Helper method to track errors
  private trackError(table: string, error: any, details?: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.errors.push({ table, error: errorMessage, details });
    console.error(`  ❌ Error in ${table}: ${errorMessage}`);
    if (details) {
      console.error(`     Details:`, details);
    }
  }
  
  async loadExistingCourseTemplateIds(): Promise<void> {
  console.log('🔍 Loading existing course template IDs...');
  
  try {
    const result = await this.db.query(
      `SELECT template_id FROM course_templates ORDER BY template_id`
    );
    
    this.courseTemplateIds = result.rows.map(row => Number(row.template_id));
    console.log(`  ✅ Loaded ${this.courseTemplateIds.length} existing course template IDs`);
  } catch (error) {
    console.error('Error loading course template IDs:', error);
    }
    }

  // Load existing user IDs into memory
  async loadExistingUserIds(): Promise<void> {
    console.log('🔍 Loading existing user IDs...');
    
    try {
      const result = await this.db.query(
        `SELECT user_id, email FROM users WHERE email IN (
          'alice.j@student.ubc.ca', 'bob.smith@student.ubc.ca', 'carol.d@student.ubc.ca',
          'david.b@student.ubc.ca', 'emma.w@student.ubc.ca', 'frank.m@student.ubc.ca',
          'grace.l@student.ubc.ca', 'henry.c@student.ubc.ca', 'iris.w@student.ubc.ca',
          'jack.t@student.ubc.ca', 'karen.w@student.ubc.ca', 'leo.m@student.ubc.ca',
          'maya.p@student.ubc.ca', 'nathan.k@student.ubc.ca', 'olivia.z@student.ubc.ca',
          'sarah.thompson@ubc.ca', 'michael.roberts@ubc.ca', 'jennifer.anderson@ubc.ca',
          'david.williams@ubc.ca', 'admin@ubc.ca', 'superadmin@ubc.ca', 'ta.coordinator@ubc.ca'
        )`
      ) as { rows: { user_id: number; email: string }[] };
      
      for (const row of result.rows) {
        this.userIds[row.email] = Number(row.user_id);
      }
      
      console.log(`  ✅ Loaded ${result.rows.length} existing user IDs`);
    } catch (error) {
      console.error('  ❌ Error loading existing user IDs:', error);
    }
  }

  // Reset sequences to current max values to prevent conflicts
  async resetSequences(): Promise<void> {
    console.log('🔄 Resetting sequences to prevent conflicts...');
    
    const sequences = [
      { table: 'departments', id_column: 'dept_id', sequence: 'departments_dept_id_seq' },
      { table: 'terms', id_column: 'term_id', sequence: 'terms_term_id_seq' },
      { table: 'users', id_column: 'user_id', sequence: 'users_user_id_seq' },
      { table: 'course_templates', id_column: 'template_id', sequence: 'course_templates_template_id_seq' },
      { table: 'courses', id_column: 'course_id', sequence: 'courses_course_id_seq' },
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
        const maxIdResult = await this.db.query(
          `SELECT COALESCE(MAX(${id_column}), 0) as max_id FROM ${table}`
        );
        const maxId = Number(maxIdResult.rows[0].max_id);
        
        if (maxId > 0) {
          await this.db.query(`SELECT setval('${sequence}', ${maxId}, true)`);
          console.log(`  ✅ Reset ${sequence} to ${maxId}`);
        } else {
          console.log(`  ⚠️  Table ${table} is empty, skipping sequence reset`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not reset sequence for ${table}:`, error);
      }
    }
  }

  // 1. Insert Departments
  async insertDepartments(): Promise<void> {
    console.log('📁 Inserting departments...');
    
    const departments = [
      'Computer Science',
      'Mathematics',
      'Physics',
      'Statistics',
      'Engineering'
    ];

    for (const deptName of departments) {
      try {
        const result = await this.db.query(
          `INSERT INTO departments (name) 
           VALUES ($1) 
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING dept_id`,
          [deptName]
        );
        if (result.rows[0]) {
          this.deptIds.push(Number(result.rows[0].dept_id));
          this.trackInsert('departments');
        }
      } catch (error) {
        this.trackError('departments', error, { name: deptName });
      }
    }
    
    console.log(`  ✅ Departments ready: ${this.deptIds.length} department(s)`);
  }

  // 2. Insert Terms
  async insertTerms(): Promise<void> {
    console.log('📅 Inserting terms...');
    
    const terms = [
      { name: 'Winter 2025', start: '2025-01-06', end: '2025-04-30', status: 'upcoming' },
      { name: 'Summer 2025', start: '2025-05-05', end: '2025-08-29', status: 'upcoming' },
      { name: 'Fall 2025', start: '2025-09-02', end: '2025-12-19', status: 'upcoming' }
    ];

    for (const term of terms) {
      try {
        const result = await this.db.query(
          `INSERT INTO terms (name, start_date, end_date, status) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (name) DO UPDATE SET 
             start_date = EXCLUDED.start_date,
             end_date = EXCLUDED.end_date,
             status = EXCLUDED.status
           RETURNING term_id`,
          [term.name, term.start, term.end, term.status]
        );
        if (result.rows[0]) {
          this.termIds.push(Number(result.rows[0].term_id));
          this.trackInsert('terms');
        }
      } catch (error) {
        this.trackError('terms', error, term);
      }
    }
  }

  // 3. Insert Users (22 total: 15 students, 4 instructors, 2 admins, 1 ta_coordinator)
  async insertUsers(): Promise<void> {
    console.log('👥 Inserting users...');
    let hashedPass: string;
    
    try {
      hashedPass = await hashPassword('password123');
    } catch (error) {
      this.trackError('users', 'Failed to hash password', error);
      return;
    }
    
    // Students (15)
    const studentData = [
      { name: 'Alice Johnson', email: 'alice.j@student.ubc.ca', major: 'Computer Science', student_number: '12345678' },
      { name: 'Bob Smith', email: 'bob.smith@student.ubc.ca', major: 'Mathematics', student_number: '12345679' },
      { name: 'Carol Davis', email: 'carol.d@student.ubc.ca', major: 'Computer Science', student_number: '12345680' },
      { name: 'David Brown', email: 'david.b@student.ubc.ca', major: 'Physics', student_number: '12345681' },
      { name: 'Emma Wilson', email: 'emma.w@student.ubc.ca', major: 'Computer Science', student_number: '12345682' },
      { name: 'Frank Miller', email: 'frank.m@student.ubc.ca', major: 'Engineering', student_number: '12345683' },
      { name: 'Grace Lee', email: 'grace.l@student.ubc.ca', major: 'Computer Science', student_number: '12345684' },
      { name: 'Henry Chen', email: 'henry.c@student.ubc.ca', major: 'Mathematics', student_number: '12345685' },
      { name: 'Iris Wang', email: 'iris.w@student.ubc.ca', major: 'Computer Science', student_number: '12345686' },
      { name: 'Jack Taylor', email: 'jack.t@student.ubc.ca', major: 'Statistics', student_number: '12345687' },
      { name: 'Karen White', email: 'karen.w@student.ubc.ca', major: 'Computer Science', student_number: '12345688' },
      { name: 'Leo Martinez', email: 'leo.m@student.ubc.ca', major: 'Engineering', student_number: '12345689' },
      { name: 'Maya Patel', email: 'maya.p@student.ubc.ca', major: 'Computer Science', student_number: '12345690' },
      { name: 'Nathan Kim', email: 'nathan.k@student.ubc.ca', major: 'Physics', student_number: '12345691' },
      { name: 'Olivia Zhang', email: 'olivia.z@student.ubc.ca', major: 'Computer Science', student_number: '12345692' }
    ];

    // Insert students
    for (const student of studentData) {
      try {
        // Try to insert, but if it exists, get the existing user_id
        let result = await this.db.query(
          `INSERT INTO users (name, email, password_hash, role, major, student_number, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (email) DO NOTHING 
           RETURNING user_id`,
          [student.name, student.email, hashedPass, 'student', student.major, student.student_number, true]
        );
        
        if (result.rows[0]) {
          this.userIds[student.email] = Number(result.rows[0].user_id);
          this.trackInsert('users');
        } else {
          // User already exists, fetch their ID
          console.log(`  ⚠️  Student ${student.email} already exists, fetching ID...`);
          const existingUser = await this.db.query(
            `SELECT user_id FROM users WHERE email = $1`,
            [student.email]
          );
          if (existingUser.rows[0]) {
            this.userIds[student.email] = Number(existingUser.rows[0].user_id);
          }
        }
      } catch (error) {
        this.trackError('users', error, student);
      }
    }

    // Instructors (4)
    const instructorData = [
      { name: 'Dr. Sarah Thompson', email: 'sarah.thompson@ubc.ca' },
      { name: 'Prof. Michael Roberts', email: 'michael.roberts@ubc.ca' },
      { name: 'Dr. Jennifer Anderson', email: 'jennifer.anderson@ubc.ca' },
      { name: 'Prof. David Williams', email: 'david.williams@ubc.ca' }
    ];

    for (const instructor of instructorData) {
      try {
        let result = await this.db.query(
          `INSERT INTO users (name, email, password_hash, role, is_active) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (email) DO NOTHING 
           RETURNING user_id`,
          [instructor.name, instructor.email, hashedPass, 'instructor', true]
        );
        if (result.rows[0]) {
          this.userIds[instructor.email] = Number(result.rows[0].user_id);
          this.trackInsert('users');
        } else {
          // User already exists, fetch their ID
          console.log(`  ⚠️  Instructor ${instructor.email} already exists, fetching ID...`);
          const existingUser = await this.db.query(
            `SELECT user_id FROM users WHERE email = $1`,
            [instructor.email]
          );
          if (existingUser.rows[0]) {
            this.userIds[instructor.email] = Number(existingUser.rows[0].user_id);
          }
        }
      } catch (error) {
        this.trackError('users', error, instructor);
      }
    }

    // Admin users (2)
    const adminData = [
      { name: 'Admin User', email: 'admin@ubc.ca' },
      { name: 'Super Admin', email: 'superadmin@ubc.ca' }
    ];

    for (const admin of adminData) {
      try {
        let result = await this.db.query(
          `INSERT INTO users (name, email, password_hash, role, is_active) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (email) DO NOTHING 
           RETURNING user_id`,
          [admin.name, admin.email, hashedPass, 'admin', true]
        );
        if (result.rows[0]) {
          this.userIds[admin.email] = Number(result.rows[0].user_id);
          this.trackInsert('users');
        } else {
          // User already exists, fetch their ID
          const existingUser = await this.db.query(
            `SELECT user_id FROM users WHERE email = $1`,
            [admin.email]
          );
          if (existingUser.rows[0]) {
            this.userIds[admin.email] = Number(existingUser.rows[0].user_id);
          }
        }
      } catch (error) {
        this.trackError('users', error, admin);
      }
    }

    // TA Coordinator (1)
    try {
      let result = await this.db.query(
        `INSERT INTO users (name, email, password_hash, role, is_active) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING user_id`,
        ['TA Coordinator', 'ta.coordinator@ubc.ca', hashedPass, 'ta_coordinator', true]
      );
      if (result.rows[0]) {
        this.userIds['ta.coordinator@ubc.ca'] = Number(result.rows[0].user_id);
        this.trackInsert('users');
      } else {
        // User already exists, fetch their ID
        const existingUser = await this.db.query(
          `SELECT user_id FROM users WHERE email = $1`,
          ['ta.coordinator@ubc.ca']
        );
        if (existingUser.rows[0]) {
          this.userIds['ta.coordinator@ubc.ca'] = Number(existingUser.rows[0].user_id);
        }
      }
    } catch (error) {
      this.trackError('users', error, { email: 'ta.coordinator@ubc.ca' });
    }
  }

  // 4. Insert User Profiles
  async insertUserProfiles(): Promise<void> {
    console.log('👤 Inserting user profiles...');
    
    for (const [email, userId] of Object.entries(this.userIds)) {
      try {
        const isStudent = email.includes('student');
        
        await this.db.query(
          `INSERT INTO user_profiles (
            user_id, avatar_url, resume_url, bio, linkedin_url
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id) DO NOTHING`,
          [
            userId,
            null, // avatar_url
            null, // resume_url
            isStudent 
              ? `Enthusiastic ${randomElement(['undergraduate', 'graduate'])} student passionate about teaching and helping others.`
              : `Experienced educator dedicated to student success and innovative teaching methods.`,
            null  // linkedin_url
          ]
        );
        this.trackInsert('user_profiles');
      } catch (error) {
        this.trackError('user_profiles', error, { email, userId });
      }
    }
  }

  // 5. Insert Course Templates
  async insertCourseTemplates(): Promise<void> {
  console.log('📚 Inserting course templates...');
  
  const courseTemplates = [
    { code: 'CPSC110', title: 'Computation, Programs, and Programming', dept: 'Computer Science' },
    { code: 'CPSC121', title: 'Models of Computation', dept: 'Computer Science' },
    { code: 'CPSC210', title: 'Software Construction', dept: 'Computer Science' },
    { code: 'CPSC213', title: 'Introduction to Computer Systems', dept: 'Computer Science' },
    { code: 'CPSC221', title: 'Basic Algorithms and Data Structures', dept: 'Computer Science' },
    { code: 'MATH101', title: 'Integral Calculus', dept: 'Mathematics' },
    { code: 'MATH200', title: 'Calculus III', dept: 'Mathematics' },
    { code: 'PHYS101', title: 'Energy and Waves', dept: 'Physics' },
    { code: 'STAT200', title: 'Elementary Statistics', dept: 'Statistics' },
    { code: 'STAT302', title: 'Introduction to Probability', dept: 'Statistics' }
  ];

  for (const template of courseTemplates) {
    try {
      const deptResult = await this.db.query(
        `SELECT dept_id FROM departments WHERE name = $1`,
        [template.dept]
      );
      
      if (deptResult.rows.length === 0) {
        this.trackError('course_templates', `Department ${template.dept} not found`, template);
        continue;
      }
      
      const deptId = deptResult.rows[0].dept_id;
      
      // Use UPSERT pattern to handle existing templates
      const result = await this.db.query(
        `INSERT INTO course_templates (
          code, title, description, dept_id
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO UPDATE SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          dept_id = EXCLUDED.dept_id
        RETURNING template_id`,
        [
          template.code,
          template.title,
          `Introduction to ${template.title.toLowerCase()} concepts and applications.`,
          deptId
        ]
      );
      
      if (result.rows[0]) {
        const templateId = Number(result.rows[0].template_id);
        if (!this.courseTemplateIds.includes(templateId)) {
          this.courseTemplateIds.push(templateId);
        }
        this.trackInsert('course_templates');
      }
    } catch (error) {
      this.trackError('course_templates', error, template);
    }
  }
  
  // If we didn't insert any new templates, load existing ones
  if (this.courseTemplateIds.length === 0) {
    await this.loadExistingCourseTemplateIds();
  }
}

  // 6. Insert Courses
  async insertCourses(): Promise<void> {
  console.log('🎓 Inserting courses...');
  
  // If no course templates are loaded, try to load them
  if (this.courseTemplateIds.length === 0) {
    console.log('  ⚠️  No course templates found, loading existing ones...');
    await this.loadExistingCourseTemplateIds();
    
    if (this.courseTemplateIds.length === 0) {
      this.trackError('courses', 'No course templates available to create courses');
      return;
    }
  }
  
  // Only create courses for the first term and some templates
  const selectedTemplates = this.courseTemplateIds.slice(0, 5);
  const term = this.termIds[0]; // Winter 2025
  
  if (!term) {
    this.trackError('courses', 'No terms available');
    return;
  }
  
  // Get term name for the course
  const termResult = await this.db.query(
    `SELECT name FROM terms WHERE term_id = $1`,
    [term]
  );
  
  if (termResult.rows.length === 0) {
    this.trackError('courses', 'Term not found');
    return;
  }
  
  const termName = termResult.rows[0].name;
  
  for (const templateId of selectedTemplates) {
    try {
      // Get template info
      const templateResult = await this.db.query(
        `SELECT code, title, dept_id FROM course_templates WHERE template_id = $1`,
        [templateId]
      );
      
      if (templateResult.rows.length === 0) {
        continue;
      }
      
      const template = templateResult.rows[0];
      
      // Get an instructor
      const instructorEmails = Object.keys(this.userIds).filter(
        email => email.includes('@ubc.ca') && 
        !email.includes('admin') && 
        !email.includes('coordinator')
      );
      
      if (instructorEmails.length === 0) {
        this.trackError('courses', 'No instructors available');
        continue;
      }
      
      const instructorId = this.userIds[randomElement(instructorEmails)];
      
      // Check if this course already exists
      const existingCourse = await this.db.query(
        `SELECT course_id FROM courses 
         WHERE code = $1 AND term = $2`,
        [template.code, termName]
      );
      
      if (existingCourse.rows.length > 0) {
        // Course exists, add to our tracking
        const courseId = Number(existingCourse.rows[0].course_id);
        if (!this.courseIds.includes(courseId)) {
          this.courseIds.push(courseId);
        }
        console.log(`  ⚠️  Course ${template.code} for ${termName} already exists`);
        continue;
      }
      
      const result = await this.db.query(
        `INSERT INTO courses (
          code, title, term, instructor_id, dept_id, template_id, max_tas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING course_id`,
        [
          template.code,
          template.title,
          termName,
          instructorId,
          template.dept_id,
          templateId,
          randomInt(2, 5)
        ]
      );
      
      if (result.rows[0]) {
        this.courseIds.push(Number(result.rows[0].course_id));
        this.trackInsert('courses');
      }
    } catch (error) {
      this.trackError('courses', error, { templateId });
    }
  }
  
  // If no courses were created, load existing course IDs
  if (this.courseIds.length === 0) {
    console.log('  ⚠️  No courses created, loading existing course IDs...');
    try {
      const existingCourses = await this.db.query(
        `SELECT course_id FROM courses ORDER BY course_id`
      );
      this.courseIds = existingCourses.rows.map(row => Number(row.course_id));
      console.log(`  ✅ Loaded ${this.courseIds.length} existing course IDs`);
    } catch (error) {
      console.error('Error loading existing course IDs:', error);
    }
  }
}

  // 8. Insert Student Profiles
  async insertStudentProfiles(): Promise<void> {
    console.log('🎒 Inserting student profiles...');
    
    const studentEmails = Object.keys(this.userIds).filter(email => email.includes('student'));
    
    if (studentEmails.length === 0) {
      this.trackError('student_profiles', 'No students found to create profiles for');
      return;
    }
    
    for (const email of studentEmails) {
      try {
        const userId = this.userIds[email];
        const yearOfStudy = randomInt(2, 4);
        const graduationYear = 2025 + (5 - yearOfStudy);
        
        const result = await this.db.query(
          `INSERT INTO student_profiles (
            user_id, overall_gpa, year_of_study, expected_graduation,
            personal_statement, weekly_availability, max_hours_per_week,
            preferred_term, relevant_coursework, teaching_experience,
            technical_skills, is_submitted, submitted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (user_id) DO NOTHING
          RETURNING profile_id`,
          [
            userId,
            randomGPA(),
            yearOfStudy,
            `${graduationYear}-05-01`,
            `I am passionate about teaching and have strong communication skills. I enjoy helping students understand complex concepts and would love to contribute as a TA.`,
            'Monday: 9-5, Tuesday: 12-5, Wednesday: 9-3, Thursday: 12-5, Friday: 9-12',
            randomInt(10, 20),
            randomElement(['Winter 2025', 'Summer 2025', 'Fall 2025']),
            'CPSC 110, CPSC 121, CPSC 210, CPSC 213, CPSC 221',
            randomElement(['Tutored high school students', 'Lab monitor experience', 'None', 'Peer mentoring']),
            'Python, Java, C++, JavaScript, SQL, Git',
            true,
            new Date().toISOString()
          ]
        );
        
        if (result.rows[0]) {
          this.trackInsert('student_profiles');
        } else {
          console.log(`  ⚠️  Student profile for ${email} already exists`);
        }
      } catch (error) {
        this.trackError('student_profiles', error, { email });
      }
    }
  }

  // 9. Insert TA Applications
  async insertTAApplications(): Promise<void> {
  console.log('📝 Inserting TA applications...');
  
  const studentEmails = Object.keys(this.userIds).filter(email => email.includes('student'));
  
  if (studentEmails.length === 0) {
    this.trackError('ta_applications', 'No students found to create applications for');
    return;
  }
  
  // Each student applies to be a TA
  for (const email of studentEmails) {
    try {
      const userId = this.userIds[email];
      
      // Get student profile data for snapshot
      const profileResult = await this.db.query(
        `SELECT overall_gpa, technical_skills, relevant_coursework, teaching_experience, weekly_availability, expected_graduation 
         FROM student_profiles WHERE user_id = $1`,
        [userId]
      );
      
      if (profileResult.rows.length === 0) {
        this.trackError('ta_applications', `No student profile found for user ${userId}`, { email });
        continue;
      }
      
      const profile = profileResult.rows[0];
      
      // Remove the ON CONFLICT clause since users can have multiple applications
      const result = await this.db.query(
        `INSERT INTO ta_applications (
          user_id, status, application_type, term_availability,
          domain_areas, technical_skills, relevant_coursework,
          overall_gpa, expected_graduation, weekly_availability,
          teaching_experience
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING application_id`,
        [
          userId,
          randomElement(['pending', 'approved', 'rejected']),
          randomElement(['UTA', 'GTA']),
          randomElement(['Winter 2025', 'Summer 2025', 'Fall 2025', 'Winter 2025, Summer 2025']),
          JSON.stringify([
            randomElement(['Web Development', 'Algorithms & Data Structures', 'Database Systems']),
            randomElement(['Machine Learning', 'Software Engineering', 'Systems Programming'])
          ]),
          profile.technical_skills || 'Python, Java, C++',
          profile.relevant_coursework || 'CPSC 110, CPSC 121, CPSC 210',
          profile.overall_gpa || randomGPA(),
          profile.expected_graduation || '2026-05-01',
          profile.weekly_availability || 'Flexible schedule',
          profile.teaching_experience || 'Some tutoring experience'
        ]
      );
      
      if (result.rows[0]) {
        this.applicationIds.push(Number(result.rows[0].application_id));
        this.trackInsert('ta_applications');
      }
    } catch (error) {
      this.trackError('ta_applications', error, { email });
    }
  }
}

  // 10. Insert Application Rankings
  async insertApplicationRankings(): Promise<void> {
    console.log('📊 Inserting application rankings...');
    
    if (this.applicationIds.length === 0) {
      this.trackError('applicationrankings', 'No applications found to create rankings for');
      return;
    }
    
    if (this.courseIds.length === 0) {
      this.trackError('applicationrankings', 'No courses found to rank');
      return;
    }
    
    for (const applicationId of this.applicationIds) {
      try {
        // Each applicant ranks 3-5 courses
        const numRankings = Math.min(randomInt(3, 5), this.courseIds.length);
        const rankedCourses = new Set<number>();
        
        for (let rank = 1; rank <= numRankings; rank++) {
          let courseId: number;
          let attempts = 0;
          do {
            courseId = randomElement(this.courseIds);
            attempts++;
          } while (rankedCourses.has(courseId) && attempts < 10);
          
          if (attempts >= 10) {
            console.log(`  ⚠️  Could not find unique course for ranking`);
            continue;
          }
          
          rankedCourses.add(courseId);
          
          await this.db.query(
            `INSERT INTO applicationrankings (application_id, course_id, rank) 
             VALUES ($1, $2, $3) 
             ON CONFLICT DO NOTHING`,
            [applicationId, courseId, rank]
          );
          this.trackInsert('applicationrankings');
        }
      } catch (error) {
        this.trackError('applicationrankings', error, { applicationId });
      }
    }
  }

  // 11. Insert TA Needs
  async insertTANeeds(): Promise<void> {
    console.log('📋 Inserting TA needs...');
    
    if (this.courseIds.length === 0) {
      this.trackError('ta_needs', 'No courses found to create TA needs for');
      return;
    }
    
    for (const courseId of this.courseIds) {
      try {
        await this.db.query(
          `INSERT INTO ta_needs (course_id, hours_required, status, qualifications, lab_tutorial_skills) 
          VALUES ($1, $2, $3, $4, $5) 
          ON CONFLICT DO NOTHING`,
          [
            courseId,
            randomInt(30, 120), // hours_required instead of num_required
            randomElement(['open', 'filled', 'cancelled']),
            'Strong understanding of course material, excellent communication skills',
            'Experience with lab demonstrations, debugging assistance'
          ]
        );
        this.trackInsert('ta_needs');
      } catch (error) {
        this.trackError('ta_needs', error, { courseId });
      }
    }
  }

  // 12. Insert TA Allocations
  async insertTAAllocations(): Promise<void> {
    console.log('✅ Inserting TA allocations...');
    
    try {
      const approvedApplications = await this.db.query(
        `SELECT application_id, user_id FROM ta_applications WHERE status = 'approved'`
      );
      
      if (approvedApplications.rows.length === 0) {
        console.log('  ⚠️  No approved applications found for allocations');
        return;
      }
      
      const allocatedTAs = new Set<string>();
      
      for (const app of approvedApplications.rows) {
        try {
          // Get course rankings for this application
          const rankings = await this.db.query(
            `SELECT course_id, rank FROM applicationrankings 
             WHERE application_id = $1 
             ORDER BY rank`,
            [app.application_id]
          );
          
          if (rankings.rows.length === 0) {
            console.log(`  ⚠️  No rankings found for application ${app.application_id}`);
            continue;
          }
          
          // Try to allocate to one of their ranked courses
          let allocated = false;
          for (const ranking of rankings.rows) {
            const allocationKey = `${ranking.course_id}-${app.user_id}`;
            
            if (!allocatedTAs.has(allocationKey)) {
              const taCoordinatorId = this.userIds['ta.coordinator@ubc.ca'];
              if (!taCoordinatorId) {
                this.trackError('ta_allocations', 'TA Coordinator not found');
                continue;
              }
              
      const ta_allocations = await this.db.query(`
        INSERT INTO ta_allocations (course_id, user_id, allocated_at, allocated_by, status) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (course_id, user_id) DO NOTHING`,
        [
          ranking.course_id,
          app.user_id,
          new Date().toISOString(),
          taCoordinatorId,
          'active'
        ]
      );
      
      allocatedTAs.add(allocationKey);
      this.trackInsert('ta_allocations');
              
              // Update application status
              await this.db.query(
                `UPDATE ta_applications SET status = 'allocated' WHERE application_id = $1`,
                [app.application_id]
              );
              
              allocated = true;
              break; // Only allocate to one course per TA
            }
          }
          
          if (!allocated) {
            console.log(`  ⚠️  Could not allocate TA for application ${app.application_id}`);
          }
        } catch (error) {
          this.trackError('ta_allocations', error, { applicationId: app.application_id });
        }
      }
    } catch (error) {
      this.trackError('ta_allocations', error);
    }
  }

  // 13. Insert Professor References
  async insertProfessorReferences(): Promise<void> {
    console.log('📜 Inserting professor references...');
    
    const studentEmails = Object.keys(this.userIds).filter(email => email.includes('student'));
    const sampleStudents = studentEmails.slice(0, 10); // First 10 students have references
    
    if (sampleStudents.length === 0) {
      this.trackError('professor_references', 'No students found to create references for');
      return;
    }
    
    for (const email of sampleStudents) {
      try {
        const userId = this.userIds[email];
        const referenceEmail = `prof.${randomInt(100, 999)}@ubc.ca`;
        
        await this.db.query(
          `INSERT INTO professor_references (user_id, reference_name, reference_email, reference_letter_url) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (user_id, reference_email) DO NOTHING`,
          [
            userId,
            randomElement(['Dr. Jane Smith', 'Prof. John Doe', 'Dr. Emily Brown', 'Prof. Michael Chen']),
            referenceEmail,
            `/references/${userId}_reference.pdf`
          ]
        );
        this.trackInsert('professor_references');
      } catch (error) {
        this.trackError('professor_references', error, { email });
      }
    }
  }

  // 14. Insert Notifications
  async insertNotifications(): Promise<void> {
    console.log('🔔 Inserting notifications...');
    
    const notificationTypes = [
      { type: 'application_submitted', title: 'Application Submitted', message: 'Your TA application has been submitted successfully.' },
      { type: 'application_accepted', title: 'Application Accepted', message: 'Congratulations! Your TA application has been accepted.' },
      { type: 'allocation_confirmed', title: 'TA Allocation Confirmed', message: 'You have been allocated as a TA for CPSC 110.' },
      { type: 'deadline_reminder', title: 'Application Deadline', message: 'TA applications close in 3 days.' }
    ];
    
    // Create notifications for some users
    const sampleUsers = Object.values(this.userIds).slice(0, 10);
    
    for (const userId of sampleUsers) {
      try {
        const notification = randomElement(notificationTypes);
        
        await this.db.query(
          `INSERT INTO notifications (
            user_id, type, title, message, email_sent
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            notification.type,
            notification.title,
            notification.message,
            false
          ]
        );
        this.trackInsert('notifications');
      } catch (error) {
        this.trackError('notifications', error, { userId });
      }
    }
  }

  // 15. Insert Notification Preferences
  async insertNotificationPreferences(): Promise<void> {
    console.log('⚙️ Inserting notification preferences...');
    
    for (const userId of Object.values(this.userIds)) {
      try {
        await this.db.query(
          `INSERT INTO user_notification_preferences (
            user_id, email_notifications, in_app_notifications,
            deadline_reminders, application_updates, allocation_updates,
            reminder_days_before
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id) DO NOTHING`,
          [
            userId,
            true,
            true,
            Math.random() > 0.3, // 70% want deadline reminders
            true,
            true,
            randomInt(1, 7)
          ]
        );
        this.trackInsert('user_notification_preferences');
      } catch (error) {
        this.trackError('user_notification_preferences', error, { userId });
      }
    }
  }

  // Data verification with detailed counts
  async verifyData(): Promise<void> {
    console.log('\n🔍 Verifying loaded data...');
    
    const tables = [
      'departments',
      'users',
      'terms',
      'course_templates',
      'courses',
      'student_profiles',
      'ta_applications',
      'applicationrankings',
      'ta_needs',
      'ta_allocations',
      'professor_references',
      'notifications',
      'user_notification_preferences'
    ];
    
    for (const table of tables) {
      try {
        const result = await this.db.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = Number(result.rows[0].count);
        const inserted = this.insertCounts[table] || 0;
        
        console.log(`- ${table}: ${count} records (inserted ${inserted} in this run)`);
      } catch (error) {
        console.error(`- ${table}: Error counting records:`, error);
      }
    }
    
    // Show error summary if any
    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered during data loading:');
      const errorsByTable = this.errors.reduce((acc, err) => {
        acc[err.table] = (acc[err.table] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      for (const [table, count] of Object.entries(errorsByTable)) {
        console.log(`- ${table}: ${count} error(s)`);
      }
      
      console.log('\nFirst 5 errors for debugging:');
      this.errors.slice(0, 5).forEach((err, i) => {
        console.log(`${i + 1}. ${err.table}: ${err.error}`);
        if (err.details) {
          console.log(`   Details:`, err.details);
        }
      });
    }
  }

  // Main method to load all dummy data
  async loadAll(): Promise<void> {
  console.log('🚀 Starting dummy data load...');
  
  try {
    // Load existing user IDs first
    await this.loadExistingUserIds();
    
    // Reset sequences first to prevent conflicts
    await this.resetSequences();
    
    // Load in dependency order
    await this.insertDepartments();
    await this.insertTerms();
    await this.insertUsers();
    await this.insertUserProfiles();
    await this.insertCourseTemplates();
    
    // Ensure we have course template IDs loaded
    if (this.courseTemplateIds.length === 0) {
      await this.loadExistingCourseTemplateIds();
    }
    
    await this.insertCourses();
    
    // Ensure we have course IDs loaded for subsequent operations
    if (this.courseIds.length === 0) {
      console.log('  ⚠️  Loading existing course IDs for subsequent operations...');
      try {
        const existingCourses = await this.db.query(
          `SELECT course_id FROM courses ORDER BY course_id`
        );
        this.courseIds = existingCourses.rows.map(row => Number(row.course_id));
        console.log(`  ✅ Loaded ${this.courseIds.length} existing course IDs`);
      } catch (error) {
        console.error('Error loading existing course IDs:', error);
      }
    }
    
    await this.insertStudentProfiles();
    await this.insertTAApplications();
    await this.insertApplicationRankings();
    await this.insertTANeeds();
    await this.insertTAAllocations();
    await this.insertProfessorReferences();
    await this.insertNotifications();
    await this.insertNotificationPreferences();
    
    console.log('\n📊 Data Summary:');
    console.log(`- Users: ${Object.keys(this.userIds).length}`);
    console.log(`- Departments: ${this.deptIds.length}`);
    console.log(`- Terms: ${this.termIds.length}`);
    console.log(`- Course Templates: ${this.courseTemplateIds.length}`);
    console.log(`- Courses: ${this.courseIds.length}`);
    console.log(`- Lab Sections: ${this.labSectionIds.length}`);
    console.log(`- TA Applications: ${this.applicationIds.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error during data load:', error);
    throw error;
  }
}}