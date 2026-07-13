import React from "react";
import NotificationList from "../../components/notifications/NotificationList";
import NotificationPreferences from "../../components/notifications/NotificationPreferences";

const NotificationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        </div>
        <NotificationPreferences />
        <NotificationList />
      </div>
    </div>
  );
};

export default NotificationsPage;
