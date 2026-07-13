import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { instructorApi, type InstructorCourse, type InstructorCourseDetails } from '../../api/instructorApi';
import { 
  BookOpenIcon, 
  UserGroupIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface StudentInfo {
  user_id: number;
  name: string;
  email: string;
  major?: string;
  student_number?: string;
  labs?: string[];
}

interface CourseWithAssignedTAs {
  course: InstructorCourse;
  assigned_tas: StudentInfo[];
  loading: boolean;
  error?: string;
}

const AssignedTAsPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [courseDetails, setCourseDetails] = useState<Map<number, CourseWithAssignedTAs>>(new Map());
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await instructorApi.getCourses();
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId: number) => {
    try {
      // Set loading state for this specific course
      setCourseDetails(prev => new Map(prev).set(courseId, {
        course: courses.find(c => c.course_id === courseId)!,
        assigned_tas: [],
        loading: true
      }));

      const data = await instructorApi.getCourseDetails(courseId);
      
      // Transform TA assignments to student info
      const studentPromises = data.course.assigned_tas.map(async (ta) => {
        try {
          // Fetch student details
          const response = await fetch(`http://localhost:8000/api/users/${ta.user_id}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch student details');
          }
          
          const studentData = await response.json();
          return {
            user_id: ta.user_id,
            name: studentData.name || `${studentData.first_name} ${studentData.last_name}`,
            email: studentData.email,
            major: studentData.major,
            student_number: studentData.student_number,
            labs: ['Lab 1', 'Lab 2'] // This would come from backend in real implementation
          };
        } catch (err) {
          console.error(`Failed to fetch details for student ${ta.user_id}:`, err);
          return {
            user_id: ta.user_id,
            name: 'Unknown Student',
            email: 'N/A',
            major: 'N/A',
            labs: []
          };
        }
      });

      const students = await Promise.all(studentPromises);

      setCourseDetails(prev => new Map(prev).set(courseId, {
        course: data.course,
        assigned_tas: students,
        loading: false
      }));

    } catch (err) {
      console.error('Failed to fetch course details:', err);
      setCourseDetails(prev => new Map(prev).set(courseId, {
        course: courses.find(c => c.course_id === courseId)!,
        assigned_tas: [],
        loading: false,
        error: 'Failed to load assigned TAs'
      }));
    }
  };

  const handleCourseClick = (courseId: number) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      if (!courseDetails.has(courseId)) {
        fetchCourseDetails(courseId);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500 dark:text-red-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error Loading Courses</h1>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button 
              onClick={fetchCourses}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-800/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-700/30 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <UserGroupIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assigned TAs</h1>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-12">
            <AcademicCapIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Courses Found</h3>
            <p className="text-gray-500 dark:text-gray-400">You don't have any courses assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => {
              const details = courseDetails.get(course.course_id);
              const isExpanded = expandedCourse === course.course_id;

              return (
                <div key={course.course_id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleCourseClick(course.course_id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {course.code} - {course.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{course.term}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {details?.assigned_tas?.length || course.current_tas || 0} TAs assigned
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                      {details?.loading ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          Loading assigned TAs...
                        </div>
                      ) : details?.error ? (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <ExclamationTriangleIcon className="w-5 h-5" />
                          {details.error}
                        </div>
                      ) : details?.assigned_tas?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                          <p>No TAs assigned to this course yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {details?.assigned_tas.map((ta) => (
                            <div key={ta.user_id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                  {ta.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{ta.name}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <EnvelopeIcon className="w-4 h-4" />
                                  <a href={`mailto:${ta.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    {ta.email}
                                  </a>
                                </div>
                                {ta.major && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    <span className="font-medium">Major:</span> {ta.major}
                                  </p>
                                )}
                                {ta.student_number && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    <span className="font-medium">Student #:</span> {ta.student_number}
                                  </p>
                                )}
                                {ta.labs && ta.labs.length > 0 && (
                                  <div className="mt-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Labs:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {ta.labs.map((lab, index) => (
                                        <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                          {lab}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedTAsPage; 