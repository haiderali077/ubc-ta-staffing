const API_BASE_URL = 'http://localhost:8000/api';

// Types for instructor API responses
export interface InstructorCourse {
  course_id: number;
  code: string;
  title: string;
  term: string;
  current_tas?: number;
  ta_needs?: {
    need_id: number;
    hours_required: number;
    notes?: string;
    status: 'open' | 'filled' | 'cancelled';
    qualifications?: string;
    created_at?: string;
    updated_at?: string;
  }[];
  instructor_id?: number;
  dept_id?: number;
  template_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InstructorTARequest {
  need_id: number;
  course_id: number;
  hours_required: number;
  notes?: string;
  status: 'open' | 'filled' | 'cancelled';
  qualifications?: string;
  created_at?: string;
  updated_at?: string;
  course_code: string;
  course_title: string;
  course_term: string;
}

export interface InstructorDashboardSummary {
  total_courses: number;
  total_ta_requests: number;
  open_ta_requests: number;
  total_assigned_tas: number;
}

export interface TAAssignment {
  allocation_id: number;
  user_id: number;
  allocated_at: string;
  notes?: string;
}

export interface InstructorCourseDetails extends InstructorCourse {
  assigned_tas: TAAssignment[];
}

export interface TARequestSubmission {
  course_id: number;
  hours_required: number;
  qualifications?: string;
  notes?: string;
  lab_tutorial_skills?: string;
}

export interface TAApplication {
  application_id: number;
  user_id: number;
  student_name: string;
  student_email: string;
  student_number: string;
  major: string;
  gpa?: number;
  status: 'pending' | 'shortlisted' | 'offer_sent' | 'offer_accepted' | 'offer_declined';
  applied_at: string;
  cover_letter?: string;
  resume_url?: string;
  relevant_experience?: string;
  lab_tutorial_skills?: string;
}

export interface ShortlistRequest {
  application_ids: number[];
  is_shortlisted: boolean;
}

export interface SendOffersRequest {
  need_id: number;
  message?: string;
}

// =============================================================================
// INSTRUCTOR COURSES API
// =============================================================================

/**
 * Get all courses assigned to the current instructor
 */
export const getInstructorCourses = async (): Promise<{
  courses: InstructorCourse[];
  total: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/courses`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch instructor courses: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get detailed information about a specific course
 */
export const getInstructorCourseDetails = async (courseId: number): Promise<{
  course: InstructorCourseDetails;
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/courses/${courseId}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course details: ${response.statusText}`);
  }

  return response.json();
};

// =============================================================================
// TA REQUESTS API
// =============================================================================

/**
 * Get all TA requests for the instructor's courses
 */
export const getInstructorTARequests = async (): Promise<{
  requests: InstructorTARequest[];
  total: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/ta-requests`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch TA requests: ${response.statusText}`);
  }

  return response.json();
};

// =============================================================================
// TA APPLICATIONS API
// =============================================================================

/**
 * Get applications for a specific TA request
 */
export const getTAApplications = async (needId: number): Promise<{
  applications: TAApplication[];
  total: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/ta-requests/${needId}/applications`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch TA applications: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Toggle shortlist status for applications
 */
export const updateShortlistStatus = async (needId: number, shortlistData: ShortlistRequest): Promise<{
  message: string;
  updated_count: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/ta-requests/${needId}/applications/shortlist`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shortlistData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to update shortlist: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Send offers to all shortlisted candidates
 */
export const sendOffersToShortlisted = async (offerData: SendOffersRequest): Promise<{
  message: string;
  offers_sent: number;
  failed_offers: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/ta-requests/send-offers`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(offerData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to send offers: ${response.statusText}`);
  }

  return response.json();
};

// =============================================================================
// DASHBOARD API
// =============================================================================

/**
 * Get dashboard summary data for instructor
 */
export const getInstructorDashboard = async (): Promise<{
  summary: InstructorDashboardSummary;
  recent_courses: InstructorCourse[];
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/dashboard`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
  }

  return response.json();
};

// =============================================================================
// TA REQUEST SUBMISSION API
// =============================================================================

/**
 * Submit a TA request for a course
 */
export const submitTARequest = async (requestData: TARequestSubmission): Promise<{
  message: string;
  ta_request: InstructorTARequest;
}> => {
  const response = await fetch(`${API_BASE_URL}/instructor/ta-request`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to submit TA request: ${response.statusText}`);
  }

  return response.json();
};

// =============================================================================
// COMBINED INSTRUCTOR API EXPORT
// =============================================================================

export const instructorApi = {
  // Courses
  getCourses: getInstructorCourses,
  getCourseDetails: getInstructorCourseDetails,
  
  // TA Requests
  getTARequests: getInstructorTARequests,
  submitTARequest: submitTARequest,
  
  // TA Applications
  getTAApplications: getTAApplications,
  updateShortlistStatus: updateShortlistStatus,
  sendOffersToShortlisted: sendOffersToShortlisted,
  
  // Dashboard
  getDashboard: getInstructorDashboard,
};

export default instructorApi; 