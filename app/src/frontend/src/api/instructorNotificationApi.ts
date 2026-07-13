const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

const fetchConfig = {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include" as const,
};

export interface InstructorNotification {
  notification_id: number;
  id: number; // For frontend compatibility
  type: "deadline_reminder" | "ta_request_update" | "course_update" | "system_message";
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
  course_id?: number;
  course_code?: string;
  course_title?: string;
  metadata?: any;
}

export interface InstructorNotificationResponse {
  notifications: InstructorNotification[];
  unreadCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface InstructorNotificationSummary {
  recentNotifications: InstructorNotification[];
  totalUnread: number;
  stats: Array<{
    type: string;
    count: number;
    unread_count: number;
  }>;
  period: string;
}

export interface InstructorNotificationFilters {
  type?: string;
  courseId?: number;
  startDate?: string;
  endDate?: string;
}

export interface InstructorNotificationPreferences {
  email_notifications?: boolean;
  in_app_notifications?: boolean;
  deadline_reminders?: boolean;
  allocation_updates?: boolean;
  ta_request_updates?: boolean;
  reminder_days_before?: number;
}

/**
 * Get instructor notifications with filtering and pagination
 */
export async function getInstructorNotifications(
  page = 1,
  pageSize = 10,
  filters: InstructorNotificationFilters = {}
): Promise<InstructorNotificationResponse> {
  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  // Add filters to query params
  if (filters.type) params.append('type', filters.type);
  if (filters.courseId) params.append('courseId', filters.courseId.toString());
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(
    `${API_BASE_URL}/api/instructor/notifications?${params.toString()}`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch instructor notifications");
  }

  const data = await response.json();
  
  // Map notification_id to id for frontend compatibility and ensure is_read is set
  return {
    ...data,
    notifications: data.notifications.map((n: any) => ({
      ...n,
      id: n.notification_id,
      is_read: !!n.read_at, // Set is_read based on read_at timestamp
    })),
  };
}

/**
 * Get instructor notification summary for dashboard
 */
export async function getInstructorNotificationSummary(): Promise<InstructorNotificationSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/instructor/notifications/summary`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch instructor notification summary");
  }

  const data = await response.json();
  
  // Map notification_id to id for frontend compatibility
  return {
    ...data,
    recentNotifications: data.recentNotifications.map((n: any) => ({
      ...n,
      id: n.notification_id,
      is_read: !!n.read_at,
    })),
  };
}

/**
 * Mark specific instructor notification as read
 */
export async function markInstructorNotificationAsRead(
  notificationId: string | number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/instructor/notifications/${notificationId}/read`,
    {
      ...fetchConfig,
      method: "POST",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to mark notification as read");
  }
}

/**
 * Mark all instructor notifications as read
 */
export async function markAllInstructorNotificationsAsRead(): Promise<{ count: number }> {
  const response = await fetch(
    `${API_BASE_URL}/api/instructor/notifications/read-all`,
    {
      ...fetchConfig,
      method: "POST",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to mark all notifications as read");
  }

  const data = await response.json();
  return { count: data.count || 0 };
}

/**
 * Get unread count for instructor notifications
 */
export async function getInstructorUnreadCount(): Promise<number> {
  try {
    const summary = await getInstructorNotificationSummary();
    return summary.totalUnread;
  } catch (error) {
    console.warn('Could not fetch instructor unread count:', error);
    return 0;
  }
}

/**
 * Get instructor notification preferences
 */
export async function getInstructorNotificationPreferences(): Promise<InstructorNotificationPreferences> {
  const response = await fetch(
    `${API_BASE_URL}/api/instructor/notification-preferences`,
    {
      ...fetchConfig,
      method: "GET",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch instructor notification preferences");
  }

  return await response.json();
}

/**
 * Update instructor notification preferences
 */
export async function updateInstructorNotificationPreferences(
  preferences: InstructorNotificationPreferences
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/instructor/notification-preferences`,
    {
      ...fetchConfig,
      method: "PUT",
      body: JSON.stringify(preferences),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update instructor notification preferences");
  }
}
