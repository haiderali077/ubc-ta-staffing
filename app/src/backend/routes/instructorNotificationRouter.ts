import { Context, Router, RouterContext, Status, z } from "../../../deps.ts";
import { requireRole } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";
import { InstructorNotificationScheduler } from "../services/instructorNotificationScheduler.ts";
import { InstructorNotificationService } from "../services/instructorNotificationService.ts";

export const instructorNotificationRouter = new Router();

// Dependencies - to be injected
let instructorNotificationService: InstructorNotificationService;
let instructorNotificationScheduler: InstructorNotificationScheduler;
let authService: AuthService;

export function setInstructorNotificationDependencies(
  service: InstructorNotificationService,
  scheduler: InstructorNotificationScheduler,
  auth: AuthService
): void {
  instructorNotificationService = service;
  instructorNotificationScheduler = scheduler;
  authService = auth;
}

// =============================================================================
// INSTRUCTOR NOTIFICATION HISTORY AND MANAGEMENT
// =============================================================================

/**
 * GET /api/instructor/notifications
 * Get instructor's notification history with filtering and pagination
 */
instructorNotificationRouter.get(
  '/instructor/notifications',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      const url = new URL(ctx.request.url);
      
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const type = url.searchParams.get('type') || undefined;
      const courseId = url.searchParams.get('courseId') ? parseInt(url.searchParams.get('courseId')!) : undefined;
      const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined;
      const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined;

      if (limit > 100) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Limit cannot exceed 100" };
        return;
      }

      const result = await instructorNotificationService.getInstructorNotificationHistory(
        instructorId,
        limit,
        offset,
        { type, courseId, startDate, endDate }
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: result.notifications.length === limit
        }
      };
    } catch (error) {
      console.error("Error fetching instructor notifications:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch notification history" };
    }
  }
);

/**
 * GET /api/instructor/notifications/summary
 * Get notification summary for instructor dashboard
 */
instructorNotificationRouter.get(
  '/instructor/notifications/summary',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      
      // Get recent notifications (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await instructorNotificationService.getInstructorNotificationHistory(
        instructorId,
        10, // Limit to 10 recent notifications
        0,
        { startDate: thirtyDaysAgo }
      );

      // Get notification counts by type
      const notificationStats = await instructorNotificationService.db.query(`
        SELECT 
          type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE read_at IS NULL) as unread_count
        FROM notifications 
        WHERE user_id = $1 
        AND created_at > $2
        GROUP BY type
        ORDER BY count DESC
      `, [instructorId, thirtyDaysAgo]);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        recentNotifications: result.notifications,
        totalUnread: result.unreadCount,
        stats: notificationStats.rows,
        period: '30 days'
      };
    } catch (error) {
      console.error("Error fetching instructor notification summary:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch notification summary" };
    }
  }
);

/**
 * POST /api/instructor/notifications/:notificationId/read
 * Mark specific notification as read
 */
instructorNotificationRouter.post(
  '/instructor/notifications/:notificationId/read',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: RouterContext<"/instructor/notifications/:notificationId/read">) => {
    try {
      const instructorId = ctx.state.user.id;
      const notificationId = parseInt(ctx.params.notificationId);

      if (isNaN(notificationId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid notification ID" };
        return;
      }

      // Verify notification belongs to instructor
      const verifyQuery = `
        SELECT notification_id FROM notifications 
        WHERE notification_id = $1 AND user_id = $2
      `;
      const verifyResult = await instructorNotificationService.db.query(verifyQuery, [notificationId, instructorId]);
      
      if (verifyResult.rows.length === 0) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Notification not found" };
        return;
      }

      // Mark as read
      const updateQuery = `
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE notification_id = $1 AND user_id = $2 AND read_at IS NULL
      `;
      const result = await instructorNotificationService.db.query(updateQuery, [notificationId, instructorId]);

      ctx.response.status = Status.OK;
      ctx.response.body = { 
        message: result.rowCount > 0 ? "Notification marked as read" : "Notification was already read",
        success: true
      };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to mark notification as read" };
    }
  }
);

/**
 * POST /api/instructor/notifications/read-all
 * Mark all notifications as read for instructor
 */
instructorNotificationRouter.post(
  '/instructor/notifications/read-all',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;

      const query = `
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND read_at IS NULL
      `;
      const result = await instructorNotificationService.db.query(query, [instructorId]);

      ctx.response.status = Status.OK;
      ctx.response.body = { 
        message: `${result.rowCount || 0} notification${(result.rowCount || 0) === 1 ? '' : 's'} marked as read`,
        count: result.rowCount || 0
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to mark notifications as read" };
    }
  }
);

// =============================================================================
// ADMIN ENDPOINTS FOR MANAGING INSTRUCTOR NOTIFICATIONS
// =============================================================================

/**
 * POST /api/admin/instructor-notifications/deadline-reminder
 * Send deadline reminder to all instructors (Admin only)
 */
instructorNotificationRouter.post(
  '/admin/instructor-notifications/deadline-reminder',
  async (ctx: Context, next) => {
    await requireRole(authService, 'admin', 'ta_coordinator')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;

      const schema = z.object({
        deadlineType: z.string().min(1, "Deadline type is required"),
        deadlineDate: z.string().refine(date => !isNaN(new Date(date).getTime()), "Invalid date format"),
        customMessage: z.string().optional()
      });

      const validation = schema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid input",
          details: validation.error.errors
        };
        return;
      }

      const { deadlineType, deadlineDate, customMessage } = validation.data;

      const sent = await instructorNotificationService.sendBulkDeadlineNotification(
        deadlineType,
        new Date(deadlineDate),
        customMessage
      );

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: `Deadline reminder sent successfully`,
        instructorsNotified: sent,
        deadlineType,
        deadlineDate
      };
    } catch (error) {
      console.error("Error sending bulk deadline reminder:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to send deadline reminders" };
    }
  }
);

/**
 * POST /api/admin/instructor-notifications/test/:instructorId
 * Send test notification to specific instructor (Admin only)
 */
instructorNotificationRouter.post(
  '/admin/instructor-notifications/test/:instructorId',
  async (ctx: Context, next) => {
    await requireRole(authService, 'admin', 'ta_coordinator')(ctx, next);
  },
  async (ctx: RouterContext<"/admin/instructor-notifications/test/:instructorId">) => {
    try {
      const instructorId = parseInt(ctx.params.instructorId);
      if (isNaN(instructorId)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid instructor ID" };
        return;
      }

      const body = await ctx.request.body({ type: "json" }).value;
      const type = body?.type || 'deadline_reminder';

      await instructorNotificationScheduler.sendTestNotification(instructorId, type);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: `Test notification (${type}) sent successfully`,
        instructorId,
        type
      };
    } catch (error) {
      console.error("Error sending test notification:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to send test notification" };
    }
  }
);

/**
 * GET /api/admin/instructor-notifications/scheduler/status
 * Get scheduler status (Admin only)
 */
instructorNotificationRouter.get(
  '/admin/instructor-notifications/scheduler/status',
  async (ctx: Context, next) => {
    await requireRole(authService, 'admin')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const status = instructorNotificationScheduler.getStatus();

      ctx.response.status = Status.OK;
      ctx.response.body = {
        scheduler: status,
        environment: Deno.env.get("ENVIRONMENT") || "development"
      };
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to get scheduler status" };
    }
  }
);

/**
 * POST /api/admin/instructor-notifications/scheduler/trigger
 * Manually trigger scheduled tasks (Admin only)
 */
instructorNotificationRouter.post(
  '/admin/instructor-notifications/scheduler/trigger',
  async (ctx: Context, next) => {
    await requireRole(authService, 'admin')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      const taskType = body?.taskType || 'deadline_reminders';

      switch (taskType) {
        case 'deadline_reminders':
          await instructorNotificationScheduler.triggerDeadlineReminders();
          break;
        case 'allocation_confirmations':
          await instructorNotificationScheduler.triggerAllocationConfirmations();
          break;
        default:
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { error: "Invalid task type. Use 'deadline_reminders' or 'allocation_confirmations'" };
          return;
      }

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: `${taskType} triggered successfully`,
        taskType,
        triggeredAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error triggering scheduler task:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to trigger scheduler task" };
    }
  }
);

// =============================================================================
// NOTIFICATION PREFERENCES FOR INSTRUCTORS
// =============================================================================

/**
 * GET /api/instructor/notification-preferences
 * Get instructor's notification preferences
 */
instructorNotificationRouter.get(
  '/instructor/notification-preferences',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;

      const query = `
        SELECT * FROM user_notification_preferences 
        WHERE user_id = $1
      `;
      const result = await instructorNotificationService.db.query(query, [instructorId]);

      let preferences;
      if (result.rows.length === 0) {
        // Create default preferences
        const createQuery = `
          INSERT INTO user_notification_preferences (user_id)
          VALUES ($1)
          RETURNING *
        `;
        const createResult = await instructorNotificationService.db.query(createQuery, [instructorId]);
        preferences = createResult.rows[0];
      } else {
        preferences = result.rows[0];
      }

      ctx.response.status = Status.OK;
      ctx.response.body = { preferences };
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch notification preferences" };
    }
  }
);

/**
 * PUT /api/instructor/notification-preferences
 * Update instructor's notification preferences
 */
instructorNotificationRouter.put(
  '/instructor/notification-preferences',
  async (ctx: Context, next) => {
    await requireRole(authService, 'instructor')(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const instructorId = ctx.state.user.id;
      const body = await ctx.request.body({ type: "json" }).value;

      const schema = z.object({
        email_notifications: z.boolean().optional(),
        in_app_notifications: z.boolean().optional(),
        deadline_reminders: z.boolean().optional(),
        allocation_updates: z.boolean().optional(),
        reminder_days_before: z.number().min(0).max(30).optional()
      });

      const validation = schema.safeParse(body);
      if (!validation.success) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Invalid preferences",
          details: validation.error.errors
        };
        return;
      }

      const fields = Object.keys(validation.data).filter(key => validation.data[key as keyof typeof validation.data] !== undefined);
      
      if (fields.length === 0) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "No valid preferences provided" };
        return;
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const query = `
        UPDATE user_notification_preferences 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `;

      const values = [instructorId, ...fields.map(field => (validation.data as any)[field])];
      const result = await instructorNotificationService.db.query(query, values);

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: "Notification preferences updated successfully",
        preferences: result.rows[0]
      };
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update notification preferences" };
    }
  }
);