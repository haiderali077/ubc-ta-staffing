/**
 * API client for conflict detection and management
 * UR 2.7: Must be able to view conflicts when scheduling students
 */

import { ConflictDetails } from '../components/allocation/ConflictIndicator';

const BASE_URL = '/api';

export interface AssignmentRequest {
  userId: number;
  labSectionId: number;
  courseId?: number;
  isMarker?: boolean;
  notes?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictDetails[];
  summary: {
    totalConflicts: number;
    criticalConflicts: number;
    overridableConflicts: number;
  };
  assignmentDetails?: {
    userId: number;
    labSectionId: number;
    isMarker: boolean;
  };
  recommendations?: string[];
}

export interface AssignmentWithConflictsRequest extends AssignmentRequest {
  overrideConflicts?: boolean;
  acknowledgedConflicts?: string[];
  conflictResolutions?: Record<string, string>;
}

export interface AssignmentResponse {
  success: boolean;
  allocation: any;
  conflictInfo?: {
    conflictsDetected: number;
    conflictsOverridden: boolean;
    summary: {
      totalConflicts: number;
      criticalConflicts: number;
      overridableConflicts: number;
    };
  };
  message: string;
}

export interface AllAssignmentConflictsResponse {
  totalAssignments: number;
  conflictSummary: {
    assignmentsWithConflicts: number;
    totalConflicts: number;
    criticalConflicts: number;
  };
  conflicts: ConflictCheckResult[];
}

export interface StudentConflictAnalysis {
  userId: number;
  totalLabSections: number;
  sectionsWithConflicts: number;
  conflictAnalysis: Array<{
    labSection: {
      id: number;
      courseCode: string;
      sectionName: string;
      schedule: string;
    };
    conflicts: ConflictCheckResult;
  }>;
}

class ConflictApiError extends Error {
  constructor(message: string, public status: number, public details?: any) {
    super(message);
    this.name = 'ConflictApiError';
  }
}

/**
 * Handle API responses and errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'Unknown error occurred' };
    }

    throw new ConflictApiError(
      errorData.error || `HTTP ${response.status}`,
      response.status,
      errorData.details || errorData
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ConflictApiError('Invalid JSON response', 500);
  }
}

/**
 * Conflict API functions
 */
export const conflictApi = {
  /**
   * Get all conflicts for current assignments
   * GET /api/conflicts/assignments
   */
  async getAllAssignmentConflicts(): Promise<AllAssignmentConflictsResponse> {
    const response = await fetch(`${BASE_URL}/conflicts/assignments`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<AllAssignmentConflictsResponse>(response);
  },

  /**
   * Check conflicts for a specific potential assignment
   * POST /api/conflicts/check
   */
  async checkAssignmentConflicts(assignment: AssignmentRequest): Promise<ConflictCheckResult> {
    const response = await fetch(`${BASE_URL}/conflicts/check`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignment),
    });

    return handleResponse<ConflictCheckResult>(response);
  },

  /**
   * Assign student to lab section with conflict handling
   * POST /api/allocations/assign-with-conflicts
   */
  async assignWithConflictHandling(assignment: AssignmentWithConflictsRequest): Promise<AssignmentResponse> {
    const response = await fetch(`${BASE_URL}/allocations/assign-with-conflicts`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignment),
    });

    // Special handling for conflict status (409)
    if (response.status === 409) {
      const conflictData = await response.json();
      throw new ConflictApiError('Assignment conflicts detected', 409, conflictData);
    }

    return handleResponse<AssignmentResponse>(response);
  },

  /**
   * Get potential conflicts for a specific student across all possible assignments
   * GET /api/conflicts/student/:userId
   */
  async getStudentConflictAnalysis(userId: number): Promise<StudentConflictAnalysis> {
    const response = await fetch(`${BASE_URL}/conflicts/student/${userId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<StudentConflictAnalysis>(response);
  },

  /**
   * Batch check conflicts for multiple assignments
   */
  async batchCheckConflicts(assignments: AssignmentRequest[]): Promise<ConflictCheckResult[]> {
    const conflictPromises = assignments.map(assignment => 
      this.checkAssignmentConflicts(assignment).catch(error => ({
        hasConflicts: true,
        conflicts: [{
          type: 'unknown' as any,
          severity: 'high' as any,
          message: `Error checking conflicts: ${error.message}`,
          description: 'Unable to verify conflicts due to an error',
          conflictingElements: [],
          resolutionSuggestions: ['Try again later', 'Contact system administrator'],
          canOverride: false
        }],
        summary: {
          totalConflicts: 1,
          criticalConflicts: 1,
          overridableConflicts: 0
        }
      }))
    );

    return Promise.all(conflictPromises);
  },

  /**
   * Get conflict statistics for dashboard
   */
  async getConflictStatistics(): Promise<{
    totalActiveAssignments: number;
    assignmentsWithConflicts: number;
    totalConflicts: number;
    criticalConflicts: number;
    recentConflictTrends: Array<{
      date: string;
      conflicts: number;
    }>;
  }> {
    try {
      const allConflicts = await this.getAllAssignmentConflicts();
      
      return {
        totalActiveAssignments: allConflicts.totalAssignments,
        assignmentsWithConflicts: allConflicts.conflictSummary.assignmentsWithConflicts,
        totalConflicts: allConflicts.conflictSummary.totalConflicts,
        criticalConflicts: allConflicts.conflictSummary.criticalConflicts,
        recentConflictTrends: [] // Would need additional endpoint for trends
      };
    } catch (error) {
      console.error('Error fetching conflict statistics:', error);
      return {
        totalActiveAssignments: 0,
        assignmentsWithConflicts: 0,
        totalConflicts: 0,
        criticalConflicts: 0,
        recentConflictTrends: []
      };
    }
  }
};

export default conflictApi;
export { ConflictApiError };