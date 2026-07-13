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
  status?: 'pending' | 'approved' | 'rejected' | 'allocated';
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