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
