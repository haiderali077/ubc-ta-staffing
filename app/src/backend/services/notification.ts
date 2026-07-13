// app/src/backend/services/notification.ts
import { Database } from "../../database/config.ts";
import { ApplicationModel } from "../../database/models/application.ts";
import { CourseModel } from "../../database/models/course.ts";
import { Notification, NotificationModel, NotificationType } from "../../database/models/notification.ts";
import { UserModel } from "../../database/models/user.ts";

export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: number;
  courseId?: number;
  actionUrl?: string;
  actionText?: string;
  scheduleFor?: Date;
  metadata?: any;
}

export interface EmailNotificationData {
  to: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

export class NotificationService {
  private db: Database;
  private notificationModel: NotificationModel;
  private userModel: UserModel;
  private applicationModel: ApplicationModel;
  private courseModel: CourseModel;

  constructor(database: Database) {
    this.db = database;
    this.notificationModel = new NotificationModel(database);
    this.userModel = new UserModel(database);
    this.applicationModel = new ApplicationModel(database);
    this.courseModel = new CourseModel(database);
  }

  // Main method to send notifications
  async sendNotification(payload: NotificationPayload): Promise<Notification> {
    // Create the notification record
    const notification = await this.notificationModel.createNotification({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      related_application_id: payload.applicationId,
      related_course_id: payload.courseId,
      action_url: payload.actionUrl,
      action_text: payload.actionText,
      scheduled_for: payload.scheduleFor,
      metadata: payload.metadata
    });

    // Check user preferences
    const preferences = await this.notificationModel.getUserPreferences(payload.userId);
    
    // Send email if enabled and not scheduled for later
    if (preferences?.email_notifications && !payload.scheduleFor) {
      await this.sendEmailNotification(notification);
    }

    return notification;
  }

  // Send email notification
  async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      const user = await this.userModel.getUserById(notification.user_id);
      if (!user) {
        console.error(`User ${notification.user_id} not found for notification`);
        return;
      }

      const emailData = await this.generateEmailContent(notification, user.name);
      await this.sendEmail(user.email, user.name, emailData.subject, emailData.htmlContent, emailData.textContent);
      
      // Mark as sent
      await this.notificationModel.markEmailSent(notification.notification_id!);
      
      console.log(`Email notification sent to ${user.email} for ${notification.type}`);
    } catch (error) {
      console.error(`Failed to send email notification:`, error);
    }
  }

  // Generate email content based on notification type
  private async generateEmailContent(notification: Notification, userName: string): Promise<EmailNotificationData> {
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";
    
    let subject = notification.title;
    let actionUrl = notification.action_url || `${frontendUrl}/dashboard`;
    let actionText = notification.action_text || "View Dashboard";

    // Get additional context if needed
    let courseName = '';
    if (notification.related_course_id) {
      const course = await this.courseModel.getCourseById(notification.related_course_id);
      courseName = course ? `${course.code} - ${course.title}` : '';
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #002145; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">AllocAid</h1>
          <p style="margin: 5px 0 0 0;">TA Management System</p>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #002145;">${notification.title}</h2>
          <p>Hi ${userName},</p>
          <p>${notification.message}</p>
          
          ${courseName ? `<p><strong>Course:</strong> ${courseName}</p>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" style="background-color: #002145; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ${actionText}
            </a>
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 12px;">
            This is an automated notification from AllocAid. If you have questions, please contact the TA coordinator.<br>
            <a href="${frontendUrl}/settings/notifications">Manage notification preferences</a>
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px;">
          AllocAid TA Management System<br>
          University of British Columbia Okanagan
        </div>
      </div>
    `;

    const textContent = `
      ${notification.title}
      
      Hi ${userName},
      
      ${notification.message}
      
      ${courseName ? `Course: ${courseName}` : ''}
      
      ${actionText}: ${actionUrl}
      
      ---
      This is an automated notification from AllocAid.
      AllocAid TA Management System
      University of British Columbia Okanagan
    `;

    return {
      to: '',
      name: userName,
      subject,
      htmlContent,
      textContent
    };
  }

  // Send email using existing infrastructure
  private async sendEmail(email: string, name: string, subject: string, htmlContent: string, textContent: string): Promise<void> {
    const emailServiceUrl = Deno.env.get("EMAIL_SERVICE_URL");
    const emailApiKey = Deno.env.get("EMAIL_API_KEY");

    if (emailServiceUrl && emailApiKey) {
      let emailPayload;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (emailServiceUrl.includes('sendgrid.com')) {
        // SendGrid format (existing)
        headers['Authorization'] = `Bearer ${emailApiKey}`;
        emailPayload = {
          personalizations: [{
            to: [{ email: email, name: name }],
            subject: subject
          }],
          from: {
            email: "noreply@allocaid.ubc.ca",
            name: "AllocAid TA Management"
          },
          content: [{
            type: "text/html",
            value: htmlContent
          }, {
            type: "text/plain",
            value: textContent
          }]
        };
      } else if (emailServiceUrl.includes('resend.com')) {
        // Resend format
        headers['Authorization'] = `Bearer ${emailApiKey}`;
        emailPayload = {
          from: 'AllocAid <onboarding@resend.dev>',
          to: [email],
          subject: subject,
          html: htmlContent,
          text: textContent
        };
      } else {
        // Generic format
        headers['Authorization'] = `Bearer ${emailApiKey}`;
        emailPayload = {
          to: email,
          subject: subject,
          html: htmlContent,
          text: textContent
        };
      }

      const response = await fetch(emailServiceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email service error: ${response.status} - ${errorText}`);
      }
    } else {
      // Development mode - log email
      console.log("📧 EMAIL NOTIFICATION (Development Mode):");
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${textContent}`);
    }
  }

  // Process scheduled notifications
  async processScheduledNotifications(): Promise<void> {
    const scheduledNotifications = await this.notificationModel.getScheduledNotifications();
    
    for (const notification of scheduledNotifications) {
      try {
        await this.sendEmailNotification(notification);
      } catch (error) {
        console.error(`Failed to process scheduled notification ${notification.notification_id}:`, error);
      }
    }
  }

  // Convenience methods for common notification types
  async notifyApplicationSubmitted(userId: number, applicationId: number): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'application_submitted',
      title: 'TA Application Submitted Successfully',
      message: 'Your TA application has been submitted and is now under review. You will be notified once a decision has been made.',
      applicationId,
      actionUrl: '/applications/my',
      actionText: 'View My Applications'
    });
  }

  async notifyApplicationUpdated(userId: number, applicationId: number): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'application_updated',
      title: 'TA Application Updated Successfully',
      message: 'Your TA application has been updated successfully. The changes are now reflected in your current application.',
      applicationId,
      actionUrl: '/applications/my',
      actionText: 'View Updated Application'
    });
  }

  async notifyApplicationAccepted(userId: number, applicationId: number, courseId?: number): Promise<void> {
    const course = courseId ? await this.courseModel.getCourseById(courseId) : null;
    const courseText = course ? ` for ${course.code} - ${course.title}` : '';
    
    await this.sendNotification({
      userId,
      type: 'application_accepted',
      title: 'TA Application Accepted! 🎉',
      message: `Congratulations! Your TA application${courseText} has been accepted. Please confirm your availability and review the next steps.`,
      applicationId,
      courseId,
      actionUrl: '/applications/my',
      actionText: 'View Details & Confirm'
    });
  }

  async notifyApplicationRejected(userId: number, applicationId: number): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'application_rejected',
      title: 'TA Application Update',
      message: 'Thank you for your interest in being a TA. Unfortunately, your application was not selected at this time. We encourage you to apply again in future terms.',
      applicationId,
      actionUrl: '/applications/my',
      actionText: 'View Application Status'
    });
  }

  async notifyDeadlineReminder(userId: number, deadlineType: string, deadlineDate: Date): Promise<void> {
    const daysUntil = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    await this.sendNotification({
      userId,
      type: 'deadline_reminder',
      title: `Reminder: ${deadlineType} Deadline`,
      message: `Don't forget! The ${deadlineType} deadline is in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${deadlineDate.toLocaleDateString()}).`,
      actionUrl: '/dashboard',
      actionText: 'View Dashboard',
      metadata: { deadline_type: deadlineType, days_until: daysUntil }
    });
  }

  async notifyAllocationConfirmed(userId: number, courseId: number): Promise<void> {
    const course = await this.courseModel.getCourseById(courseId);
    const courseText = course ? `${course.code} - ${course.title}` : 'the course';
    
    await this.sendNotification({
      userId,
      type: 'allocation_confirmed',
      title: 'TA Position Confirmed! 🎉',
      message: `Your TA position for ${courseText} has been officially confirmed. Check your dashboard for course details and next steps.`,
      courseId,
      actionUrl: '/assignments',
      actionText: 'View TA Assignments'
    });
  }

  // Bulk notifications
  async notifyMultipleUsers(userIds: number[], notificationData: Omit<NotificationPayload, 'userId'>): Promise<void> {
    for (const userId of userIds) {
      try {
        await this.sendNotification({ ...notificationData, userId });
      } catch (error) {
        console.error(`Failed to notify user ${userId}:`, error);
      }
    }
  }
}
export default NotificationService;