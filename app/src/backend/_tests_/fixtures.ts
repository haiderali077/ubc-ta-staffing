/**
 * Enhanced Test Fixtures
 * 
 * Comprehensive test data for the AllocAid TA Management System.
 * Includes realistic data relationships and edge cases for thorough testing.
 */

import { hashPassword } from "../../../deps.ts";

/**
 * Test user data with realistic relationships and roles
 */
export const testUsers = {
  admin: {
    email: "admin@ubc.ca", // Changed from "testadmin@ubc.ca"
    password: "admin123", // Changed from "admin123!" to match schema.ts
    password_hash: "$2b$10$YourHashedPasswordHere1",
    name: "Admin User", // Changed to match schema.ts
    role: "admin",
    major: "Computer Science",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  taCoordinator: {
    email: "tacoord@ubc.ca", // Changed from "testtacoord@ubc.ca"
    password: "tacoord123", // Changed from "coordinator123!"
    password_hash: "$2b$10$YourHashedPasswordHere2",
    name: "TA Coordinator", // Changed to match schema.ts
    role: "ta_coordinator",
    major: "Computer Science",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  instructor1: {
    email: "smith@ubc.ca",
    password: "instructor123", // Changed from "instructor123!"
    password_hash: "$2b$10$YourHashedPasswordHere3",
    name: "Dr. Smith", // Changed to match schema.ts
    role: "instructor",
    major: "Computer Science",
    office: "ICCS 301",
    phone: "604-822-1234",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  instructor2: {
    email: "johnson@ubc.ca",
    password: "instructor456", // Changed from "instructor456!"
    password_hash: "$2b$10$YourHashedPasswordHere4",
    name: "Dr. Johnson", // Changed to match schema.ts
    role: "instructor",
    major: "Mathematics",
    office: "LSK 301",
    phone: "604-822-5678",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  student1: {
    email: "jane.doe@student.ubc.ca",
    password: "student123", // Changed from "student123!"
    password_hash: "$2b$10$YourHashedPasswordHere5",
    name: "Jane Doe",
    role: "student",
    major: "Computer Science",
    student_number: "12345678",
    year_level: "4th",
    gpa: 3.85,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  student2: {
    email: "john.smith@student.ubc.ca",
    password: "student456", // Changed from "student456!"
    password_hash: "$2b$10$YourHashedPasswordHere6",
    name: "John Smith",
    role: "student",
    major: "Computer Science",
    student_number: "87654321",
    year_level: "3rd",
    gpa: 3.67,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  student3: {
    email: "alice.wong@student.ubc.ca",
    password: "student789!",
    password_hash: "$2b$10$YourHashedPasswordHere7",
    name: "Alice Wong",
    role: "student",
    major: "Mathematics",
    student_number: "11223344",
    year_level: "Graduate",
    gpa: 3.92,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  expiredStudent: {
    email: "expired@student.ubc.ca",
    password: "expired123!",
    password_hash: "$2b$10$YourHashedPasswordHere8",
    name: "Expired Student",
    role: "student",
    major: "Computer Science",
    student_number: "99999999",
    year_level: "2nd",
    gpa: 2.50,
    is_active: false,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-06-01T00:00:00Z",
  },
};

/**
 * Academic terms with realistic date ranges
 */
export const testTerms = {
  fall2024: {
    name: "Fall 2024",
    start_date: "2024-09-03",
    end_date: "2024-12-06",
    status: "active",
    application_deadline: "2024-08-15",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  winter2025: {
    name: "Winter 2025",
    start_date: "2025-01-06",
    end_date: "2025-04-11",
    status: "inactive",
    application_deadline: "2024-12-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  summer2025: {
    name: "Summer 2025",
    start_date: "2025-05-05",
    end_date: "2025-08-15",
    status: "upcoming",
    application_deadline: "2025-03-15",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  pastTerm: {
    name: "Fall 2023",
    start_date: "2023-09-05",
    end_date: "2023-12-08",
    status: "active",
    application_deadline: "2023-08-15",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-12-15T00:00:00Z",
  },
};

/**
 * University departments
 */
export const testDepartments = {
  cs: {
    name: "Computer Science",
    code: "CPSC",
    faculty: "Faculty of Science",
    head: "Dr. Computer Head",
    budget_code: "CS001",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  math: {
    name: "Mathematics",
    code: "MATH",
    faculty: "Faculty of Science",
    head: "Dr. Math Head",
    budget_code: "MA001",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  stats: {
    name: "Statistics",
    code: "STAT",
    faculty: "Faculty of Science",
    head: "Dr. Stats Head",
    budget_code: "ST001",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

/**
 * Course offerings with realistic details
 */
export const testCourses = {
  cpsc110: {
    course_code: "CPSC 110",
    course_name: "Computation, Programs, and Programming",
    dept_id: 1,
    term_id: 1,
    instructor_id: 3,
    credits: 4,
    enrollment_cap: 350,
    current_enrollment: 298,
    description: "Fundamental program and computation structures. Systematic program design methods.",
    prerequisites: "None",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-15T00:00:00Z",
  },
  cpsc210: {
    course_code: "CPSC 210",
    course_name: "Software Construction",
    dept_id: 1,
    term_id: 1,
    instructor_id: 3,
    credits: 4,
    enrollment_cap: 280,
    current_enrollment: 265,
    description: "Design, implementation, and analysis of robust software components.",
    prerequisites: "CPSC 110",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-15T00:00:00Z",
  },
  cpsc310: {
    course_code: "CPSC 310",
    course_name: "Introduction to Software Engineering",
    dept_id: 1,
    term_id: 2,
    instructor_id: 3,
    credits: 4,
    enrollment_cap: 200,
    current_enrollment: 0,
    description: "Specification, design, construction and validation of software systems.",
    prerequisites: "CPSC 210",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  math200: {
    course_code: "MATH 200",
    course_name: "Calculus III",
    dept_id: 2,
    term_id: 1,
    instructor_id: 4,
    credits: 3,
    enrollment_cap: 150,
    current_enrollment: 142,
    description: "Multivariate calculus including partial derivatives and multiple integrals.",
    prerequisites: "MATH 101, MATH 102",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-15T00:00:00Z",
  },
  smallCourse: {
    course_code: "CPSC 490",
    course_name: "Student Directed Seminar",
    dept_id: 1,
    term_id: 1,
    instructor_id: 3,
    credits: 3,
    enrollment_cap: 12,
    current_enrollment: 8,
    description: "Advanced topics in computer science.",
    prerequisites: "4th year standing",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-15T00:00:00Z",
  },
};

/**
 * Student profiles with comprehensive academic information
 */
export const testStudentProfiles = {
  janeProfile: {
    student_number: "12345678",
    program: "Bachelor of Computer Science",
    year_level: "4th",
    specialization: "Software Engineering",
    gpa: 3.85,
    expected_graduation: "2025-05",
    work_authorization: "Citizen",
    resume_url: "/uploads/resumes/jane_doe_resume.pdf",
    transcript_url: "/uploads/transcripts/jane_doe_transcript.pdf",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  johnProfile: {
    student_number: "87654321",
    program: "Bachelor of Computer Science",
    year_level: "3rd",
    specialization: "Machine Learning",
    gpa: 3.67,
    expected_graduation: "2026-05",
    work_authorization: "Study Permit",
    resume_url: "/uploads/resumes/john_smith_resume.pdf",
    transcript_url: "/uploads/transcripts/john_smith_transcript.pdf",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  aliceProfile: {
    student_number: "11223344",
    program: "Master of Science in Mathematics",
    year_level: "Graduate",
    specialization: "Applied Mathematics",
    gpa: 3.92,
    expected_graduation: "2025-12",
    work_authorization: "Work Permit",
    resume_url: "/uploads/resumes/alice_wong_resume.pdf",
    transcript_url: "/uploads/transcripts/alice_wong_transcript.pdf",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
};

/**
 * Academic and professional references
 */
export const testReferences = {
  janeReference1: {
    name: "Dr. Emily Chen",
    title: "Associate Professor",
    institution: "University of British Columbia",
    department: "Computer Science",
    email: "emily.chen@ubc.ca",
    phone: "604-822-9876",
    relationship: "Course Instructor (CPSC 210)",
    known_duration: "2 years",
    submitted: true,
    submitted_at: "2024-08-10T00:00:00Z",
    created_at: "2024-08-01T00:00:00Z",
    updated_at: "2024-08-10T00:00:00Z",
  },
  janeReference2: {
    name: "Mr. David Lee",
    title: "Senior Software Engineer",
    institution: "Tech Corp",
    department: "Engineering",
    email: "david.lee@techcorp.com",
    phone: "604-555-1234",
    relationship: "Internship Supervisor",
    known_duration: "6 months",
    submitted: false,
    submitted_at: null,
    created_at: "2024-08-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  johnReference1: {
    name: "Dr. Michael Rodriguez",
    title: "Professor",
    institution: "University of British Columbia",
    department: "Computer Science",
    email: "michael.rodriguez@ubc.ca",
    phone: "604-822-5555",
    relationship: "Research Supervisor",
    known_duration: "1 year",
    submitted: true,
    submitted_at: "2024-08-05T00:00:00Z",
    created_at: "2024-07-15T00:00:00Z",
    updated_at: "2024-08-05T00:00:00Z",
  },
};

/**
 * TA position requirements and specifications
 */
export const testTANeeds = {
  cpsc110Need: {
    positions_needed: 8,
    positions_filled: 5,
    hourly_rate: 25.50,
    total_hours_per_week: 10,
    responsibilities: [
      "Lead tutorial sessions",
      "Grade assignments and exams", 
      "Hold office hours",
      "Assist with lab sessions"
    ].join("; "),
    qualifications_required: [
      "Previous enrollment in CPSC 110 with grade A- or higher",
      "Strong communication skills",
      "Experience with Python and Racket"
    ].join("; "),
    preferred_qualifications: [
      "Previous TA experience",
      "Upper-year computer science student",
      "Bilingual (English/Mandarin) preferred"
    ].join("; "),
    application_deadline: "2024-08-15",
    training_required: true,
    training_date: "2024-08-25",
    status: "open",
    created_at: "2024-07-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  cpsc210Need: {
    positions_needed: 6,
    positions_filled: 4,
    hourly_rate: 26.00,
    total_hours_per_week: 12,
    responsibilities: [
      "Lead tutorial sessions",
      "Grade assignments and projects",
      "Code review and feedback",
      "Office hours support"
    ].join("; "),
    qualifications_required: [
      "Previous enrollment in CPSC 210 with grade A or higher",
      "Strong Java programming skills",
      "Understanding of software design patterns"
    ].join("; "),
    preferred_qualifications: [
      "Previous TA experience in CPSC courses",
      "Industry software development experience",
      "3rd year or higher standing"
    ].join("; "),
    application_deadline: "2024-08-15",
    training_required: true,
    training_date: "2024-08-26",
    status: "open",
    created_at: "2024-07-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  math200Need: {
    positions_needed: 4,
    positions_filled: 3,
    hourly_rate: 24.75,
    total_hours_per_week: 8,
    responsibilities: [
      "Lead tutorial sessions",
      "Grade homework and quizzes",
      "Hold office hours",
      "Assist with problem-solving sessions"
    ].join("; "),
    qualifications_required: [
      "Previous enrollment in MATH 200 with grade A- or higher",
      "Strong mathematical communication skills",
      "Proficiency in calculus and linear algebra"
    ].join("; "),
    preferred_qualifications: [
      "Mathematics or related major",
      "Previous tutoring experience",
      "Graduate student preferred"
    ].join("; "),
    application_deadline: "2024-08-15",
    training_required: false,
    training_date: null,
    status: "open",
    created_at: "2024-07-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  closedNeed: {
    positions_needed: 2,
    positions_filled: 2,
    hourly_rate: 27.00,
    total_hours_per_week: 6,
    responsibilities: "Seminar facilitation; Research assistance",
    qualifications_required: "4th year CS standing; GPA 3.5+",
    preferred_qualifications: "Research experience; Graduate studies",
    application_deadline: "2024-07-15",
    training_required: false,
    training_date: null,
    status: "closed",
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-07-20T00:00:00Z",
  },
};

/**
 * TA applications with various statuses and scenarios
 */
export const testApplications = {
  janeApplication1: {
    status: "submitted",
    preference_rank: 1,
    previous_experience: "TA for CPSC 110 in Fall 2023 (3.5/4.0 evaluation). Led 2 tutorial sections with 25 students each.",
    relevant_courses: "CPSC 110 (A+), CPSC 210 (A), CPSC 221 (A-), CPSC 310 (B+)",
    technical_skills: "Python, Java, Racket, Git, IntelliJ, VSCode",
    availability: "Available all weekdays 9AM-5PM, flexible on weekends",
    cover_letter: "I am excited to apply for the CPSC 110 TA position. My previous experience as a TA has given me strong skills in explaining complex concepts to beginners...",
    references_submitted: 2,
    gpa: 3.85,
    submitted_at: "2024-08-10T10:30:00Z",
    last_updated: "2024-08-10T10:30:00Z",
    created_at: "2024-08-05T00:00:00Z",
    updated_at: "2024-08-10T10:30:00Z",
  },
  janeApplication2: {
    status: "submitted",
    preference_rank: 2,
    previous_experience: "CPSC 110 TA experience, Software Engineering Intern at StartupXYZ",
    relevant_courses: "CPSC 210 (A), CPSC 213 (A-), CPSC 310 (B+), CPSC 320 (A-)",
    technical_skills: "Java, Python, JavaScript, React, Spring Boot, Git, Agile methodologies",
    availability: "Available Monday/Wednesday/Friday 1PM-5PM, Tuesday/Thursday 9AM-1PM",
    cover_letter: "Building on my CPSC 110 TA experience, I would like to contribute to CPSC 210 where I can help students with software design principles...",
    references_submitted: 2,
    gpa: 3.85,
    submitted_at: "2024-08-12T14:15:00Z",
    last_updated: "2024-08-12T14:15:00Z",
    created_at: "2024-08-08T00:00:00Z",
    updated_at: "2024-08-12T14:15:00Z",
  },
  johnApplication1: {
    status: "under_review",
    preference_rank: 1,
    previous_experience: "Tutored high school students in mathematics and programming for 2 years",
    relevant_courses: "CPSC 110 (A), CPSC 210 (B+), CPSC 221 (A-)",
    technical_skills: "Python, Java, C++, Git, Linux command line",
    availability: "Available Tuesday/Thursday 2PM-6PM, weekends flexible",
    cover_letter: "As someone passionate about teaching and programming, I believe I can help new computer science students...",
    references_submitted: 1,
    gpa: 3.67,
    submitted_at: "2024-08-09T16:45:00Z",
    last_updated: "2024-08-15T09:20:00Z",
    created_at: "2024-08-07T00:00:00Z",
    updated_at: "2024-08-15T09:20:00Z",
  },
  aliceApplication1: {
    status: "accepted",
    preference_rank: 1,
    previous_experience: "TA for MATH 100 and MATH 101. Mathematics tutor for 3 years.",
    relevant_courses: "MATH 200 (A+), MATH 220 (A), MATH 300 (A), MATH 320 (A-)",
    technical_skills: "MATLAB, R, LaTeX, Mathematica, statistical analysis",
    availability: "Available Monday/Wednesday/Friday 10AM-2PM",
    cover_letter: "With my strong background in mathematics and extensive tutoring experience, I am well-prepared to support MATH 200 students...",
    references_submitted: 2,
    gpa: 3.92,
    submitted_at: "2024-08-08T11:20:00Z",
    last_updated: "2024-08-16T15:30:00Z",
    created_at: "2024-08-06T00:00:00Z",
    updated_at: "2024-08-16T15:30:00Z",
  },
  rejectedApplication: {
    status: "rejected",
    preference_rank: 1,
    previous_experience: "None",
    relevant_courses: "CPSC 110 (C+), CPSC 210 (C)",
    technical_skills: "Basic Python",
    availability: "Limited availability",
    cover_letter: "I would like to be a TA...",
    references_submitted: 0,
    gpa: 2.50,
    submitted_at: "2024-08-11T23:59:00Z",
    last_updated: "2024-08-17T10:00:00Z",
    rejection_reason: "Insufficient academic standing and lack of relevant experience",
    created_at: "2024-08-11T00:00:00Z",
    updated_at: "2024-08-17T10:00:00Z",
  },
  draftApplication: {
    status: "draft",
    preference_rank: 2,
    previous_experience: "Tutoring experience",
    relevant_courses: "CPSC 210 (B+)",
    technical_skills: "Java, Python",
    availability: "TBD",
    cover_letter: "Draft application...",
    references_submitted: 0,
    gpa: 3.67,
    submitted_at: null,
    last_updated: "2024-08-13T18:00:00Z",
    created_at: "2024-08-13T18:00:00Z",
    updated_at: "2024-08-13T18:00:00Z",
  },
};

/**
 * TA position allocations and assignments
 */
export const testAllocations = {
  janeAllocation1: {
    hours_per_week: 10,
    hourly_rate: 25.50,
    start_date: "2024-09-03",
    end_date: "2024-12-06",
    status: "confirmed",
    contract_signed: true,
    contract_signed_date: "2024-08-20T00:00:00Z",
    orientation_completed: true,
    orientation_date: "2024-08-25T00:00:00Z",
    assigned_sections: ["T1A", "T1B"],
    supervisor_id: 3, // Dr. John Smith
    created_at: "2024-08-18T00:00:00Z",
    updated_at: "2024-08-25T00:00:00Z",
  },
  aliceAllocation1: {
    hours_per_week: 8,
    hourly_rate: 24.75,
    start_date: "2024-09-03",
    end_date: "2024-12-06",
    status: "confirmed",
    contract_signed: true,
    contract_signed_date: "2024-08-19T00:00:00Z",
    orientation_completed: false,
    orientation_date: null,
    assigned_sections: ["T2A"],
    supervisor_id: 4, // Dr. Sarah Johnson
    created_at: "2024-08-18T00:00:00Z",
    updated_at: "2024-08-19T00:00:00Z",
  },
  pendingAllocation: {
    hours_per_week: 10,
    hourly_rate: 25.50,
    start_date: "2024-09-03",
    end_date: "2024-12-06",
    status: "pending",
    contract_signed: false,
    contract_signed_date: null,
    orientation_completed: false,
    orientation_date: null,
    assigned_sections: ["T1C"],
    supervisor_id: 3,
    created_at: "2024-08-19T00:00:00Z",
    updated_at: "2024-08-19T00:00:00Z",
  },
};

/**
 * Academic skill domains and areas of expertise
 */
export const testDomainAreas = {
  algorithms: {
    name: "Algorithms and Data Structures",
    category: "Computer Science",
    description: "Algorithm design, analysis, and implementation",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  softwareEngineering: {
    name: "Software Engineering",
    category: "Computer Science",
    description: "Software design, development methodologies, testing",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  machineLearning: {
    name: "Machine Learning",
    category: "Computer Science",
    description: "ML algorithms, neural networks, data science",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  calculus: {
    name: "Calculus",
    category: "Mathematics",
    description: "Differential and integral calculus",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  linearAlgebra: {
    name: "Linear Algebra",
    category: "Mathematics",
    description: "Vector spaces, matrices, eigenvalues",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

/**
 * System configuration and settings
 */
export const testSystemSettings = {
  academicYear: {
    key: "current_academic_year",
    value: "2024-2025",
    type: "string",
    description: "Current academic year",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
  applicationDeadline: {
    key: "default_application_deadline_days",
    value: "30",
    type: "integer",
    description: "Default days before term start for application deadline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  maxApplications: {
    key: "max_applications_per_student",
    value: "5",
    type: "integer",
    description: "Maximum number of applications per student per term",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  minGPA: {
    key: "minimum_gpa_requirement",
    value: "3.0",
    type: "decimal",
    description: "Minimum GPA required for TA applications",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  emailNotifications: {
    key: "email_notifications_enabled",
    value: "true",
    type: "boolean",
    description: "Whether to send email notifications for application updates",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

/**
 * Test scenarios for edge cases and validation
 */
export const testScenarios = {
  // High-demand course with many applications
  popularCourse: {
    applicationsCount: 45,
    positionsAvailable: 8,
    competitionRatio: 5.6,
  },
  // Low-demand specialized course
  nicheCourse: {
    applicationsCount: 3,
    positionsAvailable: 2,
    competitionRatio: 1.5,
  },
  // Application deadline scenarios
  deadlines: {
    beforeDeadline: "2024-08-10T00:00:00Z",
    exactDeadline: "2024-08-15T23:59:59Z",
    afterDeadline: "2024-08-16T00:00:01Z",
  },
  // GPA edge cases
  gpaScenarios: {
    belowMinimum: 2.95,
    atMinimum: 3.00,
    average: 3.50,
    excellent: 3.85,
    perfect: 4.00,
  },
};

/**
 * Enhanced getter function with type safety and validation
 */
export function getTestData<T = any>(type: string, key?: string): T {
  const fixtures: Record<string, Record<string, any>> = {
    users: testUsers,
    terms: testTerms,
    departments: testDepartments,
    courses: testCourses,
    profiles: testStudentProfiles,
    references: testReferences,
    needs: testTANeeds,
    applications: testApplications,
    allocations: testAllocations,
    domains: testDomainAreas,
    settings: testSystemSettings,
    scenarios: testScenarios,
  };

  if (!fixtures[type]) {
    throw new Error(`Unknown fixture type: ${type}. Available types: ${Object.keys(fixtures).join(', ')}`);
  }

  if (key) {
    const data = fixtures[type][key];
    if (data === undefined) {
      throw new Error(`Key '${key}' not found in fixture type '${type}'. Available keys: ${Object.keys(fixtures[type]).join(', ')}`);
    }
    return data;
  }

  return fixtures[type] as T;
}

/**
 * Utility functions for test data manipulation
 */
export class TestDataUtils {
  /**
   * Generate a realistic test user with random variations
   */
  static createRandomUser(overrides: Partial<any> = {}): any {
    const id = Math.floor(Math.random() * 100000);
    const timestamp = new Date().toISOString();
    
    return {
      id,
      email: `test${id}@student.ubc.ca`,
      password: "test123!",
      password_hash: `$2b$10$randomhash${id}`,
      name: `Test User ${id}`,
      role: "student",
      major: "Computer Science",
      student_number: String(id).padStart(8, '0'),
      year_level: ["1st", "2nd", "3rd", "4th", "Graduate"][Math.floor(Math.random() * 5)],
      gpa: Number((2.5 + Math.random() * 1.5).toFixed(2)),
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides,
    };
  }

  /**
   * Generate test course with realistic attributes
   */
  static createRandomCourse(overrides: Partial<any> = {}): any {
    const id = Math.floor(Math.random() * 10000);
    const courseNumber = 100 + Math.floor(Math.random() * 400);
    const timestamp = new Date().toISOString();
    
    return {
      id,
      course_code: `TEST ${courseNumber}`,
      course_name: `Test Course ${courseNumber}`,
      dept_id: 1,
      term_id: 1,
      instructor_id: 3,
      credits: [3, 4, 6][Math.floor(Math.random() * 3)],
      enrollment_cap: 50 + Math.floor(Math.random() * 300),
      current_enrollment: Math.floor(Math.random() * 250),
      description: `Description for test course ${courseNumber}`,
      prerequisites: courseNumber > 200 ? `TEST ${courseNumber - 100}` : "None",
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides,
    };
  }

  /**
   * Create a complete application with all related data
   */
  static createCompleteApplication(userId: number, courseId: number, overrides: Partial<any> = {}): any {
    const id = Math.floor(Math.random() * 100000);
    const timestamp = new Date().toISOString();
    
    return {
      id,
      user_id: userId,
      course_id: courseId,
      ta_need_id: 1,
      status: "submitted",
      preference_rank: 1,
      previous_experience: "Sample TA experience description",
      relevant_courses: "CPSC 110 (A), CPSC 210 (A-)",
      technical_skills: "Python, Java, Git",
      availability: "Monday-Friday 9AM-5PM",
      cover_letter: "Sample cover letter for TA application",
      references_submitted: 2,
      gpa: 3.5 + Math.random() * 0.5,
      submitted_at: timestamp,
      last_updated: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides,
    };
  }

  /**
   * Get users by role for easier test setup
   */
  static getUsersByRole(role: string): any[] {
    return Object.values(testUsers).filter(user => user.role === role);
  }

  /**
   * Get courses by department
   */
  static getCoursesByDepartment(departmentId: number): any[] {
    return Object.values(testCourses).filter(course => course.dept_id === departmentId);
  }

  /**
   * Get applications by status
   */
  static getApplicationsByStatus(status: string): any[] {
    return Object.values(testApplications).filter(app => app.status === status);
  }
}

/**
 * Password hashing utilities for test fixtures
 */
export async function hashTestPasswords(): Promise<void> {
  for (const [key, user] of Object.entries(testUsers)) {
    if (user.password && !user.password_hash.startsWith('$2b$10$real')) {
      try {
        user.password_hash = await hashPassword(user.password);
      } catch (error) {
        console.warn(`Failed to hash password for user ${key}:`, error);
      }
    }
  }
}

/**
 * Export all test data collections for convenience
 */
export const allTestData = {
  users: testUsers,
  terms: testTerms,
  departments: testDepartments,
  courses: testCourses,
  profiles: testStudentProfiles,
  references: testReferences,
  needs: testTANeeds,
  applications: testApplications,
  allocations: testAllocations,
  domains: testDomainAreas,
  settings: testSystemSettings,
  scenarios: testScenarios,
} as const;

export type TestDataType = keyof typeof allTestData;