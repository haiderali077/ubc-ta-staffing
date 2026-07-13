import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";

interface Assignment {
  id: number;
  type: string;
  course: string;
  date: string;
  time: string;
}

const AssignmentCalendarSummary: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.user_id;
  console.log("AssignmentCalendarSummary userId:", userId, "user:", user);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/users/${userId}/assignments`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to fetch assignments")
      )
      .then((data) => setAssignments(data.assignments || []))
      .catch((err) =>
        setError(typeof err === "string" ? err : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;
  if (loading)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        Loading assignments...
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
          Assignment Calendar / Summary
        </h2>
        <span className="text-xs text-gray-500">Read Only</span>
      </div>
      {/* Assignment Table */}
      {assignments.length > 0 ? (
        <table className="min-w-full text-xs mb-4">
          <thead>
            <tr>
              <th className="text-left px-2 py-1">Type</th>
              <th className="text-left px-2 py-1">Course</th>
              <th className="text-left px-2 py-1">Date</th>
              <th className="text-left px-2 py-1">Time</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td className="px-2 py-1">{a.type}</td>
                <td className="px-2 py-1">{a.course}</td>
                <td className="px-2 py-1">{a.date}</td>
                <td className="px-2 py-1">{a.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mb-2 text-xs text-gray-500">
          Your assigned sessions will appear here when released.
        </div>
      )}
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>{" "}
          <span className="text-xs">Lab</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>{" "}
          <span className="text-xs">Marking</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>{" "}
          <span className="text-xs">Prep</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-400 inline-block"></span>{" "}
          <span className="text-xs">Coordination</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-pink-400 inline-block"></span>{" "}
          <span className="text-xs">Final Exam</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        (Calendar integration coming soon)
      </div>
    </div>
  );
};

export default AssignmentCalendarSummary;
