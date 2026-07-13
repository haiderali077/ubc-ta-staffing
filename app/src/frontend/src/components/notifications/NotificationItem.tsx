import React from "react";
import type { Notification } from "../../api/notificationApi";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  fading?: boolean;
}

const getNotificationIcon = (type: string) => {
  const baseClasses =
    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0";
  switch (type) {
    case "success":
      return (
        <div className={`${baseClasses} bg-emerald-50 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400`}>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    case "warning":
      return (
        <div className={`${baseClasses} bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-400`}>
          <svg
            className="w-5 h-5"
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
        </div>
      );
    case "error":
      return (
        <div className={`${baseClasses} bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400`}>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className={`${baseClasses} bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400`}>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      );
  }
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  fading,
}) => {
  const handleMarkAsRead = () => {
    if (!fading) {
      onMarkAsRead?.(String(notification.id));
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
        notification.is_read ? "border-gray-200 dark:border-gray-600" : "border-blue-200 dark:border-blue-500"
      } p-4 transition-all hover:shadow-md duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ transition: "opacity 0.35s" }}
    >
      <div className="flex items-start space-x-4">
        {getNotificationIcon(notification.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h2
                className={`text-base font-semibold ${
                  notification.is_read ? "text-gray-900 dark:text-white" : "text-blue-600 dark:text-blue-400"
                }`}
              >
                {notification.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {notification.message}
              </p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-4">
              {new Date(notification.created_at).toLocaleString()}
            </span>
          </div>
          {!notification.is_read && onMarkAsRead && (
            <button
              className="text-xs text-blue-500 dark:text-blue-400 hover:underline mt-2"
              onClick={handleMarkAsRead}
              disabled={!!fading}
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
