import React, { useEffect, useState } from "react";
import {
  getProfileStatus,
  getCoursePreferences,
} from "../../../api/profileApi";
import { useAuth } from "../../../context/AuthContext";

interface CoursePreference {
  rank: number;
  course: string;
  status: string;
}

interface TAApplicationSnapshotProps {
  userId?: number;
}

const TAApplicationSnapshot: React.FC<TAApplicationSnapshotProps> = ({
  userId = 3,
}) => {
  const { user } = useAuth();
  const userIdFromAuth = user?.user_id;
  console.log("TAApplicationSnapshot userId:", userIdFromAuth, "user:", user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<CoursePreference[]>([]);
  const [applicationType, setApplicationType] = useState("Undergraduate");
  const [submittedAt, setSubmittedAt] = useState("");
  const [status, setStatus] = useState("Pending");

  useEffect(() => {
    if (!userIdFromAuth) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getProfileStatus(userIdFromAuth),
      getCoursePreferences(userIdFromAuth),
    ])
      .then(([statusData, prefData]) => {
        setStatus(statusData.status || "Pending");
        setSubmittedAt(statusData.submitted_at || "");
        setApplicationType(statusData.application_type || "Undergraduate");
        setPreferences(
          (prefData.preferred || []).map((course: string, i: number) => ({
            rank: i + 1,
            course,
            status: statusData.status || "Pending",
          }))
        );
      })
      .catch((err) =>
        setError(typeof err === "string" ? err : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [userIdFromAuth]);

  if (!userIdFromAuth) return null;

  if (loading)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        Loading application snapshot...
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
        <h2 className="text-lg font-semibold text-gray-900">
          TA Application Snapshot
        </h2>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
          {applicationType}
        </span>
      </div>
      <div className="mb-2 text-xs text-gray-500">Submitted: {submittedAt}</div>
      <div className="mb-4">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-2 py-1">Rank</th>
              <th className="text-left px-2 py-1">Course</th>
              <th className="text-left px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {preferences.map((pref) => (
              <tr key={pref.rank}>
                <td className="px-2 py-1">{pref.rank}</td>
                <td className="px-2 py-1">{pref.course}</td>
                <td className="px-2 py-1">{pref.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {status === "Pending" && (
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs">
            Edit
          </button>
          <button className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-xs">
            Withdraw
          </button>
        </div>
      )}
    </div>
  );
};

export default TAApplicationSnapshot;
