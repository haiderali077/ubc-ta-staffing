import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { instructorApi, type InstructorCourseDetails } from '../../api/instructorApi';
import { 
  ArrowLeftIcon,
  UserGroupIcon, 
  EnvelopeIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface StudentInfo {
  user_id: number;
  name: string;
  email: string;
  major?: string;
  student_number?: string;
}

const CourseManagePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [courseDetails, setCourseDetails] = useState<InstructorCourseDetails | null>(null);
  const [assignedTAs, setAssignedTAs] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(parseInt(courseId));
    }
  }, [courseId]);

  const fetchCourseDetails = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await instructorApi.getCourseDetails(id);
      setCourseDetails(data.course);
      
      // Fetch detailed student information for each assigned TA
      const studentPromises = data.course.assigned_tas.map(async (ta) => {
        try {
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
          };
        } catch (err) {
          console.error(`Failed to fetch details for student ${ta.user_id}:`, err);
          return {
            user_id: ta.user_id,
            name: 'Unknown Student',
            email: 'N/A',
            major: 'N/A',
          };
        }
      });
      
      const students = await Promise.all(studentPromises);
      setAssignedTAs(students);
      
    } catch (err) {
      console.error('Failed to fetch course details:', err);
      setError('Failed to load course details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-gray-600 dark:text-gray-400">Loading course details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-6 max-w-md">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchCourseDetails(parseInt(courseId!))}
            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!courseDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Course not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                {courseDetails.code} - {courseDetails.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{courseDetails.term}</p>
            </div>
          </div>
        </div>

        {/* Course Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <UserGroupIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{assignedTAs.length}</p>
                <p className="text-gray-600 dark:text-gray-400">Assigned TAs</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <AcademicCapIcon className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {courseDetails.ta_needs?.reduce((sum, need) => sum + need.hours_required, 0) || 0}
                </p>
                <p className="text-gray-600 dark:text-gray-400">Hrs/Week Requested</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <EnvelopeIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {courseDetails.ta_needs?.filter(need => need.status === 'open').length || 0}
                </p>
                <p className="text-gray-600 dark:text-gray-400">Open Requests</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned TAs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Assigned TAs ({assignedTAs.length})
            </h2>
          </div>
          
          <div className="p-6">
            {assignedTAs.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No TAs assigned yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  TAs will appear here once they are assigned to this course.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedTAs.map((ta) => (
                  <div
                    key={ta.user_id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">
                          {ta.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{ta.name}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p className="flex items-center">
                            <EnvelopeIcon className="w-4 h-4 mr-1" />
                            {ta.email}
                          </p>
                          {ta.major && (
                            <p className="flex items-center">
                              <AcademicCapIcon className="w-4 h-4 mr-1" />
                              {ta.major}
                            </p>
                          )}
                          {ta.student_number && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Student #: {ta.student_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <a
                        href={`mailto:${ta.email}`}
                        className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                      >
                        Contact
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagePage;
