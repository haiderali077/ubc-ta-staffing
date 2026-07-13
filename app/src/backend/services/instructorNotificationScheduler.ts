import { Database } from "../../database/config.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import { InstructorNotificationService } from "./instructorNotificationService.ts";

export class InstructorNotificationScheduler {
  private db: Database;
  private instructorNotificationService: InstructorNotificationService;
  private systemSettingsModel: SystemSettingsModel;
  private isRunning = false;
  private intervalId?: number;

  constructor(database: Database) {
    this.db = database;
    this.instructorNotificationService = new InstructorNotificationService(database);
    this.systemSettingsModel = new SystemSettingsModel(database);
  }

  /**
   * Start the instructor notification scheduler
   */
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      console.log("Instructor notification scheduler is already running");
      return;
    }

    this.isRunning = true;
    console.log(`🔔 Starting instructor notification scheduler (checking every ${intervalMinutes} minutes)`);

    // Run immediately
    this.runScheduledTasks();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runScheduledTasks();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log("🔔 Instructor notification scheduler stopped");
  }

  /**
   * Main scheduled task runner
   */
  private async runScheduledTasks(): Promise<void> {
    try {
      console.log("🔔 Running instructor notification scheduled tasks...");

      // Send deadline reminders
      await this.instructorNotificationService.processAutomaticDeadlineReminders();

      // Check for allocation confirmations that need to be sent
      await this.checkAllocationConfirmations();

      // Check for TA request updates that need notifications
      await this.checkTARequestUpdates();

      // Clean up old notifications if needed
      await this.cleanupOldNotifications();

      console.log("✅ Instructor notification scheduled tasks completed");
    } catch (error) {
      console.error("❌ Error running instructor notification scheduled tasks:", error);
    }
  }

  /**
   * Check for allocation confirmations that need to be sent
   */
  private async checkAllocationConfirmations(): Promise<void> {
    try {
      // Find courses with recently completed allocations that haven't been notified
      const query = `
        SELECT DISTINCT
          c.course_id,
          c.instructor_id,
          c.code as course_code,
          c.title as course_title,
          COUNT(alloc.allocation_id) as allocated_count,
          COUNT(ls.lab_section_id) as total_sections
        FROM courses c
        JOIN lab_sections ls ON c.course_id = ls.course_id
        LEFT JOIN ta_allocations alloc ON ls.lab_section_id = alloc.lab_section_id AND alloc.status = 'active'
        JOIN ta_needs tn ON c.course_id = tn.course_id
        WHERE c.instructor_id IS NOT NULL
        AND tn.status = 'filled'
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.user_id = c.instructor_id 
          AND n.related_course_id = c.course_id 
          AND n.type = 'allocation_confirmed'
          AND n.metadata->>'allocation_type' = 'final_confirmation'
          AND n.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        )
        GROUP BY c.course_id, c.instructor_id, c.code, c.title
        HAVING COUNT(alloc.allocation_id) > 0
      `;

      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        const courseData = row as any;
        
        try {
          await this.instructorNotificationService.notifyAllocationConfirmation({
            instructorId: courseData.instructor_id,
            courseId: courseData.course_id,
            metadata: {
              auto_generated: true,
              allocated_sections: courseData.allocated_count,
              total_sections: courseData.total_sections
            }
          });
          
          console.log(`📧 Sent allocation confirmation to instructor for course ${courseData.course_code}`);
        } catch (error) {
          console.error(`Failed to send allocation confirmation for course ${courseData.course_code}:`, error);
        }
      }

    } catch (error) {
      console.error("Error checking allocation confirmations:", error);
    }
  }

  /**
   * Check for TA request status updates that need notifications
   */
  private async checkTARequestUpdates(): Promise<void> {
    try {
      // Find TA needs that have been updated recently but instructor hasn't been notified
      const query = `
        SELECT 
          tn.need_id,
          tn.course_id,
          tn.status,
          tn.updated_at,
          c.instructor_id,
          c.code as course_code,
          c.title as course_title
        FROM ta_needs tn
        JOIN courses c ON tn.course_id = c.course_id
        WHERE c.instructor_id IS NOT NULL
        AND tn.updated_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
        AND tn.status IN ('open', 'filled', 'cancelled')
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.user_id = c.instructor_id 
          AND n.metadata->>'ta_request_id' = tn.need_id::text
          AND n.created_at > tn.updated_at - INTERVAL '1 hour'
        )
      `;

      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        const requestData = row as any;
        
        try {
          await this.instructorNotificationService.notifyTARequestUpdate({
            instructorId: requestData.instructor_id,
            courseId: requestData.course_id,
            taRequestId: requestData.need_id,
            metadata: {
              auto_generated: true,
              previous_status: 'pending', // We could track this better in the future
              new_status: requestData.status
            }
          });
          
          console.log(`📧 Sent TA request update notification to instructor for course ${requestData.course_code}`);
        } catch (error) {
          console.error(`Failed to send TA request update for course ${requestData.course_code}:`, error);
        }
      }

    } catch (error) {
      console.error("Error checking TA request updates:", error);
    }
  }

  /**
   * Clean up old notifications (keep last 90 days)
   */
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND type IN ('deadline_reminder', 'allocation_confirmed')
      `;
      
      const result = await this.db.query(query);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} old instructor notification${result.rowCount === 1 ? '' : 's'}`);
      }
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
    }
  }

  /**
   * Manually trigger deadline reminders (for testing)
   */
  async triggerDeadlineReminders(): Promise<void> {
    console.log("🔔 Manually triggering instructor deadline reminders...");
    await this.instructorNotificationService.processAutomaticDeadlineReminders();
  }

  /**
   * Manually trigger allocation confirmations (for testing)
   */
  async triggerAllocationConfirmations(): Promise<void> {
    console.log("🔔 Manually triggering allocation confirmations...");
    await this.checkAllocationConfirmations();
  }

  /**
   * Send test notification to specific instructor
   */
  async sendTestNotification(instructorId: number, type: string = 'deadline_reminder'): Promise<void> {
    try {
      const testDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      
      switch (type) {
        case 'deadline_reminder':
          await this.instructorNotificationService.sendDeadlineReminder({
            instructorId,
            deadlineType: 'ta_request_deadline',
            deadlineDate: testDate,
            metadata: { test_notification: true }
          });
          break;
          
        case 'allocation_confirmation':
          // Find instructor's first course for testing
          const courseQuery = `SELECT course_id FROM courses WHERE instructor_id = $1 LIMIT 1`;
          const courseResult = await this.db.query(courseQuery, [instructorId]);
          
          if (courseResult.rows.length > 0) {
            await this.instructorNotificationService.notifyAllocationConfirmation({
              instructorId,
              courseId: courseResult.rows[0].course_id,
              metadata: { test_notification: true }
            });
          }
          break;
          
        default:
          throw new Error(`Unknown test notification type: ${type}`);
      }
      
      console.log(`📧 Test notification (${type}) sent to instructor ${instructorId}`);
    } catch (error) {
      console.error(`Error sending test notification to instructor ${instructorId}:`, error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { 
    isRunning: boolean; 
    intervalId?: number;
    nextRun?: Date;
  } {
    const nextRun = this.isRunning && this.intervalId 
      ? new Date(Date.now() + 60 * 60 * 1000) // Approximate next run (1 hour)
      : undefined;
      
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
      nextRun
    };
  }
}
