import { Database } from '../config.ts';

export interface AuditLogEntry {
    audit_id?: number;
    user_id?: number;
    user_email?: string;
    action: string;
    resource: string;
    resource_id?: string;
    details?: string;
    ip_address?: string;
    user_agent?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    success?: boolean;
    error_message?: string;
    session_id?: string;
    timestamp?: Date;
}

export interface AuditLogFilters {
    user_id?: number;
    action?: string;
    resource?: string;
    severity?: string;
    success?: boolean;
    start_date?: Date;
    end_date?: Date;
    search?: string;
}

export interface SystemUsageMetric {
    metric_id?: number;
    metric_type: string;
    metric_name: string;
    metric_value: number;
    additional_data?: any;
    period_start: Date;
    period_end: Date;
    created_at?: Date;
}

export class AuditLogModel {
    private db: Database;

    constructor(database: Database) {
        this.db = database;
    }

    // Create a new audit log entry
    async createLog(entry: AuditLogEntry): Promise<AuditLogEntry> {
        const query = `
            INSERT INTO audit_logs (
                user_id, user_email, action, resource, resource_id, 
                details, ip_address, user_agent, severity, success, 
                error_message, session_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        const values = [
            entry.user_id || null,
            entry.user_email || null,
            entry.action,
            entry.resource,
            entry.resource_id || null,
            entry.details || null,
            entry.ip_address || null,
            entry.user_agent || null,
            entry.severity || 'low',
            entry.success ?? true,
            entry.error_message || null,
            entry.session_id || null
        ];

        try {
            const result = await this.db.query(query, values);
            return result.rows[0] as unknown as AuditLogEntry;
        } catch (error) {
            console.error('Error creating audit log:', error);
            throw error;
        }
    }

    // Get audit logs with filtering and pagination
    async getLogs(filters: AuditLogFilters = {}, limit: number = 50, offset: number = 0): Promise<{
        logs: AuditLogEntry[];
        total: number;
    }> {
        let whereConditions: string[] = [];
        let queryParams: any[] = [];
        let paramCount = 0;

        // Build WHERE conditions
        if (filters.user_id) {
            paramCount++;
            whereConditions.push(`user_id = $${paramCount}`);
            queryParams.push(filters.user_id);
        }

        if (filters.action) {
            paramCount++;
            whereConditions.push(`action = $${paramCount}`);
            queryParams.push(filters.action);
        }

        if (filters.resource) {
            paramCount++;
            whereConditions.push(`resource = $${paramCount}`);
            queryParams.push(filters.resource);
        }

        if (filters.severity) {
            paramCount++;
            whereConditions.push(`severity = $${paramCount}`);
            queryParams.push(filters.severity);
        }

        if (filters.success !== undefined) {
            paramCount++;
            whereConditions.push(`success = $${paramCount}`);
            queryParams.push(filters.success);
        }

        if (filters.start_date) {
            paramCount++;
            whereConditions.push(`timestamp >= $${paramCount}`);
            queryParams.push(filters.start_date);
        }

        if (filters.end_date) {
            paramCount++;
            whereConditions.push(`timestamp <= $${paramCount}`);
            queryParams.push(filters.end_date);
        }

        if (filters.search) {
            paramCount++;
            whereConditions.push(`(
                user_email ILIKE $${paramCount} OR 
                details ILIKE $${paramCount} OR 
                action ILIKE $${paramCount} OR 
                resource ILIKE $${paramCount}
            )`);
            queryParams.push(`%${filters.search}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
        const countResult = await this.db.query(countQuery, queryParams);
        const total = parseInt(String(countResult.rows[0].total));

        // Get logs with pagination
        paramCount++;
        const limitParam = paramCount;
        paramCount++;
        const offsetParam = paramCount;

        const logsQuery = `
            SELECT * FROM audit_logs 
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT $${limitParam} OFFSET $${offsetParam}
        `;
        
        queryParams.push(limit, offset);
        const logsResult = await this.db.query(logsQuery, queryParams);

        return {
            logs: logsResult.rows as unknown as AuditLogEntry[],
            total
        };
    }

    // Get audit log statistics
    async getLogStats(): Promise<{
        total_logs: number;
        logs_by_severity: Record<string, number>;
        logs_by_action: Record<string, number>;
        failed_actions: number;
        recent_activity_count: number;
    }> {
        const queries = [
            // Total logs
            `SELECT COUNT(*) as total_logs FROM audit_logs`,
            
            // Logs by severity
            `SELECT severity, COUNT(*) as count FROM audit_logs GROUP BY severity`,
            
            // Logs by action
            `SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 10`,
            
            // Failed actions
            `SELECT COUNT(*) as failed_actions FROM audit_logs WHERE success = false`,
            
            // Recent activity (last 24 hours)
            `SELECT COUNT(*) as recent_count FROM audit_logs WHERE timestamp >= NOW() - INTERVAL '24 hours'`
        ];

        try {
            const results = await Promise.all(
                queries.map(query => this.db.query(query))
            );

            const logs_by_severity: Record<string, number> = {};
            results[1].rows.forEach((row: any) => {
                logs_by_severity[row.severity] = parseInt(row.count);
            });

            const logs_by_action: Record<string, number> = {};
            results[2].rows.forEach((row: any) => {
                logs_by_action[row.action] = parseInt(row.count);
            });

            return {
                total_logs: parseInt(String(results[0].rows[0].total_logs)),
                logs_by_severity,
                logs_by_action,
                failed_actions: parseInt(String(results[3].rows[0].failed_actions)),
                recent_activity_count: parseInt(String(results[4].rows[0].recent_count))
            };
        } catch (error) {
            console.error('Error getting audit log stats:', error);
            throw error;
        }
    }

    // Record system usage metrics
    async recordMetric(metric: SystemUsageMetric): Promise<SystemUsageMetric> {
        const query = `
            INSERT INTO system_usage_metrics (
                metric_type, metric_name, metric_value, additional_data,
                period_start, period_end
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (metric_type, metric_name, period_start)
            DO UPDATE SET 
                metric_value = EXCLUDED.metric_value,
                additional_data = EXCLUDED.additional_data,
                period_end = EXCLUDED.period_end
            RETURNING *
        `;

        const values = [
            metric.metric_type,
            metric.metric_name,
            metric.metric_value,
            metric.additional_data ? JSON.stringify(metric.additional_data) : null,
            metric.period_start,
            metric.period_end
        ];

        try {
            const result = await this.db.query(query, values);
            return result.rows[0] as unknown as SystemUsageMetric;
        } catch (error) {
            console.error('Error recording system metric:', error);
            throw error;
        }
    }

    // Get system usage metrics
    async getSystemMetrics(metric_type?: string, days: number = 7): Promise<SystemUsageMetric[]> {
        let query = `
            SELECT * FROM system_usage_metrics 
            WHERE period_start >= NOW() - INTERVAL '${days} days'
        `;
        
        const params: any[] = [];
        
        if (metric_type) {
            query += ` AND metric_type = $1`;
            params.push(metric_type);
        }
        
        query += ` ORDER BY period_start DESC`;

        try {
            const result = await this.db.query(query, params);
            return result.rows as unknown as SystemUsageMetric[];
        } catch (error) {
            console.error('Error getting system metrics:', error);
            throw error;
        }
    }
}
