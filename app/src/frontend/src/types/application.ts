export interface Course {
  course_id: number;
  code: string;
  title: string;
  term: string;
  instructor_id?: number;
  dept_id?: number;
}

export interface TAApplication {
  application_id?: number;
  user_id: number;
  submitted_at?: Date;
  status?: "pending" | "approved" | "rejected" | "allocated";
  notes?: string;
}

export interface ApplicationRanking {
  id?: number;
  application_id: number;
  course_id: number;
  rank: number;
}

export interface TAApplicationFormData {
  course_rankings: { course_id: number; rank: number }[];
  availability: string[];
  notes?: string;
}

export interface CourseSelection {
  course: Course;
  rank: number;
}

export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
}

// --- New types for TA Application Workflow ---

export interface DomainArea {
  id?: number;
  name: string;
}

export type ApplicationType = "UTA" | "GTA" | "PhD";

export interface TAApplicationRequest {
  coursePreferences: { course_id: number; rank: number }[];
  domainAreas: string[]; // or DomainArea[] if backend returns objects
  applicationType: ApplicationType;
  termAvailability?: string;
  notes?: string;
  // Use snake_case for snapshot fields to match backend
  technical_skills?: string;
  relevant_coursework?: string;
  overall_gpa?: number;
  expected_graduation?: string;
  weekly_availability?: string;
  teaching_experience?: string;
}

export interface TAApplicationResponse {
  application_id: number;
  user_id: number;
  submitted_at: string;
  status: "pending" | "approved" | "rejected" | "allocated";
  notes?: string;
  coursePreferences: { course_id: number; rank: number }[];
  domainAreas: string[];
  applicationType: ApplicationType;
  termAvailability: string;
}
