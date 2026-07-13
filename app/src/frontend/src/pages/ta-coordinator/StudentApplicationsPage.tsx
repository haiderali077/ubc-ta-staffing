import React, { useState, useEffect } from "react";
import { taCoordinatorApi } from "../../api/taCoordinatorApi";

// AvailabilityGrid component to display weekly schedule with 30-minute intervals
const AvailabilityGrid: React.FC<{ availability: string }> = ({
  availability,
}) => {
  const parseAvailability = (availStr: string) => {
    try {
      return JSON.parse(availStr);
    } catch {
      return null;
    }
  };

  // Generate time slots with 30-minute intervals from 8:00 to 17:30
  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minutes = i % 2 === 0 ? "00" : "30";
    return `${hour}:${minutes}`;
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Parse availability data
  const rawSchedule = parseAvailability(availability);
  if (!rawSchedule || !Array.isArray(rawSchedule)) {
    return <p className="text-gray-500 dark:text-gray-400 mt-2">Unable to parse schedule data</p>;
  }

  // Convert hourly format to 30-min format if needed
  let schedule = rawSchedule;
  if (rawSchedule.length < timeSlots.length) {
    // Convert from hourly to half-hourly
    schedule = Array(timeSlots.length)
      .fill(null)
      .map(() => Array(days.length).fill(false));

    rawSchedule.forEach((row: boolean[], rowIndex: number) => {
      const newRowIndex = rowIndex * 2;
      if (newRowIndex < timeSlots.length) {
        row.forEach((cell: boolean, colIndex: number) => {
          schedule[newRowIndex][colIndex] = cell;
          if (newRowIndex + 1 < timeSlots.length) {
            schedule[newRowIndex + 1][colIndex] = cell;
          }
        });
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="bg-white dark:bg-gray-800">
          {/* Header with gradient background */}
          <div className="grid grid-cols-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div className="py-2 px-2 text-center border-r border-blue-500">
              <span className="text-xs font-medium">Time</span>
            </div>
            {days.map((day) => (
              <div key={day} className="py-2 px-2 text-center">
                <span className="text-xs font-medium">
                  {day.substring(0, 3)}
                </span>
              </div>
            ))}
          </div>

          {/* Schedule grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <tbody>
                {timeSlots.map((timeSlot, rowIdx) => (
                  <tr
                    key={timeSlot}
                    className={rowIdx % 2 === 0 ? "bg-gray-50 dark:bg-gray-700" : "dark:bg-gray-800"}
                  >
                    <td className="border-r border-gray-200 dark:border-gray-600 px-2 py-1 w-24 text-center text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {timeSlot}
                    </td>
                    {days.map((day, colIdx) => {
                      const isUnavailable =
                        schedule[rowIdx] && schedule[rowIdx][colIdx];
                      return (
                        <td key={`${timeSlot}-${day}`} className="p-0 w-1/6">
                          <div
                            className={`w-full h-7 flex items-center justify-center border border-gray-300 dark:border-gray-600
                              ${isUnavailable ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"}
                            `}
                            title={
                              isUnavailable ? "Not available" : "Available"
                            }
                          >
                            {isUnavailable && (
                              <svg
                                className="w-4 h-4 text-red-600 dark:text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 p-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 rounded"></div>
              <span>Not available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StudentApplication {
  application_id: number;
  user_id: number;
  submitted_at: string;
  updated_at: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  applicant_name: string;
  applicant_email: string;
  major: string;
  student_number?: string;
  domain_areas?: string[]; // Domain areas of expertise
  course_preferences: Array<{
    course_id: number;
    rank: number;
    course_code: string;
    course_title: string;
    course_term: string;
  }>;
  // Add snapshot fields
  technical_skills?: string;
  relevant_coursework?: string;
  overall_gpa?: number;
  expected_graduation?: string;
  weekly_availability?: string;
  teaching_experience?: string;
  transcript_url?: string; // Added for transcript URL
}

interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const StudentApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved"
  >("all");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [detailsApp, setDetailsApp] = useState<StudentApplication | null>(null);
  const [shortlistedApps, setShortlistedApps] = useState<{
    [key: number]: boolean;
  }>({});
  // Add GPA filter states
  const [gpaFilter, setGpaFilter] = useState({ min: '', max: '', major: '' });

  // Define backendUrl inside the component so it is always in scope
  const backendUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:8000";

  // Helper function to format GPA display
  const formatGPA = (gpa: any): string => {
    if (gpa === undefined || gpa === null) return 'N/A';
    const numericGPA = Number(gpa);
    return isNaN(numericGPA) ? 'N/A' : numericGPA.toFixed(2);
  };

  // Load applications and stats
  const loadData = async () => {
    try {
      setLoading(true);
      const [applicationsData, statsData] = await Promise.all([
        taCoordinatorApi.applications.getAll(),
        taCoordinatorApi.applications.getStats(),
      ]);
      setApplications(applicationsData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load applications data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load applications by status
  const loadApplicationsByStatus = async (
    status: "pending" | "approved"
  ) => {
    try {
      setLoading(true);
      const applicationsData = await taCoordinatorApi.applications.getByStatus(
        status
      );
      setApplications(applicationsData);
      setError(null);
    } catch (err) {
      console.error("Error loading applications by status:", err);
      setError("Failed to load applications by status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter applications based on GPA and major
  const filteredApplications = applications.filter(application => {
    // GPA filter
    if (gpaFilter.min && application.overall_gpa !== undefined && application.overall_gpa !== null) {
      const gpa = Number(application.overall_gpa);
      if (!isNaN(gpa) && gpa < parseFloat(gpaFilter.min)) {
        return false;
      }
    }
    if (gpaFilter.max && application.overall_gpa !== undefined && application.overall_gpa !== null) {
      const gpa = Number(application.overall_gpa);
      if (!isNaN(gpa) && gpa > parseFloat(gpaFilter.max)) {
        return false;
      }
    }
    
    // Major filter
    if (gpaFilter.major && application.major !== gpaFilter.major) {
      return false;
    }
    
    return true;
  });

  // Handle GPA filter change
  const handleGpaFilterChange = (field: string, value: string) => {
    setGpaFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setGpaFilter({ min: '', max: '', major: '' });
  };

  // Handle status filter change
  const handleStatusFilterChange = (
    newStatus: "all" | "pending" | "approved"
  ) => {
    setStatusFilter(newStatus);
    if (newStatus === "all") {
      loadData();
    } else {
      loadApplicationsByStatus(newStatus);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (
    applicationId: number,
    newStatus: "pending" | "approved" | "rejected",
    notes?: string
  ) => {
    try {
      setProcessingId(applicationId);
      await taCoordinatorApi.applications.updateStatus(
        applicationId,
        newStatus,
        notes
      );

      // Reload data after successful update
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadApplicationsByStatus(statusFilter);
      }
    } catch (err) {
      console.error("Error updating application status:", err);
      setError("Failed to update application status. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle application deletion
  const handleDeleteApplication = async (applicationId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setProcessingId(applicationId);
      await taCoordinatorApi.applications.delete(applicationId);

      // Reload data after successful deletion
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadApplicationsByStatus(statusFilter);
      }
    } catch (err) {
      console.error("Error deleting application:", err);
      setError("Failed to delete application. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get the most relevant timestamp to display
  const getDisplayTimestamp = (application: StudentApplication) => {
    // If the application was updated after submission, show the updated time
    if (
      application.updated_at &&
      application.updated_at !== application.submitted_at
    ) {
      return application.updated_at;
    }
    // Otherwise show the submitted time
    return application.submitted_at;
  };

  // Get the label for the timestamp being displayed
  const getTimestampLabel = (application: StudentApplication) => {
    // If the application was updated after submission, show "Updated"
    if (
      application.updated_at &&
      application.updated_at !== application.submitted_at
    ) {
      return "Updated";
    }
    // Otherwise show "Submitted"
    return "Submitted";
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle shortlist toggle
  const handleShortlistToggle = (applicationId: number) => {
    setShortlistedApps((prev) => ({
      ...prev,
      [applicationId]: !prev[applicationId],
    }));
  };

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    const pendingApplications = filteredApplications.filter(app => app.status === "pending");
    const allSelected = pendingApplications.every(app => shortlistedApps[app.application_id]);
    
    if (allSelected) {
      // Deselect all pending applications
      const newShortlisted = { ...shortlistedApps };
      pendingApplications.forEach(app => {
        delete newShortlisted[app.application_id];
      });
      setShortlistedApps(newShortlisted);
    } else {
      // Select all pending applications
      const newShortlisted = { ...shortlistedApps };
      pendingApplications.forEach(app => {
        newShortlisted[app.application_id] = true;
      });
      setShortlistedApps(newShortlisted);
    }
  };

  // Check if all pending applications are selected
  const pendingApplicationsInView = filteredApplications.filter(app => app.status === "pending");
  const allPendingSelected = pendingApplicationsInView.length > 0 && 
    pendingApplicationsInView.every(app => shortlistedApps[app.application_id]);

  // Get count of shortlisted applications
  const shortlistedCount =
    Object.values(shortlistedApps).filter(Boolean).length;

  // Handle send offers to shortlisted
  const handleSendOffers = async () => {
    const shortlistedIds = Object.keys(shortlistedApps)
      .filter((id) => shortlistedApps[parseInt(id)])
      .map((id) => parseInt(id));

    if (shortlistedIds.length === 0) {
      alert("Please select at least one candidate before approving.");
      return;
    }

    if (
      !confirm(
        `Approve ${shortlistedIds.length} selected applications?`
      )
    ) {
      return;
    }

    try {
      // Update status to 'approved' for shortlisted candidates
      for (const appId of shortlistedIds) {
        await taCoordinatorApi.applications.updateStatus(appId, "approved");
      }

      // Clear shortlist selections
      setShortlistedApps({});

      // Reload data
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadApplicationsByStatus(statusFilter);
      }

      alert(`Successfully approved ${shortlistedIds.length} applications!`);
    } catch (err) {
      console.error("Error approving applications:", err);
      setError("Failed to approve applications. Please try again.");
    }
  };

  // Handle approve all pending applications
  const handleApproveAll = async () => {
    const pendingIds = pendingApplicationsInView.map(app => app.application_id);

    if (pendingIds.length === 0) {
      alert("No pending applications to approve.");
      return;
    }

    if (
      !confirm(
        `Approve all ${pendingIds.length} pending applications in the current view?`
      )
    ) {
      return;
    }

    try {
      // Update status to 'approved' for all pending applications
      for (const appId of pendingIds) {
        await taCoordinatorApi.applications.updateStatus(appId, "approved");
      }

      // Clear shortlist selections
      setShortlistedApps({});

      // Reload data
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadApplicationsByStatus(statusFilter);
      }

      alert(`Successfully approved ${pendingIds.length} applications!`);
    } catch (err) {
      console.error("Error approving all applications:", err);
      setError("Failed to approve all applications. Please try again.");
    }
  };

  // Handle approve high GPA applications (3.5+)
  const handleApproveHighGPA = async () => {
    const highGPAApplications = pendingApplicationsInView.filter(app => {
      const gpa = Number(app.overall_gpa);
      return !isNaN(gpa) && gpa >= 3.5;
    });

    if (highGPAApplications.length === 0) {
      alert("No pending applications with GPA ≥ 3.5 found in current view.");
      return;
    }

    if (
      !confirm(
        `Approve ${highGPAApplications.length} applications with GPA ≥ 3.5?`
      )
    ) {
      return;
    }

    try {
      // Update status to 'approved' for high GPA applications
      for (const app of highGPAApplications) {
        await taCoordinatorApi.applications.updateStatus(app.application_id, "approved");
      }

      // Clear shortlist selections
      setShortlistedApps({});

      // Reload data
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadApplicationsByStatus(statusFilter);
      }

      alert(`Successfully approved ${highGPAApplications.length} high GPA applications!`);
    } catch (err) {
      console.error("Error approving high GPA applications:", err);
      setError("Failed to approve high GPA applications. Please try again.");
    }
  };

  if (loading && !applications.length) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Student Applications
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review and evaluate TA position applications from students
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Statistics Cards - Compact */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border-l-4 border-gray-500 dark:border-gray-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="text-gray-400 dark:text-gray-500 text-lg">📋</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border-l-4 border-yellow-500 dark:border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Pending</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.pending}
                </p>
              </div>
              <div className="text-yellow-400 text-lg">⏳</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border-l-4 border-green-500 dark:border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Approved</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {stats.approved}
                </p>
              </div>
              <div className="text-green-400 text-lg">✅</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="space-y-4">
          {/* Status Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-4">
                Filter by Status:
              </label>
              {(["all", "pending", "approved"] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilterChange(status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {status === "all"
                      ? "All"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                )
              )}
            </div>

            {/* Shortlist Actions in Navbar */}
            {shortlistedCount > 0 && (
              <div className="flex items-center space-x-3 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-700">
                  {shortlistedCount} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSendOffers}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    title="Approve selected applications"
                  >
                    Approve Selected
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Actions for All Pending */}
            {pendingApplicationsInView.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleApproveAll}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  title="Approve all pending applications in current view"
                >
                  Approve All ({pendingApplicationsInView.length})
                </button>
                <button
                  onClick={handleApproveHighGPA}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  title="Approve all pending applications with GPA ≥ 3.5"
                >
                  Approve High GPA (3.5+)
                </button>
              </div>
            )}
          </div>

          {/* GPA and Additional Filters Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                GPA Range:
              </label>
              <input
                type="number"
                placeholder="Min"
                min="0"
                max="4.0"
                step="0.1"
                value={gpaFilter.min}
                onChange={(e) => handleGpaFilterChange('min', e.target.value)}
                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500 dark:text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                min="0"
                max="4.0"
                step="0.1"
                value={gpaFilter.max}
                onChange={(e) => handleGpaFilterChange('max', e.target.value)}
                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Major:
              </label>
              <select
                value={gpaFilter.major}
                onChange={(e) => handleGpaFilterChange('major', e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Majors</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Statistics">Statistics</option>
                <option value="Engineering">Engineering</option>
                <option value="Physics">Physics</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {(gpaFilter.min || gpaFilter.max || gpaFilter.major) && (
              <button
                onClick={resetFilters}
                className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Reset Filters
              </button>
            )}

            {/* Filter Summary */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredApplications.length} of {applications.length} applications
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-8">
                  {pendingApplicationsInView.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={handleSelectAllToggle}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      title="Select all pending applications"
                    />
                  )}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Major
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  GPA
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApplications.map((application) => (
                <tr
                  key={application.application_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {application.status === "pending" && (
                        <input
                          type="checkbox"
                          checked={
                            shortlistedApps[application.application_id] || false
                          }
                          onChange={() =>
                            handleShortlistToggle(application.application_id)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {application.applicant_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {application.applicant_email}
                      </div>
                      {application.student_number && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          ID: {application.student_number}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {application.major}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatGPA(application.overall_gpa)}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs">
                      <div className="text-gray-900 dark:text-white">
                        {formatDate(getDisplayTimestamp(application))}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        {getTimestampLabel(application)}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                        application.status
                      )}`}
                    >
                      {application.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {(application.status === "approved" ||
                        application.status === "rejected") && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              application.application_id,
                              "pending"
                            )
                          }
                          disabled={processingId === application.application_id}
                          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                          title="Reopen application"
                        >
                          ↻
                        </button>
                      )}
                      <button
                        onClick={() => setDetailsApp(application)}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                        title="View details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteApplication(application.application_id)
                        }
                        disabled={processingId === application.application_id}
                        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
                        title="Delete application"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredApplications.length === 0 && !loading && applications.length > 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">🔍</div>
            <p className="text-gray-500 dark:text-gray-400">
              No applications match the current filters.
            </p>
          </div>
        )}

        {applications.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">📋</div>
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter === "all"
                ? "No applications found."
                : `No ${statusFilter} applications found.`}
            </p>
          </div>
        )}
      </div>

      {/* Information Note - Compact */}
      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-center">
          <div className="text-blue-400 mr-2 text-sm">ℹ️</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="mb-2">
              <strong>Bulk Actions Available:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li><strong>Select All:</strong> Use the checkbox in the table header to select all pending applications</li>
              <li><strong>Approve Selected:</strong> Select individual applications and use the action buttons</li>
              <li><strong>Approve All:</strong> Process all pending applications in the current view</li>
              <li><strong>Approve High GPA (3.5+):</strong> Quickly approve all applications with GPA ≥ 3.5</li>
            </ul>
            <p>
              <strong>Note:</strong> Only the latest application per student is displayed. Approved applications become available for assignment in the TA Allocation workflow.
            </p>
          </div>
        </div>
      </div>

      {detailsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Application Details
              </h2>
              <button
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-1"
                onClick={() => setDetailsApp(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Student Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                  Student Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Name:</span>
                    <p className="text-gray-900 dark:text-white">{detailsApp.applicant_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Email:</span>
                    <p className="text-gray-900 dark:text-white">
                      {detailsApp.applicant_email}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Major:</span>
                    <p className="text-gray-900 dark:text-white">{detailsApp.major || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      Student Number:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {detailsApp.student_number || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Academic Profile */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                  Academic Profile
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">GPA:</span>
                    <p className="text-gray-900 dark:text-white">
                      {formatGPA(detailsApp.overall_gpa)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      Expected Graduation:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {detailsApp.expected_graduation
                        ? new Date(
                            detailsApp.expected_graduation
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      Relevant Coursework:
                    </span>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {detailsApp.relevant_coursework || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Uploaded Transcript */}
              {detailsApp.transcript_url && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                    Uploaded Transcript
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <a
                      href={`${backendUrl}${detailsApp.transcript_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline"
                    >
                      View Transcript
                    </a>
                  </div>
                </div>
              )}
              {/* Technical Skills */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                  Technical Skills & Experience
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      Technical Skills:
                    </span>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {detailsApp.technical_skills || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      Previous TA Experience:
                    </span>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {detailsApp.teaching_experience || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Availability */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                  Availability
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    Weekly Schedule:
                  </span>
                  {detailsApp.weekly_availability ? (
                    <AvailabilityGrid
                      availability={detailsApp.weekly_availability}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white mt-1">
                      No availability data provided
                    </p>
                  )}
                </div>
              </div>
              {/* Course Preferences */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                  Course Preferences
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {detailsApp.course_preferences &&
                  detailsApp.course_preferences.length > 0 ? (
                    <ol className="space-y-2">
                      {detailsApp.course_preferences.map((pref) => (
                        <li
                          key={pref.course_id}
                          className="flex items-center space-x-3"
                        >
                          <span className="inline-flex items-center justify-center w-6 h-6 text-sm font-medium text-white bg-purple-500 rounded-full">
                            {pref.rank}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            <strong>{pref.course_code}</strong> -{" "}
                            {pref.course_title}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      No course preferences specified
                    </p>
                  )}
                </div>
              </div>
              
              {/* Domain Areas */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                  Domain Areas of Expertise
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {detailsApp.domain_areas && detailsApp.domain_areas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {detailsApp.domain_areas.map((domain, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-500"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      No domain areas specified
                    </p>
                  )}
                </div>
              </div>
              
              {/* Application Status & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                    Application Status
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-300">Status:</span>
                      <span
                        className={`ml-2 inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                          detailsApp.status
                        )}`}
                      >
                        {detailsApp.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        Submitted:
                      </span>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(detailsApp.submitted_at)}
                      </p>
                    </div>
                    {detailsApp.updated_at &&
                      detailsApp.updated_at !== detailsApp.submitted_at && (
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            Last Updated:
                          </span>
                          <p className="text-gray-900 dark:text-white">
                            {formatDate(detailsApp.updated_at)}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                    Additional Notes
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-900 dark:text-white">
                      {detailsApp.notes || "No additional notes provided"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentApplicationsPage;
