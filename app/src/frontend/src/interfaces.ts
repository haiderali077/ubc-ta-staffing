// =============================================================================
// USER & AUTHENTICATION INTERFACES
// =============================================================================

export type UserRole = "student" | "instructor" | "admin" | "ta_coordinator";

export interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  student_number?: string;
  password_hash: string;
  role: UserRole;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserWithoutPassword {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  student_number?: string;
  role: UserRole;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchUser: (role: UserRole) => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

// =============================================================================
// AUTHENTICATION SERVICE INTERFACES
// =============================================================================

export interface LoginResult {
  success: boolean;
  user?: UserWithoutPassword;
  token?: string;
  error?: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  user?: UserWithoutPassword;
  error?: string;
}

export interface RefreshTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface JWTPayload {
  user_id: number;
  email: string;
  role: string;
}

export interface AuthMiddlewareOptions {
  requiredRole?: UserRole;
  allowSelf?: boolean;
}

// =============================================================================
// COURSE INTERFACES
// =============================================================================

export interface Course {
  course_id: number;
  code: string;
  title: string;
  instructor_name: string;
  slots_remaining: number;
  total_slots: number;
  term: string;
  assigned_students: Student[];
}

// =============================================================================
// STUDENT INTERFACES FOR ALLOCATION
// =============================================================================

export interface Student {
  user_id: number;
  name: string;
  email: string;
  gpa: number;
  major: string;
  availability: string[];
  application_id: number;
  ranked_courses: { course_id: number; rank: number }[];
}

// =============================================================================
// PROFILE INTERFACES
// =============================================================================

export interface StudentProfile {
  profile_id?: number;
  user_id: number;
  overall_gpa?: number;
  expected_graduation?: Date;
  personal_statement?: string;
  weekly_availability?: string;
  max_hours_per_week?: number;
  preferred_term?: string;
  preferred_course_types?: string;
  specific_course_preferences?: string;
  additional_notes?: string;
  relevant_coursework?: string;
  teaching_experience?: string;
  technical_skills?: string;
  created_at?: Date;
  updated_at?: Date;
}

// =============================================================================
// APPLICATION INTERFACES
// =============================================================================

export interface TAApplication {
  application_id: number;
  student_id: number;
  semester: string;
  year: number;
  gpa: number;
  availability: string;
  statement: string;
  status: "pending" | "approved" | "rejected";
  created_at?: Date;
  updated_at?: Date;
}

export interface ApplicationRanking {
  ranking_id: number;
  application_id: number;
  course_id: number;
  rank: number;
  created_at?: Date;
}

export interface TAApplicationFormData {
  gpa: string;
  availability: string;
  statement: string;
  coursePreferences: CourseSelection[];
}

export interface CourseSelection {
  course_id: number;
  rank: number;
}

export interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

// =============================================================================
// ALLOCATION DASHBOARD INTERFACES
// =============================================================================

export interface FilterState {
  minGpa: number;
  maxGpa: number;
  availability: string[];
  maxRank: number;
  major: string;
}

export interface AllocationFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export interface UnassignedStudentsProps {
  students: Student[];
}

export interface CoursesWithOpenSlotsProps {
  courses: Course[];
  assignments: { [key: number]: Student[] };
  onUnassignStudent: (studentId: number, courseId: number) => void;
}

// =============================================================================
// UI COMPONENT INTERFACES
// =============================================================================

export interface LogoProps {
  className?: string;
}

export interface NavItem {
  name: string;
  href: string;
  current: boolean;
}

// =============================================================================
// DATABASE & ERROR INTERFACES
// =============================================================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface HttpError extends Error {
  status: number;
  statusText: string;
}

// =============================================================================
// ADDITIONAL UTILITY INTERFACES
// =============================================================================

export interface ApplicationWithPreferences {
  application_id: number;
  student_id: number;
  gpa: number;
  preferences: {
    course_id: number;
    rank: number;
  }[];
}

export interface QueryObjectResult<T> {
  rows: T[];
  rowCount: number;
}
