import React, { useEffect, useState } from "react";
import InstructorNotificationItem from "./InstructorNotificationItem";
import {
  getInstructorNotifications,
  type InstructorNotification,
  markInstructorNotificationAsRead,
  markAllInstructorNotificationsAsRead,
} from "../../api/instructorNotificationApi";

const PAGE_SIZE = 10;

const InstructorNotificationList: React.FC = () => {
  const [allNotifications, setAllNotifications] = useState<InstructorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [marking, setMarking] = useState(false);
  const [fadingIds, setFadingIds] = useState<string[]>([]);

  // Fetch notifications
  const fetchNotifications = () => {
    setLoading(true);
    setError(null);
    getInstructorNotifications(1, PAGE_SIZE * 2)
      .then((data) => {
        setAllNotifications(data.notifications);
      })
      .catch(() => setError("Failed to load notifications"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Split notifications
  const unread = allNotifications.filter((n) => !n.is_read);
  const read = allNotifications.filter((n) => n.is_read);

  let notificationsToShow: InstructorNotification[] = [];
  if (page === 1) {
    // Show unread first, then fill with read if room
    if (unread.length >= PAGE_SIZE) {
      notificationsToShow = unread.slice(0, PAGE_SIZE);
    } else {
      notificationsToShow = [
        ...unread,
        ...read.slice(0, PAGE_SIZE - unread.length),
      ];
    }
  } else {
    // Only show unread notifications on page 2+
    const start = (page - 1) * PAGE_SIZE;
    notificationsToShow = unread.slice(start, start + PAGE_SIZE);
  }

  // Optimistically mark as read and fade out
  const handleMarkAsRead = async (id: string) => {
    setFadingIds((prev) => [...prev, id]);
    // Optimistically update state so notification moves immediately
    setAllNotifications((prev) =>
      prev.map((n) =>
        String(n.id) === String(id) ? { ...n, is_read: true } : n
      )
    );
    setTimeout(async () => {
      setFadingIds((prev) => prev.filter((fid) => fid !== id));
      // Remove the notification from the list after fade
      setAllNotifications((prev) =>
        prev.filter((n) => String(n.id) !== String(id))
      );
      try {
        await markInstructorNotificationAsRead(id);
      } catch {
        setError("Failed to mark notification as read");
      }
    }, 350); // match fade duration
  };

  const handleMarkAllAsRead = async () => {
    setMarking(true);
    try {
      await markAllInstructorNotificationsAsRead();
      setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setError("Failed to mark all as read");
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <div className="dark:text-white">Loading notifications...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium disabled:opacity-50"
          onClick={handleMarkAllAsRead}
          disabled={marking || allNotifications.every((n) => n.is_read)}
        >
          Mark all as read
        </button>
      </div>
      {notificationsToShow.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">No notifications found.</div>
      ) : (
        notificationsToShow.map((notification) => (
          <InstructorNotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            fading={fadingIds.includes(String(notification.id))}
          />
        ))
      )}
      <div className="flex justify-center mt-4 gap-2">
        <button
          className="px-3 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || marking}
        >
          Previous
        </button>
        <span className="px-2 dark:text-white">Page {page}</span>
        <button
          className="px-3 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={
            page === 1
              ? unread.length <= PAGE_SIZE
              : unread.length <= page * PAGE_SIZE || marking
          }
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default InstructorNotificationList;
