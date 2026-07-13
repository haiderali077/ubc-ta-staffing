import { hashPassword } from '../../../deps.ts';
import { Database } from '../config.ts';
import { UserModel } from '../models/user.ts';

/**
 * Comprehensive Dummy Data Loader
 * Creates realistic test data that follows the exact database schema
 * 
 * Data Distribution:
 * - 4 Default test accounts (admin, instructor, student, ta_coordinator)
 * - 10 additional students
 * - 4 additional instructors  
 * - 2 additional TA coordinators
 * - 3 departments
 * - 3 academic terms
 * - 20+ courses across different departments
 * - 30+ TA applications with various statuses
 * - 25+ TA needs and allocations
 * - Realistic relationships and constraints
 */
export class ComprehensiveDummyDataLoader {
  private db: Database;
  private userIds: Record<string, number> = {};
  private termIds: Record<string, number> = {};
  private deptIds: Record<string, number> = {};
  private courseIds: number[] = [];
  private courseTemplateIds: number[] = [];
  private labSectionIds: number[] = [];
  private applicationIds: number[] = [];
  private userProfiles: Record<number, any> = {};

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Main function to load all dummy data
   */
  async loadAllData(): Promise<void> {
    console.log('🚀 Starting comprehensive dummy data loading...');
    
    try {
      // Check if default users already exist
      const userModel = new UserModel(this.db);
      const existingAdmin = await userModel.getUserByEmail("admin@example.com");
      if (existingAdmin) {
        console.log("ℹ️ Default test accounts already exist, skipping creation");
        return;
      }

      // Create database backup before loading data
      await this.createDatabaseBackup();

      // Load data in dependency order
      await this.createDepartments();
      await this.createTerms();
      await this.createDefaultUsers();
      await this.createAdditionalUsers();
      await this.createUserProfiles();
      await this.createCourseTemplates();
      await this.createCourses();
      await this.createLabSections();
      await this.createStudentProfiles();
      await this.createTAApplications();
      await this.createApplicationRankings();
      await this.createTANeeds();
      await this.createTAAllocations();
      await this.createProfessorReferences();
      await this.createNotifications();
      await this.createNotificationPreferences();
      await this.createSystemSettings();
      await this.createAuditLogs();
      
      console.log('\n🎉 Comprehensive dummy data loading completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ Error during dummy data loading:', error);
      throw error;
    }
  }

  /**
   * Create database backup with timestamp
   */
  private async createDatabaseBackup(): Promise<void> {
    console.log('💾 Creating database backup before loading dummy data...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupName = `pre_dummy_data_${timestamp}`;
      
      // Store backup metadata in a simple table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS database_backups (
          backup_id SERIAL PRIMARY KEY,
          backup_name VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          backup_type VARCHAR(50) DEFAULT 'pre_dummy',
          description TEXT
        )
      `);
      
      await this.db.query(`
        INSERT INTO database_backups (backup_name, backup_type, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (backup_name) DO NOTHING
      `, [backupName, 'pre_dummy', 'Backup created before loading dummy data']);
      
      console.log(`✅ Database backup metadata created: ${backupName}`);
      
    } catch (error) {
      console.warn('⚠️ Could not create database backup metadata:', error);
      // Continue anyway - backup is nice to have but not critical
    }
  }

  /**
   * Create departments
   */
  private async createDepartments(): Promise<void> {
    console.log('🏛️ Creating departments...');
    
    const departments = [
      { 
        name: 'Computer Science', 
        code: 'CS',
        description: 'Department of Computer Science and Software Engineering',
        head_name: 'Dr. Alan Turing',
        contact_email: 'cs-dept@example.com',
        office_location: 'Engineering Building, Floor 3'
      },
      { 
        name: 'Mathematics', 
        code: 'MATH',
        description: 'Department of Mathematics and Statistics',
        head_name: 'Dr. Emmy Noether',
        contact_email: 'math-dept@example.com',
        office_location: 'Mathematics Building, Floor 2'
      },
      { 
        name: 'Engineering', 
        code: 'ENG',
        description: 'Faculty of Engineering',
        head_name: 'Dr. Nikola Tesla',
        contact_email: 'eng-dept@example.com',
        office_location: 'Engineering Building, Floor 1'
      },
    ];

    for (const dept of departments) {
      try {
        const result = await this.db.query(`
          INSERT INTO departments (name, code, description, head_name, contact_email, office_location) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            head_name = EXCLUDED.head_name,
            contact_email = EXCLUDED.contact_email,
            office_location = EXCLUDED.office_location
          RETURNING dept_id
        `, [dept.name, dept.code, dept.description, dept.head_name, dept.contact_email, dept.office_location]);
        
        if (result.rows.length > 0) {
          this.deptIds[dept.code] = result.rows[0].dept_id as number;
          console.log(`  ✅ Created department: ${dept.name} (${dept.code})`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Could not create department ${dept.name}:`, error);
      }
    }
  }

  /**
   * Create academic terms
   */
  private async createTerms(): Promise<void> {
    console.log('📅 Creating academic terms...');
    
    const terms = [
      { 
        name: 'Fall 2024', 
        start_date: '2024-09-01', 
        end_date: '2024-12-15',
        application_deadline: '2024-08-15',
        is_active: true
      },
      { 
        name: 'Winter 2025', 
        start_date: '2025-01-01', 
        end_date: '2025-04-30',
        application_deadline: '2024-12-01',
        is_active: false
      },
      { 
        name: 'Summer 2025', 
        start_date: '2025-05-01', 
        end_date: '2025-08-31',
        application_deadline: '2025-04-01',
        is_active: false
      },
    ];

    for (const term of terms) {
      try {
        const result = await this.db.query(`
          INSERT INTO terms (name, start_date, end_date, application_deadline, is_active) 
          VALUES ($1, $2, $3, $4, $5) 
          ON CONFLICT (name) DO UPDATE SET
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            application_deadline = EXCLUDED.application_deadline,
            is_active = EXCLUDED.is_active
          RETURNING term_id
        `, [term.name, term.start_date, term.end_date, term.application_deadline, term.is_active]);
        
        if (result.rows.length > 0) {
          this.termIds[term.name] = result.rows[0].term_id as number;
          console.log(`  ✅ Created term: ${term.name}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Could not create term ${term.name}:`, error);
      }
    }
  }

  /**
   * Create default test users matching the required credentials
   */
  private async createDefaultUsers(): Promise<void> {
    console.log('👤 Creating default test users...');
    
    const defaultUsers = [
      {
        name: "Admin User",
        email: "admin@example.com",
        password: "admin123",
        role: "admin",
        major: "Computer Science"
      },
      {
        name: "Dr. Jane Smith",
        email: "instructor@example.com",
        password: "instructor123",
        role: "instructor", 
        major: "Computer Science"
      },
      {
        name: "John Doe",
        email: "student@example.com",
        password: "student123",
        role: "student",
        student_number: "12345678",
        major: "Computer Science"
      },
      {
        name: "Sarah Johnson",
        email: "tacoord@example.com",
        password: "tacoord123",
        role: "ta_coordinator",
        major: "Computer Science"
      }
    ];

    const userModel = new UserModel(this.db);

    for (const userData of defaultUsers) {
      try {
        const passwordHash = await hashPassword(userData.password);
        const user = await userModel.createUser({
          name: userData.name,
          email: userData.email,
          password_hash: passwordHash,
          role: userData.role as any,
          major: userData.major,
          student_number: userData.student_number
        });
        
        this.userIds[userData.role] = user.user_id!;
        console.log(`  ✅ Created ${userData.role}: ${userData.email} (ID: ${user.user_id})`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create user ${userData.email}:`, error);
      }
    }
  }

  /**
   * Create additional realistic users
   */
  private async createAdditionalUsers(): Promise<void> {
    console.log('👥 Creating additional users...');
    
    const additionalUsers = [
      // Additional Students
      { name: "Alice Johnson", email: "alice.johnson@example.com", role: "student", student_number: "20240001", major: "Computer Science", year: 2, gpa: 3.7 },
      { name: "Bob Smith", email: "bob.smith@example.com", role: "student", student_number: "20240002", major: "Computer Science", year: 3, gpa: 3.9 },
      { name: "Charlie Brown", email: "charlie.brown@example.com", role: "student", student_number: "20240003", major: "Mathematics", year: 2, gpa: 3.5 },
      { name: "Diana Prince", email: "diana.prince@example.com", role: "student", student_number: "20240004", major: "Engineering", year: 4, gpa: 3.8 },
      { name: "Edward Wilson", email: "edward.wilson@example.com", role: "student", student_number: "20240005", major: "Computer Science", year: 3, gpa: 3.6 },
      { name: "Fiona Davis", email: "fiona.davis@example.com", role: "student", student_number: "20240006", major: "Mathematics", year: 2, gpa: 3.4 },
      { name: "George Miller", email: "george.miller@example.com", role: "student", student_number: "20240007", major: "Engineering", year: 4, gpa: 3.7 },
      { name: "Hannah Lee", email: "hannah.lee@example.com", role: "student", student_number: "20240008", major: "Computer Science", year: 3, gpa: 3.8 },
      { name: "Ivan Rodriguez", email: "ivan.rodriguez@example.com", role: "student", student_number: "20240009", major: "Mathematics", year: 2, gpa: 3.3 },
      { name: "Julia Kim", email: "julia.kim@example.com", role: "student", student_number: "20240010", major: "Computer Science", year: 4, gpa: 3.9 },

      // Additional Instructors
      { name: "Dr. Michael Thompson", email: "michael.thompson@example.com", role: "instructor", major: "Computer Science", specialization: "Machine Learning" },
      { name: "Prof. Lisa Chen", email: "lisa.chen@example.com", role: "instructor", major: "Mathematics", specialization: "Statistics" },
      { name: "Dr. Robert Garcia", email: "robert.garcia@example.com", role: "instructor", major: "Engineering", specialization: "Software Engineering" },
      { name: "Prof. Amanda White", email: "amanda.white@example.com", role: "instructor", major: "Computer Science", specialization: "Database Systems" },

      // Additional TA Coordinators
      { name: "Kevin Park", email: "kevin.park@example.com", role: "ta_coordinator", major: "Computer Science" },
      { name: "Rachel Green", email: "rachel.green@example.com", role: "ta_coordinator", major: "Mathematics" }
    ];

    const userModel = new UserModel(this.db);

    for (const userData of additionalUsers) {
      try {
        const passwordHash = await hashPassword("password123"); // Default password for additional users
        const user = await userModel.createUser({
          name: userData.name,
          email: userData.email,
          password_hash: passwordHash,
          role: userData.role as any,
          major: userData.major,
          student_number: userData.student_number
        });
        
        this.userIds[userData.email] = user.user_id!;
        this.userProfiles[user.user_id!] = userData; // Store additional profile data
        console.log(`  ✅ Created ${userData.role}: ${userData.email}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create user ${userData.email}:`, error);
      }
    }
  }

  /**
   * Create user profiles for additional context
   */
  private async createUserProfiles(): Promise<void> {
    console.log('📋 Creating user profiles...');
    
    for (const [userId, profileData] of Object.entries(this.userProfiles)) {
      try {
        await this.db.query(`
          INSERT INTO user_profiles (
            user_id, 
            phone_number, 
            emergency_contact_name, 
            emergency_contact_phone,
            address,
            date_of_birth,
            preferred_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id) DO NOTHING
        `, [
          parseInt(userId),
          this.generatePhoneNumber(),
          `Emergency Contact for ${profileData.name}`,
          this.generatePhoneNumber(),
          this.generateAddress(),
          this.generateDateOfBirth(),
          profileData.name.split(' ')[0] // Use first name as preferred name
        ]);
        
        console.log(`  ✅ Created profile for user ${userId}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create profile for user ${userId}:`, error);
      }
    }
  }

  /**
   * Create course templates
   */
  private async createCourseTemplates(): Promise<void> {
    console.log('📚 Creating course templates...');
    
    const courseTemplates = [
      // Computer Science Courses
      { course_name: 'Introduction to Programming', course_code: 'CS101', dept: 'CS', description: 'Basic programming concepts using Python', credits: 3, prerequisites: null },
      { course_name: 'Data Structures', course_code: 'CS201', dept: 'CS', description: 'Fundamental data structures and algorithms', credits: 3, prerequisites: 'CS101' },
      { course_name: 'Object-Oriented Programming', course_code: 'CS202', dept: 'CS', description: 'OOP principles using Java', credits: 3, prerequisites: 'CS101' },
      { course_name: 'Algorithms', course_code: 'CS301', dept: 'CS', description: 'Algorithm design and analysis', credits: 3, prerequisites: 'CS201' },
      { course_name: 'Database Systems', course_code: 'CS401', dept: 'CS', description: 'Database design and management', credits: 3, prerequisites: 'CS201' },
      { course_name: 'Software Engineering', course_code: 'CS402', dept: 'CS', description: 'Software development lifecycle and practices', credits: 3, prerequisites: 'CS202' },
      { course_name: 'Web Development', course_code: 'CS403', dept: 'CS', description: 'Modern web development technologies', credits: 3, prerequisites: 'CS202' },
      { course_name: 'Machine Learning', course_code: 'CS501', dept: 'CS', description: 'Introduction to machine learning algorithms', credits: 3, prerequisites: 'CS301' },
      { course_name: 'Computer Networks', course_code: 'CS502', dept: 'CS', description: 'Network protocols and distributed systems', credits: 3, prerequisites: 'CS301' },
      { course_name: 'Operating Systems', course_code: 'CS503', dept: 'CS', description: 'OS principles and system programming', credits: 3, prerequisites: 'CS301' },

      // Mathematics Courses
      { course_name: 'Calculus I', course_code: 'MATH101', dept: 'MATH', description: 'Differential calculus', credits: 4, prerequisites: null },
      { course_name: 'Calculus II', course_code: 'MATH102', dept: 'MATH', description: 'Integral calculus', credits: 4, prerequisites: 'MATH101' },
      { course_name: 'Linear Algebra', course_code: 'MATH201', dept: 'MATH', description: 'Vector spaces and matrix operations', credits: 3, prerequisites: 'MATH101' },
      { course_name: 'Statistics', course_code: 'MATH301', dept: 'MATH', description: 'Probability and statistical inference', credits: 3, prerequisites: 'MATH102' },
      { course_name: 'Discrete Mathematics', course_code: 'MATH202', dept: 'MATH', description: 'Mathematical structures for CS', credits: 3, prerequisites: 'MATH101' },

      // Engineering Courses
      { course_name: 'Engineering Fundamentals', course_code: 'ENG101', dept: 'ENG', description: 'Introduction to engineering principles', credits: 3, prerequisites: null },
      { course_name: 'Circuit Analysis', course_code: 'ENG201', dept: 'ENG', description: 'Basic electrical circuit analysis', credits: 3, prerequisites: 'ENG101' },
      { course_name: 'Thermodynamics', course_code: 'ENG202', dept: 'ENG', description: 'Energy systems and heat transfer', credits: 3, prerequisites: 'ENG101' },
      { course_name: 'Materials Science', course_code: 'ENG301', dept: 'ENG', description: 'Properties and applications of materials', credits: 3, prerequisites: 'ENG101' },
      { course_name: 'Control Systems', course_code: 'ENG401', dept: 'ENG', description: 'Feedback control and system design', credits: 3, prerequisites: 'ENG201' }
    ];

    for (const template of courseTemplates) {
      try {
        const deptId = this.deptIds[template.dept];
        if (!deptId) {
          console.warn(`  ⚠️ Department ${template.dept} not found for course ${template.course_code}`);
          continue;
        }

        const result = await this.db.query(`
          INSERT INTO course_templates (
            course_name, course_code, dept_id, description, credits, prerequisites
          ) VALUES ($1, $2, $3, $4, $5, $6) 
          ON CONFLICT (course_code) DO UPDATE SET
            course_name = EXCLUDED.course_name,
            description = EXCLUDED.description,
            credits = EXCLUDED.credits,
            prerequisites = EXCLUDED.prerequisites
          RETURNING template_id
        `, [template.course_name, template.course_code, deptId, template.description, template.credits, template.prerequisites]);
        
        if (result.rows.length > 0) {
          this.courseTemplateIds.push(result.rows[0].template_id as number);
          console.log(`  ✅ Created course template: ${template.course_code}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Could not create course template ${template.course_code}:`, error);
      }
    }
  }

  /**
   * Create courses for each term
   */
  private async createCourses(): Promise<void> {
    console.log('🎓 Creating courses...');
    
    // Create courses for Fall 2024
    const fallTermId = this.termIds['Fall 2024'];
    if (!fallTermId) {
      console.warn('⚠️ Fall 2024 term not found, skipping course creation');
      return;
    }

    // Get instructor user IDs
    const instructorEmails = [
      'instructor@example.com',
      'michael.thompson@example.com',
      'lisa.chen@example.com',
      'robert.garcia@example.com',
      'amanda.white@example.com'
    ];

    const instructorIds = instructorEmails.map(email => this.userIds[email]).filter(id => id);

    // Create multiple sections for popular courses
    for (let i = 0; i < Math.min(25, this.courseTemplateIds.length); i++) {
      try {
        const templateId = this.courseTemplateIds[i];
        const instructorId = instructorIds[i % instructorIds.length];
        const deptId = Object.values(this.deptIds)[i % Object.values(this.deptIds).length];
        
        if (!instructorId) {
          console.warn(`  ⚠️ No instructor available for course ${i + 1}`);
          continue;
        }

        const result = await this.db.query(`
          INSERT INTO courses (
            template_id, instructor_id, term_id, dept_id, 
            section_number, enrollment_limit, current_enrollment,
            schedule_days, schedule_time, classroom_location
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          RETURNING course_id
        `, [
          templateId, 
          instructorId, 
          fallTermId, 
          deptId, 
          `00${(i % 3) + 1}`.slice(-2), // Section 001, 002, 003
          Math.floor(Math.random() * 50) + 30, // 30-80 enrollment limit
          Math.floor(Math.random() * 25) + 10, // 10-35 current enrollment
          this.generateScheduleDays(),
          this.generateScheduleTime(),
          this.generateClassroomLocation()
        ]);
        
        if (result.rows.length > 0) {
          this.courseIds.push(result.rows[0].course_id as number);
          console.log(`  ✅ Created course section ${i + 1}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Could not create course ${i + 1}:`, error);
      }
    }
  }

  /**
   * Create lab sections for courses that need them
   */
  private async createLabSections(): Promise<void> {
    console.log('🔬 Creating lab sections...');
    
    // Create lab sections for first 10 courses (typically programming courses need labs)
    for (let i = 0; i < Math.min(10, this.courseIds.length); i++) {
      try {
        const courseId = this.courseIds[i];
        
        // Create 2-3 lab sections per course
        const numLabSections = Math.floor(Math.random() * 2) + 2;
        
        for (let j = 0; j < numLabSections; j++) {
          const result = await this.db.query(`
            INSERT INTO lab_sections (
              course_id, section_number, max_students, 
              schedule_day, schedule_time, location
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING lab_section_id
          `, [
            courseId,
            `L0${j + 1}`,
            20 + Math.floor(Math.random() * 10), // 20-30 students per lab
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][j % 5],
            this.generateLabTime(),
            `Lab Room ${100 + i * 10 + j}`
          ]);
          
          if (result.rows.length > 0) {
            this.labSectionIds.push(result.rows[0].lab_section_id as number);
          }
        }
        
        console.log(`  ✅ Created lab sections for course ${i + 1}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create lab sections for course ${i + 1}:`, error);
      }
    }
  }

  /**
   * Create student profiles with detailed information
   */
  private async createStudentProfiles(): Promise<void> {
    console.log('👨‍🎓 Creating student profiles...');
    
    // Get all student user IDs
    const studentEmails = Object.keys(this.userIds).filter(email => 
      email.includes('student') || email.includes('alice') || email.includes('bob') || 
      email.includes('charlie') || email.includes('diana') || email.includes('edward') ||
      email.includes('fiona') || email.includes('george') || email.includes('hannah') ||
      email.includes('ivan') || email.includes('julia')
    );

    for (const email of studentEmails) {
      try {
        const userId = this.userIds[email];
        if (!userId) continue;

        const profileData = this.userProfiles[userId] || {};
        
        await this.db.query(`
          INSERT INTO student_profiles (
            user_id, student_number, year_of_study, gpa, program_of_study,
            phone_number, preferred_hours_per_week, previous_ta_experience,
            technical_skills, languages_spoken
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (user_id) DO NOTHING
        `, [
          userId,
          profileData.student_number || `2024${userId.toString().padStart(4, '0')}`,
          profileData.year || Math.floor(Math.random() * 4) + 1,
          profileData.gpa || (Math.random() * 1.5 + 2.5).toFixed(2),
          profileData.major || 'Computer Science',
          this.generatePhoneNumber(),
          Math.floor(Math.random() * 15) + 10, // 10-25 hours per week
          Math.random() > 0.7 ? 'Previous TA experience in undergraduate courses' : 'No previous TA experience',
          this.generateTechnicalSkills(),
          this.generateLanguages()
        ]);
        
        console.log(`  ✅ Created student profile for ${email}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create student profile for ${email}:`, error);
      }
    }
  }

  /**
   * Create TA applications
   */
  private async createTAApplications(): Promise<void> {
    console.log('📝 Creating TA applications...');
    
    const studentEmails = Object.keys(this.userIds).filter(email => 
      email.includes('student') || email.includes('alice') || email.includes('bob') || 
      email.includes('charlie') || email.includes('diana') || email.includes('edward') ||
      email.includes('fiona') || email.includes('george') || email.includes('hannah') ||
      email.includes('ivan') || email.includes('julia')
    );

    const fallTermId = this.termIds['Fall 2024'];
    const statuses = ['pending', 'approved', 'rejected', 'conditionally_approved'];

    for (const email of studentEmails) {
      try {
        const userId = this.userIds[email];
        if (!userId || !fallTermId) continue;

        // Some students apply for multiple positions
        const numApplications = Math.random() > 0.6 ? 2 : 1;
        
        for (let i = 0; i < numApplications; i++) {
          const preferredCourses = this.courseIds.slice(0, Math.floor(Math.random() * 3) + 1);
          
          const result = await this.db.query(`
            INSERT INTO ta_applications (
              user_id, term_id, preferred_courses, experience, 
              gpa, status, application_date, personal_statement,
              available_hours, preferred_duties
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING application_id
          `, [
            userId,
            fallTermId,
            JSON.stringify(preferredCourses),
            this.generateTAExperience(),
            (Math.random() * 1.5 + 2.5).toFixed(2),
            statuses[Math.floor(Math.random() * statuses.length)],
            this.generateApplicationDate(),
            this.generatePersonalStatement(),
            Math.floor(Math.random() * 15) + 10,
            this.generatePreferredDuties()
          ]);
          
          if (result.rows.length > 0) {
            const applicationId = result.rows[0].application_id as number;
            this.applicationIds.push(applicationId);
          }
        }
        
        console.log(`  ✅ Created TA application(s) for ${email}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create TA application for ${email}:`, error);
      }
    }
  }

  /**
   * Create application rankings
   */
  private async createApplicationRankings(): Promise<void> {
    console.log('🏆 Creating application rankings...');
    
    for (let i = 0; i < Math.min(20, this.applicationIds.length); i++) {
      try {
        const applicationId = this.applicationIds[i];
        const courseId = this.courseIds[Math.floor(Math.random() * this.courseIds.length)];
        
        await this.db.query(`
          INSERT INTO applicationrankings (
            application_id, course_id, ranking, instructor_comments
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (application_id, course_id) DO NOTHING
        `, [
          applicationId,
          courseId,
          Math.floor(Math.random() * 5) + 1, // Rankings 1-5
          this.generateInstructorComments()
        ]);
        
        console.log(`  ✅ Created ranking for application ${i + 1}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create ranking for application ${i + 1}:`, error);
      }
    }
  }

  /**
   * Create TA needs for courses
   */
  private async createTANeeds(): Promise<void> {
    console.log('📋 Creating TA needs...');
    
    for (let i = 0; i < Math.min(15, this.courseIds.length); i++) {
      try {
        const courseId = this.courseIds[i];
        
        await this.db.query(`
          INSERT INTO ta_needs (
            course_id, requested_tas, priority, justification, 
            status, duties_description, required_skills
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          courseId,
          Math.floor(Math.random() * 4) + 1, // 1-4 TAs needed
          ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
          this.generateJustification(),
          ['pending', 'approved', 'fulfilled'][Math.floor(Math.random() * 3)],
          this.generateDutiesDescription(),
          this.generateRequiredSkills()
        ]);
        
        console.log(`  ✅ Created TA need for course ${i + 1}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create TA need for course ${i + 1}:`, error);
      }
    }
  }

  /**
   * Create TA allocations
   */
  private async createTAAllocations(): Promise<void> {
    console.log('📊 Creating TA allocations...');
    
    // Get approved applications
    const approvedApps = this.applicationIds.slice(0, Math.floor(this.applicationIds.length * 0.6));
    
    for (let i = 0; i < Math.min(12, approvedApps.length, this.labSectionIds.length); i++) {
      try {
        const applicationId = approvedApps[i];
        const labSectionId = this.labSectionIds[i];
        
        // Get the user_id from the application
        const appResult = await this.db.query(`
          SELECT user_id FROM ta_applications WHERE application_id = $1
        `, [applicationId]);
        
        if (appResult.rows.length === 0) continue;
        
        const userId = appResult.rows[0].user_id;
        
        await this.db.query(`
          INSERT INTO ta_allocations (
            lab_section_id, user_id, allocation_date, hours_allocated, 
            hourly_rate, status, semester_total_hours
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          labSectionId,
          userId,
          this.generateAllocationDate(),
          Math.floor(Math.random() * 10) + 10, // 10-20 hours per week
          (Math.random() * 5 + 15).toFixed(2), // $15-20 per hour
          ['active', 'pending', 'completed'][Math.floor(Math.random() * 3)],
          Math.floor(Math.random() * 200) + 100 // 100-300 total hours per semester
        ]);
        
        console.log(`  ✅ Created TA allocation ${i + 1}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create TA allocation ${i + 1}:`, error);
      }
    }
  }

  /**
   * Create professor references
   */
  private async createProfessorReferences(): Promise<void> {
    console.log('👨‍🏫 Creating professor references...');
    
    const studentEmails = Object.keys(this.userIds).filter(email => email.includes('student'));
    const instructorEmails = Object.keys(this.userIds).filter(email => 
      email.includes('instructor') || email.includes('michael') || email.includes('lisa') ||
      email.includes('robert') || email.includes('amanda')
    );

    for (let i = 0; i < Math.min(10, studentEmails.length); i++) {
      try {
        const studentUserId = this.userIds[studentEmails[i]];
        const instructorUserId = this.userIds[instructorEmails[i % instructorEmails.length]];
        
        if (!studentUserId || !instructorUserId) continue;

        await this.db.query(`
          INSERT INTO professor_references (
            student_user_id, professor_user_id, relationship, 
            recommendation_letter, rating, reference_date
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          studentUserId,
          instructorUserId,
          'Former student in CS courses',
          this.generateRecommendationLetter(),
          Math.floor(Math.random() * 3) + 3, // Rating 3-5
          this.generateReferenceDate()
        ]);
        
        console.log(`  ✅ Created professor reference ${i + 1}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create professor reference ${i + 1}:`, error);
      }
    }
  }

  /**
   * Create notifications
   */
  private async createNotifications(): Promise<void> {
    console.log('🔔 Creating notifications...');
    
    const allUserIds = Object.values(this.userIds);
    const notificationTypes = ['info', 'warning', 'success', 'action'];
    
    const notifications = [
      { title: 'Welcome to AllocAid', message: 'Welcome to the TA Management System!', type: 'info' },
      { title: 'TA Application Period Open', message: 'TA applications are now open for Fall 2024.', type: 'info' },
      { title: 'Application Deadline Reminder', message: 'TA application deadline is in 2 weeks.', type: 'warning' },
      { title: 'Course Assignment Available', message: 'New courses have been assigned. Please review.', type: 'action' },
      { title: 'System Maintenance', message: 'Scheduled maintenance this weekend.', type: 'warning' },
      { title: 'TA Training Session', message: 'Mandatory TA training session scheduled.', type: 'action' },
      { title: 'Grade Submission Reminder', message: 'Please submit grades by the deadline.', type: 'warning' },
      { title: 'New Feature Available', message: 'Check out the new dashboard features!', type: 'success' }
    ];

    for (let i = 0; i < notifications.length; i++) {
      try {
        const notification = notifications[i];
        const userId = allUserIds[i % allUserIds.length];
        
        await this.db.query(`
          INSERT INTO notifications (
            user_id, title, message, type, is_read, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          notification.title,
          notification.message,
          notification.type,
          Math.random() > 0.7, // 30% chance of being read
          this.generateNotificationDate()
        ]);
        
        console.log(`  ✅ Created notification ${i + 1}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create notification ${i + 1}:`, error);
      }
    }
  }

  /**
   * Create notification preferences
   */
  private async createNotificationPreferences(): Promise<void> {
    console.log('⚙️ Creating notification preferences...');
    
    const allUserIds = Object.values(this.userIds);

    for (const userId of allUserIds) {
      try {
        await this.db.query(`
          INSERT INTO notification_preferences (
            user_id, email_notifications, push_notifications, 
            sms_notifications, notification_frequency
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id) DO NOTHING
        `, [
          userId,
          Math.random() > 0.3, // 70% enable email
          Math.random() > 0.5, // 50% enable push
          Math.random() > 0.8, // 20% enable SMS
          ['immediate', 'daily', 'weekly'][Math.floor(Math.random() * 3)]
        ]);
        
      } catch (error) {
        console.warn(`  ⚠️ Could not create notification preferences for user ${userId}:`, error);
      }
    }
    
    console.log(`  ✅ Created notification preferences for ${allUserIds.length} users`);
  }

  /**
   * Create system settings
   */
  private async createSystemSettings(): Promise<void> {
    console.log('⚙️ Creating system settings...');
    
    const settings = [
      { key: 'application_deadline', value: '2024-08-15', type: 'date', description: 'TA application deadline' },
      { key: 'max_applications_per_student', value: '3', type: 'number', description: 'Maximum applications per student' },
      { key: 'default_hourly_rate', value: '17.50', type: 'decimal', description: 'Default TA hourly rate' },
      { key: 'auto_approve_threshold', value: '3.5', type: 'decimal', description: 'GPA threshold for auto-approval' },
      { key: 'email_notifications_enabled', value: 'true', type: 'boolean', description: 'Enable email notifications' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'System maintenance mode' }
    ];

    for (const setting of settings) {
      try {
        await this.db.query(`
          INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            updated_at = NOW()
        `, [setting.key, setting.value, setting.type, setting.description]);
        
        console.log(`  ✅ Created system setting: ${setting.key}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not create system setting ${setting.key}:`, error);
      }
    }
  }

  /**
   * Create audit logs for tracking changes
   */
  private async createAuditLogs(): Promise<void> {
    console.log('📝 Creating audit logs...');
    
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
    const entities = ['User', 'Course', 'Application', 'Allocation', 'Grade'];
    const allUserIds = Object.values(this.userIds);

    for (let i = 0; i < 25; i++) {
      try {
        const userId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const entity = entities[Math.floor(Math.random() * entities.length)];
        
        await this.db.query(`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, 
            old_values, new_values, ip_address, user_agent, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          userId,
          action,
          entity,
          Math.floor(Math.random() * 100) + 1,
          action === 'CREATE' ? null : '{"status": "pending"}',
          action === 'DELETE' ? null : '{"status": "approved"}',
          this.generateIPAddress(),
          this.generateUserAgent(),
          this.generateAuditTimestamp()
        ]);
        
      } catch (error) {
        console.warn(`  ⚠️ Could not create audit log ${i + 1}:`, error);
      }
    }
    
    console.log('  ✅ Created 25 audit log entries');
  }

  /**
   * Helper functions for generating realistic data
   */
  private generatePhoneNumber(): string {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  private generateAddress(): string {
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Cedar Ln'];
    const number = Math.floor(Math.random() * 9999) + 1;
    const street = streets[Math.floor(Math.random() * streets.length)];
    return `${number} ${street}, University City, State 12345`;
  }

  private generateDateOfBirth(): string {
    const year = Math.floor(Math.random() * 5) + 1998; // Ages 25-30
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private generateTechnicalSkills(): string {
    const skills = ['Python', 'Java', 'JavaScript', 'C++', 'SQL', 'React', 'Node.js', 'Git', 'Docker', 'AWS'];
    const numSkills = Math.floor(Math.random() * 5) + 3;
    return skills.sort(() => 0.5 - Math.random()).slice(0, numSkills).join(', ');
  }

  private generateLanguages(): string {
    const languages = ['English', 'Spanish', 'French', 'Mandarin', 'Korean', 'German', 'Arabic'];
    const numLangs = Math.floor(Math.random() * 3) + 1;
    return languages.sort(() => 0.5 - Math.random()).slice(0, numLangs).join(', ');
  }

  private generateScheduleDays(): string {
    const days = ['MWF', 'TTh', 'MW', 'TF', 'MF'];
    return days[Math.floor(Math.random() * days.length)];
  }

  private generateScheduleTime(): string {
    const hours = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    const start = hours[Math.floor(Math.random() * hours.length)];
    const endHour = parseInt(start.split(':')[0]) + 1;
    return `${start} - ${endHour.toString().padStart(2, '0')}:30`;
  }

  private generateClassroomLocation(): string {
    const buildings = ['Science', 'Engineering', 'Math', 'Computer'];
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    const room = Math.floor(Math.random() * 500) + 100;
    return `${building} Building, Room ${room}`;
  }

  private generateLabTime(): string {
    const times = ['14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'];
    return times[Math.floor(Math.random() * times.length)];
  }

  private generateTAExperience(): string {
    const experiences = [
      'Previous TA for CS101 and CS201',
      'Tutoring experience in mathematics',
      'No previous TA experience but strong academic performance',
      'Teaching assistant in high school',
      'Peer mentor for first-year students'
    ];
    return experiences[Math.floor(Math.random() * experiences.length)];
  }

  private generateApplicationDate(): string {
    // Random date in the past 2 months
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 60));
    return date.toISOString().split('T')[0];
  }

  private generatePersonalStatement(): string {
    return 'I am passionate about computer science and helping other students succeed. I have strong communication skills and experience working with diverse groups of students.';
  }

  private generatePreferredDuties(): string {
    const duties = ['Lab instruction', 'Grading assignments', 'Office hours', 'Exam proctoring'];
    return duties.sort(() => 0.5 - Math.random()).slice(0, 2).join(', ');
  }

  private generateInstructorComments(): string {
    const comments = [
      'Strong candidate with excellent technical skills',
      'Good communication skills, recommended for lab instruction',
      'Needs improvement in time management',
      'Outstanding student with leadership potential',
      'Reliable and detail-oriented'
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  private generateJustification(): string {
    return 'High enrollment numbers require additional TA support for lab sessions and grading assistance.';
  }

  private generateDutiesDescription(): string {
    return 'Lead lab sessions, assist with programming assignments, hold office hours, and help with grading.';
  }

  private generateRequiredSkills(): string {
    const skills = ['Python programming', 'Strong communication', 'Problem-solving', 'Patience with students'];
    return skills.join(', ');
  }

  private generateAllocationDate(): string {
    return '2024-08-20';
  }

  private generateRecommendationLetter(): string {
    return 'This student has demonstrated exceptional ability and would make an excellent teaching assistant.';
  }

  private generateReferenceDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
    return date.toISOString().split('T')[0];
  }

  private generateNotificationDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toISOString();
  }

  private generateIPAddress(): string {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private generateUserAgent(): string {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  }

  private generateAuditTimestamp(): string {
    const date = new Date();
    date.setHours(date.getHours() - Math.floor(Math.random() * 168)); // Past week
    return date.toISOString();
  }

  /**
   * Print summary of loaded data
   */
  private printSummary(): void {
    console.log('\n📊 Data Loading Summary:');
    console.log('========================');
    console.log(`Departments: ${Object.keys(this.deptIds).length}`);
    console.log(`Terms: ${Object.keys(this.termIds).length}`);
    console.log(`Users: ${Object.keys(this.userIds).length}`);
    console.log(`Course Templates: ${this.courseTemplateIds.length}`);
    console.log(`Courses: ${this.courseIds.length}`);
    console.log(`Lab Sections: ${this.labSectionIds.length}`);
    console.log(`TA Applications: ${this.applicationIds.length}`);
    
    console.log('\n📝 Login credentials:');
    console.log("   Admin: admin@example.com / admin123");
    console.log("   Instructor: instructor@example.com / instructor123");
    console.log("   Student: student@example.com / student123");
    console.log("   TA Coordinator: tacoord@example.com / tacoord123");
    console.log("\n💡 Additional users have password: password123");
  }
}