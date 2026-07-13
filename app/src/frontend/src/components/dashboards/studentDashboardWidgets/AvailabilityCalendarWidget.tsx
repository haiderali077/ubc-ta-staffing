import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";

interface AvailabilityCalendarWidgetProps {
  viewOnly?: boolean;
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
// Generate time slots with 30-minute intervals from 8:00 to 21:00 (9 PM)
const timeSlots = Array.from({ length: 27 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minutes}`;
});

const AvailabilityCalendarWidget: React.FC<AvailabilityCalendarWidgetProps> = ({
  viewOnly = false,
}) => {
  const { user } = useAuth();
  const userIdFromAuth = user?.user_id;
  console.log(
    "AvailabilityCalendarWidget userId:",
    userIdFromAuth,
    "user:",
    user
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<string>("");
  const [grid, setGrid] = useState<boolean[][] | null>(null);

  useEffect(() => {
    if (!userIdFromAuth) return;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/profile/${userIdFromAuth}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to fetch availability")
      )
      .then((data) => {
        const avail = data.profile?.weekly_availability;
        setAvailability(avail);

        let parsedGrid = null;

        // Try to parse the availability data
        if (avail && Array.isArray(avail) && Array.isArray(avail[0])) {
          parsedGrid = avail;
        } else if (typeof avail === "string") {
          // Fallback: if it's still a string, try to parse it
          try {
            parsedGrid = JSON.parse(avail);
            if (!Array.isArray(parsedGrid) || !Array.isArray(parsedGrid[0])) {
              parsedGrid = null;
            }
          } catch {
            parsedGrid = null;
          }
        }

        // Handle the grid conversion if needed
        if (parsedGrid) {
          if (parsedGrid.length === timeSlots.length) {
            // Grid already has the right dimensions
            setGrid(parsedGrid);
          } else {
            // Need to convert the grid
            const newGrid = Array(timeSlots.length)
              .fill(null)
              .map(() => Array(days.length).fill(false));

            // If we're converting from hourly to half-hourly
            if (parsedGrid.length < timeSlots.length) {
              // For each hour in the old grid
              parsedGrid.forEach((row: boolean[], rowIndex: number) => {
                // Map each hour to two half-hour slots
                const newRowIndex = rowIndex * 2;
                if (newRowIndex < timeSlots.length) {
                  row.forEach((cell: boolean, colIndex: number) => {
                    // Copy the hour's availability to both half-hour slots
                    newGrid[newRowIndex][colIndex] = cell;
                    if (newRowIndex + 1 < timeSlots.length) {
                      newGrid[newRowIndex + 1][colIndex] = cell;
                    }
                  });
                }
              });
            } else {
              // If we're converting from a different format, just use what we can
              parsedGrid.forEach((row: boolean[], rowIndex: number) => {
                if (rowIndex < timeSlots.length) {
                  row.forEach((cell: boolean, colIndex: number) => {
                    if (colIndex < days.length) {
                      newGrid[rowIndex][colIndex] = cell;
                    }
                  });
                }
              });
            }
            setGrid(newGrid);
          }
        } else {
          setGrid(null);
        }
      })
      .catch((err) =>
        setError(typeof err === "string" ? err : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [userIdFromAuth]);

  if (!userIdFromAuth) return null;
  if (loading)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <span className="text-gray-900 dark:text-white">Loading availability...</span>
      </div>
    );
  if (error)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 text-red-600 dark:text-red-400">
        {error}
      </div>
    );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Weekly Availability
          </h2>
          {viewOnly && (
            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
              View Only
            </span>
          )}
        </div>
        <p className="text-sm text-blue-100 mt-1">
          This shows your current weekly availability schedule.
        </p>
      </div>

      {grid === null && availability && (
        <div className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
          {typeof availability === "string"
            ? availability
            : "Availability data needs to be updated in profile"}
        </div>
      )}
      {grid === null && !availability && (
        <div className="px-6 py-4 text-sm bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-100 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          No availability data set. Please update your profile.
        </div>
      )}

      {grid !== null && (
        <div className="px-6 py-4">
          <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
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

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <tbody>
                  {timeSlots.map((timeSlot, rowIdx) => (
                    <tr
                      key={timeSlot}
                      className={rowIdx % 2 === 0 ? "bg-gray-50 dark:bg-gray-700" : "bg-white dark:bg-gray-800"}
                    >
                      <td className="border-r border-gray-200 dark:border-gray-600 px-2 py-1 w-24 text-center text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {timeSlot}
                      </td>
                      {days.map((day, colIdx) => (
                        <td key={day} className="p-0 w-1/6">
                          <div
                            className={`w-full h-7 flex items-center justify-center transition-all duration-200 ease-in-out border border-[#CCCCCC]
                              ${
                                grid &&
                                grid[rowIdx] &&
                                grid[rowIdx][colIdx] === true
                                  ? "bg-[#FFC9C9]"
                                  : "bg-[#D5F5E3]"
                              }
                            `}
                          >
                            {grid &&
                              grid[rowIdx] &&
                              grid[rowIdx][colIdx] === true && (
                                <svg
                                  className="w-4 h-4 text-red-600"
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
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-gray-200 dark:border-gray-600">
                <div className="w-4 h-4 rounded bg-[#D5F5E3] border border-[#CCCCCC] dark:border-gray-500"></div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Available
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-gray-200 dark:border-gray-600">
                <div className="w-4 h-4 rounded bg-[#FFC9C9] border border-[#CCCCCC] dark:border-gray-500">
                  <svg
                    className="w-4 h-4 text-red-600"
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
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Not available
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendarWidget;
