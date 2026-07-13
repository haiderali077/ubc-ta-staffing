const API_BASE_URL = 'http://localhost:8000/api/ta-coordinator';

export const allocationApi = {
  // Get student profile including availability data
  async getStudentProfile(userId: number) {
    try {
      const response = await fetch(`http://localhost:8000/api/profile/${userId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.profile;
    } catch (error) {
      console.error('Error fetching student profile:', error);
      throw error;
    }
  },

  // Get all approved applications available for allocation
  async getApprovedApplications() {
    try {
      const response = await fetch(`${API_BASE_URL}/allocations/approved-applications`, {
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
      console.error('Error fetching approved applications:', error);
      throw error;
    }
  },

  // Get all lab sections with their TA slot information
  async getLabSectionsWithSlots() {
    try {
      const response = await fetch(`${API_BASE_URL}/allocations/lab-sections`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.labSections;
    } catch (error) {
      console.error('Error fetching lab sections:', error);
      throw error;
    }
  },

  // Get allocation statistics
  async getAllocationStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/allocations/stats`, {
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
      console.error('Error fetching allocation stats:', error);
      throw error;
    }
  },

  // Assign a student to a lab section
  async assignStudentToLabSection(userId: number, labSectionId: number, notes?: string, isMarker?: boolean) {
    try {
      const response = await fetch(`${API_BASE_URL}/allocations/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, labSectionId, notes, isMarker }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
        const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the status
        }

        // Handle specific error types with user-friendly messages
        if (errorMessage.includes('duplicate key value violates unique constraint')) {
          throw new Error('Student is already assigned to this lab section');
        }
        if (errorMessage.includes('ta_allocations_lab_section_id_user_id_key')) {
          throw new Error('Student is already assigned to this lab section');
        }
        if (response.status === 409) {
          throw new Error('Student is already assigned to this lab section');
        }
        if (response.status === 400) {
          throw new Error('Invalid assignment data provided');
        }
        if (response.status === 404) {
          throw new Error('Student or lab section not found');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error assigning student:', error);
      
      // Re-throw with more specific message if it's our custom error
      if (error instanceof Error && 
          (error.message.includes('already assigned') || 
           error.message.includes('not found') || 
           error.message.includes('Invalid assignment'))) {
      throw error;
      }
      
      // Generic fallback message
      throw new Error('Failed to assign student to lab section. Please try again.');
    }
  },

  // Unassign a student from a course
  async unassignStudent(allocationId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/allocations/${allocationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the status
        }

        if (response.status === 404) {
          throw new Error('Assignment not found or already removed');
        }
        if (response.status === 403) {
          throw new Error('Not authorized to remove this assignment');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unassigning student:', error);
      
      if (error instanceof Error && 
          (error.message.includes('not found') || 
           error.message.includes('Not authorized'))) {
      throw error;
      }
      
      throw new Error('Failed to unassign student. Please try again.');
    }
  },

  // Get student assignment history
  async getStudentAssignments(userId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/allocations/student/${userId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.assignments;
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      throw error;
    }
  },

  // Update marker designation for an allocation
  async updateMarkerDesignation(allocationId: number, isMarker: boolean) {
    try {
      const response = await fetch(`${API_BASE_URL}/allocations/${allocationId}/marker`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isMarker }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the status
        }

        if (response.status === 404) {
          throw new Error('Assignment not found');
        }
        if (response.status === 403) {
          throw new Error('Not authorized to update marker designation');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating marker designation:', error);
      
      if (error instanceof Error && 
          (error.message.includes('not found') || 
           error.message.includes('Not authorized'))) {
        throw error;
      }
      
      throw new Error('Failed to update marker designation. Please try again.');
    }
  },
}; 