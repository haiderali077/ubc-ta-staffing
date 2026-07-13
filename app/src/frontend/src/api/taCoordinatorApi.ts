/* eslint-disable @typescript-eslint/no-unused-vars */
// TA Coordinator API Service

interface Term {
  term_id?: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'upcoming';
  created_at?: string;
  updated_at?: string;
}

interface LabSection {
  lab_section_id?: number;
  section_name: string;
  lab_days: string;
  lab_start_time: string;
  lab_end_time: string;
  ta_id?: number;
  ta_name?: string;
}

export interface Course {
  course_id: number;
  code: string;
  title: string;
  term: string;
  instructor_id?: number;
  instructor_name?: string;    // Add this field
  instructor_email?: string;   // Add this field
  dept_id?: number;
  template_id?: number;
  max_tas?: number;
  course_days?: string;
  course_time?: string;
  course_frequency?: 'weekly' | 'bi-weekly';
  created_at?: string;
  updated_at?: string;
  // TA needs fields
  hours_required?: number;
  ta_notes?: string;
  need_status?: string;
  need_id?: number;
  qualifications?: string;
  // Lab sections if included
  lab_sections?: LabSection[];
}

interface Instructor {
  user_id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

interface CourseWithInstructor {
  course_id: number;
  code: string;
  title: string;
  term: string;
  instructor_id: number;
  instructor_name: string;
  created_at?: string;
  updated_at?: string;
}

interface TARequestWithCourse {
  need_id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  course_term: string;
  hours_required: number;
  notes?: string;
  status: 'open' | 'filled' | 'cancelled';
  instructor_name?: string;
  instructor_email?: string;
  created_at: string;
  updated_at: string;
}

interface TARequestStats {
  total: number;
  open: number;
  filled: number;
  cancelled: number;
}

const API_BASE_URL = 'http://localhost:8000/api/ta-coordinator';

// Helper function to get auth token from cookies
const getAuthToken = (): string | null => {
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='));
  return tokenCookie ? tokenCookie.split('=')[1] : null;
};

// Helper function for making authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// =============================================================================
// TERMS API
// =============================================================================

export const termsApi = {
  // Get all terms
  getAllTerms: async (): Promise<Term[]> => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/terms`);
  },

  // Get active terms only
  getActiveTerms: async (): Promise<Term[]> => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/terms/active`);
  },

  // Create new term
  createTerm: async (termData: Omit<Term, 'term_id' | 'created_at' | 'updated_at'>): Promise<Term> => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/terms`, {
      method: 'POST',
      body: JSON.stringify(termData),
    });
  },

  // Update term
  updateTerm: async (termId: number, updates: Partial<Term>): Promise<Term> => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/terms/${termId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete term
  deleteTerm: async (termId: number): Promise<{ success: boolean }> => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/terms/${termId}`, {
      method: 'DELETE',
    });
  },
};

// =============================================================================
// COURSES API
// =============================================================================

export const coursesApi = {
  // Get all courses
  getAllCourses: async (): Promise<Course[]> => {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.statusText}`);
    }

    const data = await response.json();
    return data; // Backend returns array directly, not {courses: []}
  },

  // Get courses by term
  getCoursesByTerm: async (termId: number): Promise<Course[]> => {
    const response = await fetch(`${API_BASE_URL}/courses/term/${termId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses for term: ${response.statusText}`);
    }

    const data = await response.json();
    return data; // Backend returns array directly, not {courses: []}
  },

  // Create new course
  createCourse: async (courseData: {
    code: string;
    title: string;
    term: string;
    instructor_id?: number;
    dept_id?: number;
    course_days?: string;
    course_time?: string;
    course_frequency?: 'weekly' | 'bi-weekly';
    lab_sections?: {
      section_name: string;
      lab_days: string;
      lab_start_time: string;
      lab_end_time: string;
      ta_id?: number;
    }[];
  }): Promise<Course> => {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create course: ${response.statusText}`);
    }

    return await response.json();
  },

  // Update course
  updateCourse: async (courseId: number, courseData: {
    code?: string;
    title?: string;
    term?: string;
    instructor_id?: number;
    dept_id?: number;
    course_days?: string;
    course_time?: string;
    course_frequency?: 'weekly' | 'bi-weekly';
    lab_sections?: {
      section_name: string;
      lab_days: string;
      lab_start_time: string;
      lab_end_time: string;
      ta_id?: number;
    }[];
  }): Promise<Course> => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update course: ${response.statusText}`);
    }

    return await response.json();
  },

  // Delete course
  deleteCourse: async (courseId: number): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete course: ${response.statusText}`);
    }

    return await response.json();
  },
};

// =============================================================================
// COMBINED API EXPORT
// =============================================================================

export const taCoordinatorApi = {
  terms: termsApi,
  courses: coursesApi,

  // Instructor assignment functionality
  instructors: {
    getAll: async (): Promise<Instructor[]> => {
      const response = await fetch(`${API_BASE_URL}/instructors`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch instructors: ${response.statusText}`);
      }

      const data = await response.json();
      return data.instructors;
    },

    assignToCourse: async (courseId: number, instructorId: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/instructor`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instructor_id: instructorId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign instructor: ${response.statusText}`);
      }
    },

    unassignFromCourse: async (courseId: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/instructor`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to unassign instructor: ${response.statusText}`);
      }
    },

    getCoursesWithAssignments: async (): Promise<CourseWithInstructor[]> => {
      const response = await fetch(`${API_BASE_URL}/courses/assignments`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch course assignments: ${response.statusText}`);
      }

      const data = await response.json();
      return data.assignments;
    },

    getUnassignedCourses: async (): Promise<Course[]> => {
      const response = await fetch(`${API_BASE_URL}/courses/unassigned`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unassigned courses: ${response.statusText}`);
      }

      const data = await response.json();
      return data; // Backend returns array directly, not {courses: []}
    },
  },

  // TA Requests functionality
  taRequests: {
    getAll: async (): Promise<TARequestWithCourse[]> => {
      const response = await fetch(`${API_BASE_URL}/ta-requests`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch TA requests: ${response.statusText}`);
      }

      const data = await response.json();
      return data.requests;
    },

    updateStatus: async (needId: number, status: 'open' | 'filled' | 'cancelled', notes?: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/ta-requests/${needId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update TA request: ${response.statusText}`);
      }
    },

    getStats: async (): Promise<TARequestStats> => {
      const response = await fetch(`${API_BASE_URL}/ta-requests/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch TA request stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data.stats;
    },

    delete: async (needId: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/ta-requests/${needId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete TA request: ${response.statusText}`);
      }
    },
  },

  // Student Application Management APIs
  applications: {
    // Get all student applications with full details
    getAll: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/applications`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.applications;
      } catch (error) {
        console.error('Error fetching applications:', error);
        throw error;
      }
    },

    // Get application statistics
    getStats: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/applications/stats`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.stats;
      } catch (error) {
        console.error('Error fetching application stats:', error);
        throw error;
      }
    },

    // Get applications by status
    getByStatus: async (status: 'pending' | 'approved' | 'rejected') => {
      try {
        const response = await fetch(`${API_BASE_URL}/applications/status/${status}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.applications;
      } catch (error) {
        console.error(`Error fetching ${status} applications:`, error);
        throw error;
      }
    },

    // Update application status (approve/reject/reopen)
    updateStatus: async (
      applicationId: number, 
      status: 'pending' | 'approved' | 'rejected', 
      notes?: string
    ) => {
      try {
        const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, notes }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error updating application status:', error);
        throw error;
      }
    },

    // Get detailed application by ID
    getById: async (applicationId: number) => {
      try {
        const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.application;
      } catch (error) {
        console.error('Error fetching application details:', error);
        throw error;
      }
    },

    // Delete application
    delete: async (applicationId: number) => {
      try {
        const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error deleting application:', error);
        throw error;
      }
    },
  },
}; 