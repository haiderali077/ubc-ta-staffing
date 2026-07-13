import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyApplications } from "../../api/applicationApi";
import { getNotifications } from "../../api/notificationApi";
import AvailabilityCalendarWidget from "../../components/dashboards/studentDashboardWidgets/AvailabilityCalendarWidget";
import { UserCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

// --- Profile At-a-Glance Card ---
const ProfileAtAGlance: React.FC<{ onEdit: () => void }> = ({ onEdit }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchProfile = () => {
    if (!user?.user_id) return;
    setLoading(true);
    fetch(`http://localhost:8000/api/users/${user.user_id}/complete-profile`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to fetch profile")
      )
      .then((data) => {
        setProfile(data.profile);
        setUserInfo(data.user);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };
  useEffect(() => {
    fetchProfile();
  }, [user]);
  if (loading)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <span className="text-gray-900 dark:text-white">Loading profile...</span>
      </div>
    );
  if (!profile || !userInfo) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 mb-4 md:mb-0">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <UserCircleIcon className="w-12 h-12 text-blue-400 dark:text-blue-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Profile At-a-Glance
          </h2>
          <div className="text-gray-700 dark:text-gray-300 text-base font-semibold mb-1">
            {userInfo.name}{" "}
            <span className="text-xs text-gray-400 dark:text-gray-500">({userInfo.email})</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Year: {profile.year_of_study || "-"} | Program:{" "}
            {userInfo.major || "-"}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Skills:{" "}
            {profile.technical_skills
              ? profile.technical_skills.length > 60
                ? profile.technical_skills.slice(0, 60) + "…"
                : profile.technical_skills
              : "-"}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Experience:{" "}
            {profile.teaching_experience
              ? profile.teaching_experience.length > 60
                ? profile.teaching_experience.slice(0, 60) + "…"
                : profile.teaching_experience
              : "-"}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition"
        >
          Edit Profile
        </button>
        <button
          onClick={() => {
            setRefreshing(true);
            fetchProfile();
          }}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
          disabled={refreshing}
        >
          <ArrowPathIcon
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </button>
      </div>
    </div>
  );
};

// --- TA Application Progress Card ---
const TAApplicationProgress: React.FC<{ onApply: () => void }> = ({
  onApply,
}) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user?.user_id) return;
    setLoading(true);
    getMyApplications()
      .then((apps) => setApplications(Array.isArray(apps) ? apps : []))
      .finally(() => setLoading(false));
  }, [user]);
  if (loading)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <span className="text-gray-900 dark:text-white">Loading application progress...</span>
      </div>
    );
  if (!applications.length)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            TA Application Progress
          </h2>
          <div className="text-gray-700 dark:text-gray-300 text-sm mb-1">
            No applications submitted this term.
          </div>
        </div>
        <button
          onClick={onApply}
          className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition"
        >
          Apply Now
        </button>
      </div>
    );
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          TA Application Progress
        </h2>
        <button
          onClick={onApply}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition"
        >
          Apply / Edit
        </button>
      </div>
      <div className="space-y-4">
        {applications.slice(0, 2).map((app) => (
          <div
            key={app.application_id}
            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Submitted:
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(app.submitted_at).toLocaleString()}
              </span>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold border ${
                  app.status === "pending"
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                    : app.status === "approved"
                    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                    : app.status === "rejected"
                    ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                }`}
              >
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Type: {app.application_type || app.applicationType || "-"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Top 3 Preferences:{" "}
              {Array.isArray(app.course_preferences) &&
              app.course_preferences.length
                ? app.course_preferences
                    .map((cp: any) => `${cp.course_code || "#" + cp.course_id}`)
                    .join(", ")
                : "-"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Domain Areas:{" "}
              {Array.isArray(app.domain_areas) && app.domain_areas.length
                ? app.domain_areas.join(", ")
                : "-"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Availability:{" "}
              {app.term_availability || app.termAvailability || "-"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Notes: {app.notes || "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Notifications Summary ---
const NotificationsSummary: React.FC<{ onViewAll: () => void }> = ({
  onViewAll,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.user_id) return;

    setLoading(true);
    
    // Use the proper notification API
    getNotifications(1, 5)
      .then((data) => {
        const notificationList = Array.isArray(data.notifications) 
          ? data.notifications 
          : [];
        setNotifications(notificationList);
        
        // Count unread notifications
        const unread = notificationList.filter((n: any) => !n.read_at && !n.is_read).length;
        setUnreadCount(unread);
      })
      .catch((error) => {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
        setUnreadCount(0);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</div>
      ) : (
        <ul className="text-sm space-y-2">
          {notifications.slice(0, 3).map((n, i) => (
            <li 
              key={n.notification_id || n.id || i} 
              className={`p-2 rounded-md border-l-4 ${
                n.read_at || n.is_read 
                  ? 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400' 
                  : 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-gray-800 dark:text-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {n.title && (
                    <div className="font-medium text-sm mb-1">{n.title}</div>
                  )}
                  <div className="text-sm">{n.message}</div>
                  {n.created_at && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {!(n.read_at || n.is_read) && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                )}
              </div>
            </li>
          ))}
          {notifications.length === 0 && (
            <li className="text-gray-400 dark:text-gray-500 text-center py-4">No notifications</li>
          )}
        </ul>
      )}
    </div>
  );
};

// --- Upcoming Assignments Summary ---
const UpcomingAssignments: React.FC<{ onViewAll: () => void }> = ({
  onViewAll,
}) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;

    setLoading(true);
    fetch(`http://localhost:8000/api/users/${user.user_id}/assignments`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to fetch assignments")
      )
      .then((data) => {
        const assignmentList = Array.isArray(data.assignments)
          ? data.assignments
          : [];
        // Filter for active assignments and sort by allocation date
        const activeAssignments = assignmentList
          .filter((a: any) => a.status === "active")
          .sort(
            (a: any, b: any) =>
              new Date(a.allocated_at).getTime() -
              new Date(b.allocated_at).getTime()
          );
        setAssignments(activeAssignments);
      })
      .catch((error) => {
        console.error("Error fetching assignments:", error);
        setAssignments([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">TA Assignments</h2>
        <button
          onClick={onViewAll}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading assignments...</div>
      ) : (
        <ul className="text-sm space-y-2">
          {assignments.slice(0, 3).map((assignment, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{assignment.course_code}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    - {assignment.course_title}
                  </span>
                  {assignment.is_marker && (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-1 py-0.5 rounded">
                      ⭐
                    </span>
                  )}
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                  {assignment.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Term: {assignment.term} • Assigned:{" "}
                {new Date(assignment.allocated_at).toLocaleDateString()}
              </div>
            </li>
          ))}
          {assignments.length === 0 && (
            <li className="text-gray-400 dark:text-gray-500">No active TA assignments</li>
          )}
          {assignments.length > 3 && (
            <li className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              +{assignments.length - 3} more assignments
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

// --- Main Dashboard ---
export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!user || user.role !== "student") return null;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          Hi, {user.name}
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            <ProfileAtAGlance onEdit={() => navigate("/profile")} />
            <TAApplicationProgress onApply={() => navigate("/apply")} />
            <AvailabilityCalendarWidget viewOnly={false} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <NotificationsSummary
              onViewAll={() => navigate("/notifications")}
            />
            <UpcomingAssignments onViewAll={() => navigate("/assignments")} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
