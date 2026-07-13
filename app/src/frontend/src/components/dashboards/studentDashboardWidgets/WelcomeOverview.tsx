import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

const WelcomeOverview: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.user_id;
  console.log("WelcomeOverview userId:", userId, "user:", user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [role, setRole] = useState("");
  const [profileComplete, setProfileComplete] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_BASE_URL}/api/users/${userId}/complete-profile`).then(
        (res) =>
          res.ok ? res.json() : Promise.reject("Failed to fetch user info")
      ),
      fetch(`${API_BASE_URL}/api/users/${userId}/profile/status`).then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to fetch profile status")
      ),
    ])
      .then(([profileData, statusData]) => {
        setName(profileData.user?.name || "");
        setRole(profileData.user?.role || "");
        setTerm(profileData.profile?.preferred_term || "");
        setProfileComplete(statusData.status === "Complete");
        setApplicationStatus("Pending");
        setAssignmentStatus("Not Yet Released");
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) {
    return null;
  }
  if (loading)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        Loading overview...
      </div>
    );
  if (error)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 text-red-600">
        {error}
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome, {name}!
          </h2>
          <div className="text-gray-600 text-sm">
            {role} - {term}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              profileComplete
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {profileComplete ? "Profile Complete ✅" : "Profile Incomplete ❌"}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
            Application: {applicationStatus}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
            Final Assignment: {assignmentStatus}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverview;
