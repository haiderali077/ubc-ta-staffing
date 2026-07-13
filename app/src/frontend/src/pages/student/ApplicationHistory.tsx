import React, { useEffect, useState } from "react";
import { getMyApplications } from "../../api/applicationApi";
import { useAuth } from "../../context/AuthContext";

// Types for mapped application and course preference
interface CoursePref {
  course_id: number;
  rank: number;
  course_code?: string;
  course_title?: string;
  term?: string;
}

interface Application {
  application_id: number;
  user_id: number;
  submitted_at: string;
  updated_at: string;
  status: string;
  notes?: string;
  coursePreferences: CoursePref[];
  domainAreas: string[];
  applicationType: string;
  termAvailability: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  allocated: "Allocated",
};

const statusStyles: Record<string, string> = {
  pending: "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-500",
  approved: "bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 border-green-200 dark:border-green-700",
  rejected: "bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700",
  allocated: "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700",
};

const ApplicationHistory: React.FC = () => {
  const { user } = useAuth();
  const userIdFromAuth = user?.user_id;
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map backend fields to frontend fields
  function mapApplication(raw: any): Application {
    return {
      application_id: raw.application_id,
      user_id: raw.user_id,
      submitted_at: raw.submitted_at,
      updated_at: raw.updated_at || raw.submitted_at, // Fallback to submitted_at if updated_at is not available
      status: raw.status,
      notes: raw.notes,
      coursePreferences: Array.isArray(raw.course_preferences)
        ? raw.course_preferences.map((cp: any) => ({
            course_id: cp.course_id,
            rank: cp.rank,
            course_code: cp.course_code,
            course_title: cp.course_title,
            term: cp.term,
          }))
        : [],
      domainAreas: raw.domain_areas || [],
      applicationType: raw.application_type,
      termAvailability: raw.term_availability,
    };
  }

  useEffect(() => {
    if (!userIdFromAuth) return;
    setLoading(true);
    setError(null);
    getMyApplications()
      .then((appsRaw) => {
        if (Array.isArray(appsRaw) && appsRaw.length > 0) {
          const mapped = appsRaw.map(mapApplication);
          setApplications(mapped);
        } else {
          setApplications([]);
        }
      })
      .catch(() => setError("Failed to load application data"))
      .finally(() => setLoading(false));
  }, [userIdFromAuth]);

  if (!userIdFromAuth) return null;

  if (loading)
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded shadow mt-8 dark:text-white">
        Loading applications...
      </div>
    );
  if (error)
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded shadow mt-8 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  if (!applications.length)
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded shadow mt-8">
        <div className="text-center text-gray-500 dark:text-gray-400 text-lg py-8">
          <span role="img" aria-label="empty">
            📭
          </span>{" "}
          <br />
          No TA applications found.
        </div>
      </div>
    );

  // Summary stats
  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded shadow mt-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">My Current Application</h1>
      
      {/* Information Notice */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-center">
          <span className="text-blue-600 dark:text-blue-400 mr-2">ℹ️</span>
          <div className="text-blue-800 dark:text-blue-200">
            <p className="font-medium">Current Application Status</p>
            <p className="text-sm mt-1">
              This shows your most recent application. When you submit a new application, it updates your current application rather than creating multiple separate applications.
            </p>
          </div>
        </div>
      </div>

      {/* Current Application Details */}
      <div className="space-y-6">
        {applications.map((app) => (
          <div key={app.application_id} className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Current Application
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Last updated: {new Date(app.updated_at).toLocaleString()}
                  {app.updated_at !== app.submitted_at && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      Originally submitted: {new Date(app.submitted_at).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`inline-block px-3 py-1 rounded-full border text-sm font-semibold ${
                  statusStyles[app.status] ||
                  "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {statusLabels[app.status] || app.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Application Type:</span>
                <p className="text-gray-900 dark:text-white">
                  {app.applicationType || <span className="text-gray-400 dark:text-gray-500">-</span>}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Course Preferences:</span>
              <div className="mt-2">
                {app.coursePreferences.length && app.coursePreferences.some(cp => cp.course_id && cp.course_id !== 0) ? (
                  app.coursePreferences
                    .filter(cp => cp.course_id && cp.course_id !== 0) // Only show valid course selections
                    .map((cp) => (
                    <span
                      key={cp.rank}
                      className="inline-block bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded px-3 py-1 mr-2 mb-2 border border-gray-200 dark:border-gray-500"
                    >
                      #{cp.rank}: {cp.course_code && cp.course_title
                        ? `${cp.course_code} - ${cp.course_title}`
                        : cp.course_code
                        ? cp.course_code
                        : `Course ID ${cp.course_id}`}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">No course preferences specified</span>
                )}
              </div>
            </div>

            {app.notes && (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes:</span>
                <p className="text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-600 rounded border dark:border-gray-500">
                  {app.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationHistory;
