const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const fetchConfig = {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include" as const,
};

export interface Notification {
  id: number;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface NotificationResponse {
  notifications: Notification[];
  unread_count?: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface NotificationPreferences {
  email_notifications?: boolean;
  in_app_notifications?: boolean;
  deadline_reminders?: boolean;
  application_updates?: boolean;
  allocation_updates?: boolean;
  reminder_days_before?: number;
}

export async function getNotifications(
  page = 1,
  pageSize = 10
): Promise<NotificationResponse> {
  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  const response = await fetch(
    `${API_BASE_URL}/api/notifications?limit=${limit}&offset=${offset}`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch notifications");
  }
  const data = await response.json();
  // Map notification_id to id for frontend compatibility
  return {
    ...data,
    notifications: data.notifications.map((n: any) => ({
      ...n,
      id: n.notification_id,
      is_read: !!n.read_at, // Set is_read based on read_at timestamp
    })),
  };
}

export async function getUnreadCount(): Promise<number> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/unread-count`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch unread count");
  }
  const data = await response.json();
  return data.unreadCount || data.unread_count;
}

export async function markNotificationAsRead(
  id: string | number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
    ...fetchConfig,
    method: "PATCH",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to mark notification as read");
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    ...fetchConfig,
    method: "PATCH",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || "Failed to mark all notifications as read"
    );
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/preferences`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || "Failed to fetch notification preferences"
    );
  }
  const data = await response.json();
  return data.preferences;
}

export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<NotificationPreferences> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/preferences`,
    {
      ...fetchConfig,
      method: "PUT",
      body: JSON.stringify(prefs),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || "Failed to update notification preferences"
    );
  }
  const data = await response.json();
  return data.preferences;
}
