import React, { useState, useEffect } from 'react';
import { taCoordinatorApi } from '../../api/taCoordinatorApi';

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
  instructor_id?: number;
  instructor_name?: string;
  instructor_email?: string;
  dept_id?: number;
  template_id?: number;
  max_tas?: number;
  created_at?: string;
  updated_at?: string;
}

const InstructorAssignmentPage: React.FC = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<CourseWithInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithInstructor | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load instructors and courses in parallel
      const [instructorsData, coursesData] = await Promise.all([
        taCoordinatorApi.instructors.getAll(),
        taCoordinatorApi.instructors.getCoursesWithAssignments()
      ]);
      
      setInstructors(instructorsData);
      setCourses(coursesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignInstructor = async (courseId: number, instructorId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await taCoordinatorApi.instructors.assignToCourse(courseId, instructorId);
      
      // Reload data to reflect changes
      await loadData();
      setShowAssignmentModal(false);
      setSelectedCourse(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign instructor');
      console.error('Error assigning instructor:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignInstructor = async (courseId: number) => {
    if (!confirm('Are you sure you want to unassign this instructor?')) {
      return;
    }

    try {
      setError(null);
      await taCoordinatorApi.instructors.unassignFromCourse(courseId);
      
      // Reload data to reflect changes
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign instructor');
      console.error('Error unassigning instructor:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const assignedCourses = courses.filter(c => c.instructor_id);
  const unassignedCourses = courses.filter(c => !c.instructor_id);

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Instructor Assignment
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Assign instructors to courses for each academic term
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-blue-500 dark:border-cyan-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {courses.length}
              </p>
            </div>
            <div className="text-blue-400 dark:text-cyan-400">📚</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500 dark:border-green-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Assigned</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {assignedCourses.length}
              </p>
            </div>
            <div className="text-green-400">✅</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500 dark:border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Unassigned</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {unassignedCourses.length}
              </p>
            </div>
            <div className="text-yellow-400">⚠️</div>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Term
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assigned Instructor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {courses.map((course) => (
                <tr key={course.course_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {course.code}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {course.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {course.term}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {course.instructor_name ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {course.instructor_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {course.instructor_email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      course.instructor_id 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {course.instructor_id ? 'Assigned' : 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-2">
                    {course.instructor_id ? (
                      <button
                        onClick={() => handleUnassignInstructor(course.course_id!)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                      >
                        Unassign
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowAssignmentModal(true);
                        }}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                          Assign Instructor
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {courses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">📚</div>
            <p className="text-gray-500 dark:text-gray-400">
              No courses found. Please create courses first.
            </p>
          </div>
        )}
      </div>

      {/* Information Note */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div className="text-blue-400 mr-3">ℹ️</div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Assignment Workflow</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Assign qualified instructors to courses before the term begins. 
              Instructors can then submit TA requests for their assigned courses.
            </p>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Assign Instructor to {selectedCourse.code}
              </h2>
              <button
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-1"
                onClick={() => {
                  setShowAssignmentModal(false);
                  setSelectedCourse(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select an instructor to assign to <strong>{selectedCourse.code} - {selectedCourse.title}</strong>
                </p>
              </div>
              
              {instructors.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">👨‍🏫</div>
                  <p>No instructors available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {instructors.map((instructor) => (
                    <div
                      key={instructor.user_id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer transition-colors"
                      onClick={() => handleAssignInstructor(selectedCourse.course_id!, instructor.user_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                      <div className="font-medium text-gray-900 dark:text-white">{instructor.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{instructor.email}</div>
                        </div>
                        <div className="text-blue-500 dark:text-blue-400">→</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end">
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedCourse(null);
                  }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  Cancel
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorAssignmentPage; 