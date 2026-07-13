// app/src/backend/routes/notificationRouter.ts
import { Router, Context, Status, RouterContext } from "../../../deps.ts";
import { NotificationModel } from "../../database/models/notification.ts";
import { NotificationService } from "../services/notification.ts";
import { requireAuth } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";
import { z } from "../../../deps.ts";

export const notificationRouter = new Router();

// Dependencies - to be injected
let notificationModel: NotificationModel;
let notificationService: NotificationService;
let authService: AuthService;

export function setNotificationDependencies(
  model: NotificationModel,
  service: NotificationService,
  auth: AuthService
): void {
  notificationModel = model;
  notificationService = service;
  authService = auth;
}

// =============================================================================
// GET USER NOTIFICATIONS
// =============================================================================

notificationRouter.get(
  '/notifications',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const url = new URL(ctx.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      
      if (limit > 100) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Limit cannot exceed 100" };
        return;
      }

      const notifications = await notificationModel.getNotificationsByUser(userId, limit, offset);
      const unreadCount = await notificationModel.getUnreadCount(userId);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        notifications,
        unread_count: unreadCount,
        pagination: {
          limit,
          offset,
          has_more: notifications.length === limit
        }
      };
    } catch (error) {
      console.error("Error fetching notifications:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch notifications" };
    }
  }
);

// =============================================================================
// GET UNREAD COUNT
// =============================================================================

notificationRouter.get(
  '/notifications/unread-count',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const count = await notificationModel.getUnreadCount(userId);

      ctx.response.status = Status.OK;
      ctx.response.body = { unread_count: count };
    } catch (error) {
      console.error("Error fetching unread count:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch unread count" };
    }
  }
);

// =============================================================================
// MARK NOTIFICATION AS READ
// =============================================================================

notificationRouter.patch(
  '/notifications/:notificationId/read',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: RouterContext<"/notifications/:notificationId/read">) => {
    try {
      const userId = ctx.state.user.id;
      const notificationId = parseInt(ctx.params.notificationId);

      if (isNaN(notificationId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid notification ID" };
        return;
      }

      const success = await notificationModel.markAsRead(notificationId, userId);
      
      if (!success) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Notification not found or already read" };
        return;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = { message: "Notification marked as read" };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to mark notification as read" };
    }
  }
);

// =============================================================================
// MARK ALL NOTIFICATIONS AS READ
// =============================================================================

notificationRouter.patch(
  '/notifications/read-all',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const count = await notificationModel.markAllAsRead(userId);

      ctx.response.status = Status.OK;
      ctx.response.body = { 
        message: `${count} notification${count === 1 ? '' : 's'} marked as read`,
        count 
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to mark notifications as read" };
    }
  }
);

// =============================================================================
// GET USER NOTIFICATION PREFERENCES
// =============================================================================

notificationRouter.get(
  '/notifications/preferences',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const preferences = await notificationModel.getUserPreferences(userId);

      ctx.response.status = Status.OK;
      ctx.response.body = { preferences };
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch notification preferences" };
    }
  }
);

// =============================================================================
// UPDATE USER NOTIFICATION PREFERENCES
// =============================================================================

notificationRouter.put(
  '/notifications/preferences',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const body = await ctx.request.body({ type: "json" }).value;

      // Validate preferences
      const preferencesSchema = z.object({
        email_notifications: z.boolean().optional(),
        in_app_notifications: z.boolean().optional(),
        deadline_reminders: z.boolean().optional(),
        application_updates: z.boolean().optional(),
        allocation_updates: z.boolean().optional(),
        reminder_days_before: z.number().min(0).max(30).optional()
      });

      const validation = preferencesSchema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid preferences",
          details: validation.error.errors
        };
        return;
      }

      const updatedPreferences = await notificationModel.updateUserPreferences(userId, validation.data);

      ctx.response.status = Status.OK;
      ctx.response.body = { 
        message: "Notification preferences updated successfully",
        preferences: updatedPreferences 
      };
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update notification preferences" };
    }
  }
);

// =============================================================================
// SEND TEST NOTIFICATION (Development/Testing only)
// =============================================================================

notificationRouter.post(
  '/notifications/test',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      // Only allow in development environment
      if (Deno.env.get("ENVIRONMENT") !== "development") {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "Test notifications only available in development" };
        return;
      }

      const userId = ctx.state.user.id;
      const body = await ctx.request.body({ type: "json" }).value;

      const testSchema = z.object({
        type: z.enum(['application_submitted', 'application_accepted', 'application_rejected', 'deadline_reminder', 'allocation_confirmed']),
        title: z.string().optional(),
        message: z.string().optional()
      });

      const validation = testSchema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid test notification data" };
        return;
      }

      const { type } = validation.data;
      let title = validation.data.title;
      let message = validation.data.message;

      // Generate default content if not provided
      if (!title || !message) {
        switch (type) {
          case 'application_submitted':
            title = title || 'Test: Application Submitted';
            message = message || 'This is a test notification for application submission.';
            break;
          case 'application_accepted':
            title = title || 'Test: Application Accepted';
            message = message || 'This is a test notification for application acceptance.';
            break;
          case 'application_rejected':
            title = title || 'Test: Application Update';
            message = message || 'This is a test notification for application rejection.';
            break;
          case 'deadline_reminder':
            title = title || 'Test: Deadline Reminder';
            message = message || 'This is a test notification for deadline reminders.';
            break;
          case 'allocation_confirmed':
            title = title || 'Test: TA Position Confirmed';
            message = message || 'This is a test notification for allocation confirmation.';
            break;
        }
      }

      const notification = await notificationService.sendNotification({
        userId,
        type,
        title: title!,
        message: message!,
        actionUrl: '/dashboard',
        actionText: 'View Dashboard'
      });

      ctx.response.status = Status.Created;
      ctx.response.body = { 
        message: "Test notification sent successfully",
        notification 
      };
    } catch (error) {
      console.error("Error sending test notification:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to send test notification" };
    }
  }
);

// =============================================================================
// ADMIN: SEND BULK NOTIFICATIONS
// =============================================================================

notificationRouter.post(
  '/notifications/bulk',
  async (ctx: Context, next) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      // Check if user is admin or TA coordinator
      if (!['admin', 'ta_coordinator'].includes(ctx.state.user.role)) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "Admin or TA Coordinator access required" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;

      const bulkSchema = z.object({
        user_ids: z.array(z.number()).min(1),
        type: z.enum(['deadline_reminder', 'application_update', 'allocation_update']),
        title: z.string().min(1),
        message: z.string().min(1),
        action_url: z.string().optional(),
        action_text: z.string().optional(),
        schedule_for: z.string().optional() // ISO date string
      });

      const validation = bulkSchema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid bulk notification data",
          details: validation.error.errors
        };
        return;
      }

      const { user_ids, type, title, message, action_url, action_text, schedule_for } = validation.data;

      const scheduleDate = schedule_for ? new Date(schedule_for) : undefined;

      await notificationService.notifyMultipleUsers(user_ids, {
        type,
        title,
        message,
        actionUrl: action_url,
        actionText: action_text,
        scheduleFor: scheduleDate
      });

      ctx.response.status = Status.OK;
      ctx.response.body = { 
        message: `Bulk notification sent to ${user_ids.length} user${user_ids.length === 1 ? '' : 's'}`,
        recipients: user_ids.length
      };
    } catch (error) {
      console.error("Error sending bulk notifications:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to send bulk notifications" };
    }
  }
);
