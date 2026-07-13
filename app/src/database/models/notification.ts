// app/src/database/models/notification.ts
import { Database } from '../config.ts';

export type NotificationType = 
  | 'application_submitted'
  | 'application_updated'
  | 'application_accepted' 
  | 'application_rejected'
  | 'deadline_reminder'
  | 'interview_scheduled'
  | 'document_required'
  | 'allocation_confirmed'
  | 'ta_request_update';

export interface Notification {
  notification_id?: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  email_sent?: boolean;
  email_sent_at?: Date;
  read_at?: Date;
  related_application_id?: number;
  related_course_id?: number;
  action_url?: string;
  action_text?: string;
  scheduled_for?: Date;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserNotificationPreferences {
  user_id: number;
  email_notifications?: boolean;
  in_app_notifications?: boolean;
  deadline_reminders?: boolean;
  application_updates?: boolean;
  allocation_updates?: boolean;
  reminder_days_before?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class NotificationModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // Create a new notification
  async createNotification(notification: Omit<Notification, 'notification_id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    const query = `
      INSERT INTO notifications (
        user_id, type, title, message, email_sent, email_sent_at, 
        related_application_id, related_course_id, action_url, action_text,
        scheduled_for, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await this.db.query<Notification>(query, [
      notification.user_id,
      notification.type,
      notification.title,
      notification.message,
      notification.email_sent || false,
      notification.email_sent_at || null,
      notification.related_application_id || null,
      notification.related_course_id || null,
      notification.action_url || null,
      notification.action_text || null,
      notification.scheduled_for || null,
      notification.metadata ? JSON.stringify(notification.metadata) : null
    ]);

    return result.rows[0];
  }

  // Get notifications for a user
  async getNotificationsByUser(userId: number, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const query = `
      SELECT n.*, 
             ta.status as application_status,
             c.code as course_code,
             c.title as course_title
      FROM notifications n
      LEFT JOIN ta_applications ta ON n.related_application_id = ta.application_id
      LEFT JOIN courses c ON n.related_course_id = c.course_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [userId, limit, offset]);
    return result.rows as Notification[];
  }

  // Get unread notifications count
  async getUnreadCount(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND read_at IS NULL
    `;

    const result = await this.db.query<{ count: string }>(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  // Mark notification as read
  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const query = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE notification_id = $1 AND user_id = $2 AND read_at IS NULL
    `;

    const result = await this.db.query(query, [notificationId, userId]);
    return result.rowCount > 0;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number): Promise<number> {
    const query = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND read_at IS NULL
    `;

    const result = await this.db.query(query, [userId]);
    return result.rowCount;
  }

  // Update email sent status
  async markEmailSent(notificationId: number): Promise<boolean> {
    const query = `
      UPDATE notifications
      SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE notification_id = $1
    `;

    const result = await this.db.query(query, [notificationId]);
    return result.rowCount > 0;
  }

  // Get scheduled notifications that need to be sent
  async getScheduledNotifications(): Promise<Notification[]> {
    const query = `
      SELECT n.*, u.email, u.name
      FROM notifications n
      JOIN users u ON n.user_id = u.user_id
      WHERE n.scheduled_for <= CURRENT_TIMESTAMP 
      AND n.email_sent = false
      ORDER BY n.scheduled_for ASC
    `;

    const result = await this.db.query(query);
    return result.rows as Notification[];
  }

  // User notification preferences methods
  async getUserPreferences(userId: number): Promise<UserNotificationPreferences | null> {
    const query = `SELECT * FROM user_notification_preferences WHERE user_id = $1`;
    const result = await this.db.query<UserNotificationPreferences>(query, [userId]);
    
    if (result.rows.length === 0) {
      // Create default preferences if none exist
      return await this.createDefaultPreferences(userId);
    }
    
    return result.rows[0];
  }

  async createDefaultPreferences(userId: number): Promise<UserNotificationPreferences> {
    const query = `
      INSERT INTO user_notification_preferences (user_id)
      VALUES ($1)
      RETURNING *
    `;
    
    const result = await this.db.query<UserNotificationPreferences>(query, [userId]);
    return result.rows[0];
  }

  async updateUserPreferences(userId: number, preferences: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences | null> {
    const fields = Object.keys(preferences).filter(key => key !== 'user_id');
    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE user_notification_preferences 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;

    const values = [userId, ...fields.map(field => (preferences as any)[field])];
    const result = await this.db.query<UserNotificationPreferences>(query, values);

    return result.rows[0] || null;
  }

  // Delete old notifications (cleanup)
  async deleteOldNotifications(daysOld: number = 90): Promise<number> {
    const query = `
      DELETE FROM notifications
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;

    const result = await this.db.query(query);
    return result.rowCount;
  }
}