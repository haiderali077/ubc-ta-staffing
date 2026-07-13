import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AssignmentCalendar from '../../components/calendar/AssignmentCalendar';
import { CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Assignment {
  allocation_id: number;
  lab_section_id: number;
  section_name: string;
  lab_days: string;
  lab_start_time: string;
  lab_end_time: string;
  course_code: string;
  course_title: string;
  term: string;
  allocated_at: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  allocated_by_name?: string;
  is_marker?: boolean;
}

const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8000/api/users/${user.user_id}/assignments`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assignments: ${response.status}`);
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAssignments();
  };

  const getAssignmentStats = () => {
    const total = assignments.length;
    const active = assignments.filter(a => a.status === 'active').length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const cancelled = assignments.filter(a => a.status === 'cancelled').length;

    return { total, active, completed, cancelled };
  };

  const stats = getAssignmentStats();

  if (!user || user.role !== 'student') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You must be logged in as a student to view assignments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My TA Assignments</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  View your teaching assistant assignments in calendar format
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Assignment Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📚</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Assignments
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-sm">✅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Active
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.active}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🎓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Completed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.completed}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-sm">❌</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Cancelled
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.cancelled}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading assignments
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleRefresh}
                    className="bg-red-100 dark:bg-red-800 px-4 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Calendar */}
        <div className="mb-8">
          <AssignmentCalendar 
            assignments={assignments} 
            loading={loading}
          />
        </div>

        {/* Assignment List Summary */}
        {!loading && assignments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Assignment Summary
              </h3>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.allocation_id}
                    className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {assignment.course_code} - {assignment.course_title}
                        {assignment.is_marker && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full flex items-center gap-1">
                            ⭐ Course Marker
                          </span>
                        )}
                      </h4>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {assignment.term} • Assigned: {new Date(assignment.allocated_at).toLocaleDateString()}
                        {assignment.allocated_by_name && ` • By: ${assignment.allocated_by_name}`}
                      </div>
                      {assignment.notes && (
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Notes:</span> {assignment.notes}
                        </div>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      assignment.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : assignment.status === 'completed'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                About TA Assignment Calendar
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  This calendar shows all your teaching assistant assignments. You can:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>View assignments by month using the navigation controls</li>
                  <li>Click on any day to see detailed assignment information</li>
                  <li>See assignment status: Active (green), Completed (blue), Cancelled (red)</li>
                  <li>View course details, notes, and who assigned you</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsPage; 