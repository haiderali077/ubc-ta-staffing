import { Database } from "../../database/config.ts";
import { NotificationService } from "./notification.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import { UserModel } from "../../database/models/user.ts";
import { NotificationModel } from "../../database/models/notification.ts";

export class NotificationScheduler {
  private db: Database;
  private notificationService: NotificationService;
  private systemSettingsModel: SystemSettingsModel;
  private userModel: UserModel;
  private notificationModel: NotificationModel;
  private isRunning = false;
  private intervalId?: number;

  constructor(database: Database) {
    this.db = database;
    this.notificationService = new NotificationService(database);
    this.systemSettingsModel = new SystemSettingsModel(database);
    this.userModel = new UserModel(database);
    this.notificationModel = new NotificationModel(database);
  }

  // Start the scheduler
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      console.log("Notification scheduler is already running");
      return;
    }

    this.isRunning = true;
    console.log(`🔔 Starting notification scheduler (checking every ${intervalMinutes} minutes)`);

    // Run immediately
    this.runScheduledTasks();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runScheduledTasks();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop the scheduler
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log("🔔 Notification scheduler stopped");
  }

  // Main scheduled task runner
  private async runScheduledTasks(): Promise<void> {
    try {
      console.log("🔔 Running scheduled notification tasks...");

      // Process scheduled notifications
      await this.notificationService.processScheduledNotifications();

      // Send deadline reminders
      await this.sendDeadlineReminders();

      // Clean up old notifications
      await this.cleanupOldNotifications();

      console.log("✅ Scheduled notification tasks completed");
    } catch (error) {
      console.error("❌ Error running scheduled notification tasks:", error);
    }
  }

  // Send deadline reminders to all users
  private async sendDeadlineReminders(): Promise<void> {
    try {
      // Get deadline settings
      const taApplicationDeadline = await this.systemSettingsModel.getSettingByKey('ta_application_deadline');
      const instructorRequestDeadline = await this.systemSettingsModel.getSettingByKey('instructor_request_deadline');

      const now = new Date();

      // Check TA application deadline
      if (taApplicationDeadline) {
        await this.checkAndSendDeadlineReminder(
          'TA Application',
          new Date(taApplicationDeadline.value),
          ['student'],
          now
        );
      }

      // Check instructor request deadline
      if (instructorRequestDeadline) {
        await this.checkAndSendDeadlineReminder(
          'Instructor TA Request',
          new Date(instructorRequestDeadline.value),
          ['instructor'],
          now
        );
      }

    } catch (error) {
      console.error("Error sending deadline reminders:", error);
    }
  }

  // Check and send deadline reminders for a specific deadline
  private async checkAndSendDeadlineReminder(
    deadlineType: string,
    deadlineDate: Date,
    userRoles: string[],
    currentDate: Date
  ): Promise<void> {
    const timeUntilDeadline = deadlineDate.getTime() - currentDate.getTime();
    const daysUntilDeadline = Math.ceil(timeUntilDeadline / (1000 * 60 * 60 * 24));

    // Send reminders at 7 days, 3 days, and 1 day before deadline
    const reminderDays = [7, 3, 1];

    if (reminderDays.includes(daysUntilDeadline) && daysUntilDeadline > 0) {
      console.log(`Sending ${daysUntilDeadline}-day reminder for ${deadlineType}`);

      // Get users of the specified roles who want deadline reminders
      for (const role of userRoles) {
        const users = await this.userModel.getUsersByRole(role as any);
        
        for (const user of users) {
          // Check user preferences
          const preferences = await this.notificationModel.getUserPreferences(user.user_id!);
          
          if (preferences?.deadline_reminders && preferences.reminder_days_before >= daysUntilDeadline) {
            // Check if we've already sent this reminder
            const existingReminder = await this.hasRecentDeadlineReminder(
              user.user_id!,
              deadlineType,
              daysUntilDeadline
            );

            if (!existingReminder) {
              await this.notificationService.notifyDeadlineReminder(
                user.user_id!,
                deadlineType,
                deadlineDate
              );
            }
          }
        }
      }
    }
  }

  // Check if user has already received a deadline reminder recently
  private async hasRecentDeadlineReminder(
    userId: number,
    deadlineType: string,
    daysUntil: number
  ): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 
      AND type = 'deadline_reminder'
      AND metadata->>'deadline_type' = $2
      AND metadata->>'days_until' = $3
      AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
    `;

    const result = await this.db.query<{ count: string }>(query, [
      userId,
      deadlineType,
      daysUntil.toString()
    ]);

    return parseInt(result.rows[0].count) > 0;
  }

  // Clean up old notifications
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const deletedCount = await this.notificationModel.deleteOldNotifications(90); // 90 days
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old notification${deletedCount === 1 ? '' : 's'}`);
      }
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
    }
  }

  // Manually trigger deadline reminders (for testing)
  async triggerDeadlineReminders(): Promise<void> {
    console.log("🔔 Manually triggering deadline reminders...");
    await this.sendDeadlineReminders();
  }

  // Send a test notification to all users of a role
  async sendTestNotificationToRole(role: string, message: string): Promise<void> {
    try {
      const users = await this.userModel.getUsersByRole(role as any);
      const userIds = users.map(user => user.user_id!);

      if (userIds.length > 0) {
        await this.notificationService.notifyMultipleUsers(userIds, {
          type: 'deadline_reminder',
          title: 'Test Notification',
          message: message || `This is a test notification sent to all ${role}s.`,
          actionUrl: '/dashboard',
          actionText: 'View Dashboard'
        });

        console.log(`Test notification sent to ${userIds.length} ${role}(s)`);
      }
    } catch (error) {
      console.error(`Error sending test notification to ${role}s:`, error);
    }
  }

  // Get scheduler status
  getStatus(): { isRunning: boolean; intervalId?: number } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}