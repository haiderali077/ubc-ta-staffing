import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserCircleIcon, ArrowPathIcon, BookOpenIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import { instructorApi, type InstructorCourse, type InstructorTARequest } from "../../api/instructorApi";

// Re-export for local use
type CourseData = InstructorCourse;

// --- Assigned Courses Card ---
const AssignedCoursesCard: React.FC<{ onManageCourse: (courseId: number) => void }> = ({ onManageCourse }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = async () => {
    if (!user?.user_id) {
      console.log("No user ID found, user object:", user);
      console.log("Skipping course fetch - user_id is required");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    console.log("Fetching courses for instructor:", user.user_id);
    setLoading(true);
    try {
      const data = await instructorApi.getCourses();
      console.log("Received course data:", data);
      setCourses(data.courses || []);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      console.error("Error details:", error);
      // Show error to user
      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Assigned Courses</h2>
        </div>
        <div className="text-gray-500 dark:text-gray-400">Loading courses...</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          User ID: {user?.user_id || 'undefined'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Assigned Courses</h2>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            fetchCourses();
          }}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          disabled={refreshing}
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!user?.user_id ? (
        <div className="text-center py-8">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">Authentication Issue</h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-2">User ID is missing from your session.</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Please try logging out and logging back in.</p>
            <div className="mt-4 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
              Debug: user_id = {user?.user_id || 'undefined'}
            </div>
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Courses Assigned</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't been assigned to any courses this term.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Contact your TA Coordinator if you believe this is an error.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.course_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{course.code}</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                      {course.term}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{course.title}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Current TAs:</span> {course.current_tas || 0}
                    </div>
                    <div>
                      <span className="font-medium">Open Requests:</span> {
                        course.ta_needs?.filter(need => need.status === 'open').length || 0
                      }
                    </div>
                  </div>

                  {course.ta_needs && course.ta_needs.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TA Requirements:</h4>
                      <div className="space-y-2">
                        {course.ta_needs.map((need) => (
                          <div key={need.need_id} className="text-sm bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Requested:</span>
                              <span>{need.hours_required} hrs/week</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                need.status === 'open' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                                need.status === 'filled' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              }`}>
                                {need.status}
                              </span>
                            </div>
                            {need.qualifications && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span className="font-medium">Qualifications:</span> {need.qualifications}
                              </div>
                            )}
                            {need.notes && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Notes:</span> {need.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={() => onManageCourse(course.course_id)}
                    className="px-3 py-2 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    Manage TAs
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- TA Requests Summary Card ---
const TARequestsSummary: React.FC<{ onViewAll: () => void }> = ({ onViewAll }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<InstructorTARequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    
    const fetchRequests = async () => {
      try {
        console.log("Fetching TA requests for instructor");
        const data = await instructorApi.getTARequests();
        console.log("Received TA requests data:", data);
        setRequests(data.requests || []);
      } catch (error) {
        console.error("Failed to fetch TA requests:", error);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AcademicCapIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">TA Requests</h2>
        </div>
        <div className="text-gray-500 dark:text-gray-400">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">TA Requests</h2>
        </div>
        <button
          onClick={onViewAll}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </button>
      </div>

      {requests.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No pending TA requests</p>
      ) : (
        <div className="space-y-2">
          {requests.slice(0, 3).map((request, index) => (
            <div key={index} className="text-sm border-l-4 border-blue-500 dark:border-blue-400 pl-3 py-1">
              <div className="font-medium text-gray-900 dark:text-white">{request.course_code}</div>
              <div className="text-gray-600 dark:text-gray-400">{request.hours_required} hrs/week needed</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">{request.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Quick Actions Card ---
const QuickActionsCard: React.FC<{ onSubmitRequest: () => void }> = ({ onSubmitRequest }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="space-y-3">
        <button
          onClick={onSubmitRequest}
          className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-left"
        >
          Submit TA Request
        </button>
        <button
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
        >
          View My Courses
        </button>
        <button
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
        >
          Manage Course Settings
        </button>
      </div>
    </div>
  );
};

// --- Main Instructor Dashboard ---
export const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleManageCourse = (courseId: number) => {
    navigate(`/course/${courseId}/manage`);
  };

  const handleSubmitRequest = () => {
    navigate("/submit-request");
  };

  const handleViewAllRequests = () => {
    navigate("/ta-requests");
  };

  // Debug logging
  console.log("InstructorDashboard rendering, user:", user);

  if (!user) {
    console.log("No user found, showing loading");
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Loading...</h1>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "instructor") {
    console.log("User is not instructor, role:", user.role);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You need instructor privileges to access this page.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Current role: {user.role}</p>
        </div>
      </div>
    );
  }

  console.log("Rendering instructor dashboard for user:", user.name);

  // Test alert to confirm component is rendering
  React.useEffect(() => {
    console.log("InstructorDashboard component mounted");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <UserCircleIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Welcome, {user.name}
          </h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            <AssignedCoursesCard onManageCourse={handleManageCourse} />
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <TARequestsSummary onViewAll={handleViewAllRequests} />
            <QuickActionsCard onSubmitRequest={handleSubmitRequest} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard; 