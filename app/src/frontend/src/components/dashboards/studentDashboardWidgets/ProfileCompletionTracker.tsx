import React, { useEffect, useState } from "react";
import { ProgressBar } from "../../profileForm/ProgressBar";
import { useAuth } from "../../../context/AuthContext";

const sections = [
  "Personal Information",
  "Academic Background",
  "Availability & Preferences",
  "References & Documents",
];

const ProfileCompletionTracker: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.user_id;
  console.log("ProfileCompletionTracker userId:", userId, "user:", user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/users/${userId}/profile/status`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to fetch profile status")
      )
      .then((data) => {
        setPercentage(data.completionPercentage || 0);
      })
      .catch((err) =>
        setError(typeof err === "string" ? err : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;
  if (loading)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        Loading profile completion...
      </div>
    );
  if (error)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 text-red-600">
        {error}
      </div>
    );

  // Divide 100% into 4 equal sections
  const sectionComplete = [0, 25, 50, 75].map((min) => percentage > min);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Profile Completion Tracker
        </h2>
        <ProgressBar percentage={percentage} label="" />
      </div>
      <ul className="space-y-2 text-sm">
        {sections.map((section, idx) => (
          <li key={section} className="flex items-center gap-2">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                sectionComplete[idx]
                  ? "bg-green-400 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {sectionComplete[idx] ? "✓" : ""}
            </span>
            {section}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProfileCompletionTracker;
