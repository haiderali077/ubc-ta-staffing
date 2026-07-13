import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

const NotificationsFeed: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.user_id;
  console.log("NotificationsFeed userId:", userId, "user:", user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/users/${userId}/notifications`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject("Failed to fetch notifications")
      )
      .then((data) => setNotifications(data.notifications || []))
      .catch((err) =>
        setError(typeof err === "string" ? err : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [userId]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  if (!userId) return null;
  if (loading)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        Loading notifications...
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
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        <button
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          onClick={() =>
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, isRead: true }))
            )
          }
        >
          Mark all as read
        </button>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded border p-3 flex items-start gap-3 ${
              notification.isRead
                ? "border-gray-200 bg-gray-50"
                : "border-blue-200 bg-white"
            }`}
          >
            <div
              className="w-2 h-2 mt-2 rounded-full"
              style={{
                background: notification.isRead ? "#D1D5DB" : "#2563EB",
              }}
            ></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3
                  className={`text-sm font-semibold ${
                    notification.isRead ? "text-gray-900" : "text-blue-600"
                  }`}
                >
                  {notification.title}
                </h3>
                <span className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                  {notification.time}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {notification.message}
              </p>
              {!notification.isRead && (
                <button
                  className="text-xs text-blue-500 hover:underline mt-1"
                  onClick={() => markAsRead(notification.id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsFeed;
