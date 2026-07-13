import { Context, Router, Status } from "../../../deps.ts";
import { AuditLogModel } from '../../database/models/auditLog.ts';
import { createAuthMiddleware } from "../middleware/auth.ts";
import { AuthService } from '../services/auth.ts';

export const auditLogRouter = new Router();

// Initialize models (to be injected)
let auditLogModel: AuditLogModel;
let authService: AuthService;

// Dependency injection function
export function setAuditLogModels(
    auditModel: AuditLogModel,
    auth: AuthService
) {
    auditLogModel = auditModel;
    authService = auth;
    
    // Initialize admin-only middleware
    const adminOnly = createAuthMiddleware({
        authService: auth,
        requiredRoles: ['admin']
    });

    // Register all routes with proper middleware
    registerAuditLogRoutes(adminOnly);
}

function registerAuditLogRoutes(adminOnly: any) {
    // GET /api/audit-logs - Get audit logs with filtering and pagination
    auditLogRouter.get('/audit-logs', adminOnly, async (ctx: Context) => {
    try {
        const url = new URL(ctx.request.url);
        const params = url.searchParams;

        // Parse query parameters
        const filters: any = {};
        const limit = parseInt(params.get('limit') || '50');
        const offset = parseInt(params.get('offset') || '0');

        if (params.get('user_id')) {
            filters.user_id = parseInt(params.get('user_id')!);
        }
        if (params.get('action')) {
            filters.action = params.get('action');
        }
        if (params.get('resource')) {
            filters.resource = params.get('resource');
        }
        if (params.get('severity')) {
            filters.severity = params.get('severity');
        }
        if (params.get('success')) {
            filters.success = params.get('success') === 'true';
        }
        if (params.get('search')) {
            filters.search = params.get('search');
        }
        if (params.get('start_date')) {
            filters.start_date = new Date(params.get('start_date')!);
        }
        if (params.get('end_date')) {
            filters.end_date = new Date(params.get('end_date')!);
        }

        const result = await auditLogModel.getLogs(filters, limit, offset);

        ctx.response.status = Status.OK;
        ctx.response.body = {
            logs: result.logs,
            total: result.total,
            limit,
            offset,
            has_more: result.total > offset + limit
        };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: 'Failed to fetch audit logs' };
    }
});

// GET /api/audit-logs/stats - Get audit log statistics
auditLogRouter.get('/audit-logs/stats', adminOnly, async (ctx: Context) => {
    try {
        const stats = await auditLogModel.getLogStats();

        ctx.response.status = Status.OK;
        ctx.response.body = { stats };
    } catch (error) {
        console.error('Error fetching audit log stats:', error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: 'Failed to fetch audit log statistics' };
    }
});

// GET /api/system-metrics - Get system usage metrics
auditLogRouter.get('/system-metrics', adminOnly, async (ctx: Context) => {
    try {
        const url = new URL(ctx.request.url);
        const params = url.searchParams;
        
        const metric_type = params.get('type') || undefined;
        const days = parseInt(params.get('days') || '7');

        const metrics = await auditLogModel.getSystemMetrics(metric_type, days);

        ctx.response.status = Status.OK;
        ctx.response.body = { metrics };
    } catch (error) {
        console.error('Error fetching system metrics:', error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: 'Failed to fetch system metrics' };
    }
});

// GET /api/system-overview - Get system overview statistics
auditLogRouter.get('/system-overview', adminOnly, async (ctx: Context) => {
    try {
        // Get audit log stats
        const auditStats = await auditLogModel.getLogStats();
        
        // Get basic system metrics (you can expand this with more sophisticated metrics)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get recent activity metrics
        const recentLogins = await auditLogModel.getLogs({
            action: 'LOGIN',
            start_date: yesterday
        }, 100, 0);

        const recentFailedLogins = await auditLogModel.getLogs({
            action: 'LOGIN_FAILED',
            start_date: weekAgo
        }, 100, 0);

        const systemOverview = {
            audit_logs: {
                total: auditStats.total_logs,
                recent_activity: auditStats.recent_activity_count,
                failed_actions: auditStats.failed_actions,
                by_severity: auditStats.logs_by_severity,
                by_action: auditStats.logs_by_action
            },
            security: {
                recent_logins: recentLogins.total,
                failed_logins_week: recentFailedLogins.total,
                security_alerts: auditStats.logs_by_severity.high || 0
            },
            system: {
                uptime: 0, // We'll implement this later when we have proper metrics
                last_updated: new Date().toISOString()
            }
        };

        ctx.response.status = Status.OK;
        ctx.response.body = systemOverview;
    } catch (error) {
        console.error('Error fetching system overview:', error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: 'Failed to fetch system overview' };
    }
});

} // End of registerAuditLogRoutes function
