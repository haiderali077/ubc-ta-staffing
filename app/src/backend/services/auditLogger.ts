import { Database } from '../../database/config.ts';
import { AuditLogModel } from '../../database/models/auditLog.ts';

export class AuditLogger {
    private auditLogModel: AuditLogModel;

    constructor(database: Database) {
        this.auditLogModel = new AuditLogModel(database);
    }

    // Log user authentication events
    async logAuth(
        action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_COMPLETE' | 'REGISTRATION' | 'REGISTRATION_FAILED' | 'PASSWORD_RESET_OTP_SENT',
        user_id: number | null,
        user_email: string | null,
        success: boolean = true,
        error_message?: string,
        additional_details?: string
    ): Promise<void> {
        const severity = this.determineSeverity(action, success);
        
        await this.auditLogModel.createLog({
            user_id: user_id || undefined,
            user_email: user_email || undefined,
            action,
            resource: 'Authentication',
            details: additional_details || `${action} ${success ? 'successful' : 'failed'}`,
            severity,
            success,
            error_message
        });
    }

    // Log user management events
    async logUserManagement(
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE' | 'ROLE_CHANGE',
        actor_id: number,
        actor_email: string,
        target_user_id: number,
        target_user_email: string,
        additional_details?: string
    ): Promise<void> {
        const severity = action === 'DELETE' || action === 'ROLE_CHANGE' ? 'high' : 'medium';
        
        await this.auditLogModel.createLog({
            user_id: actor_id,
            user_email: actor_email,
            action,
            resource: 'User Account',
            resource_id: target_user_id.toString(),
            details: additional_details || `${action} user account for ${target_user_email}`,
            severity
        });
    }

    // Log system configuration changes
    async logSystemConfig(
        action: 'CREATE' | 'UPDATE' | 'DELETE',
        user_id: number,
        user_email: string,
        resource: string,
        resource_id?: string,
        additional_details?: string
    ): Promise<void> {
        await this.auditLogModel.createLog({
            user_id,
            user_email,
            action,
            resource,
            resource_id,
            details: additional_details || `${action} ${resource}`,
            severity: 'medium'
        });
    }

    // Log data access events
    async logDataAccess(
        action: 'VIEW' | 'EXPORT' | 'DOWNLOAD',
        user_id: number,
        user_email: string,
        resource: string,
        resource_id?: string,
        additional_details?: string
    ): Promise<void> {
        await this.auditLogModel.createLog({
            user_id,
            user_email,
            action,
            resource,
            resource_id,
            details: additional_details || `${action} ${resource}`,
            severity: 'low'
        });
    }

    // Log API access for monitoring
    async logApiAccess(
        endpoint: string,
        method: string,
        user_id?: number,
        user_email?: string,
        status_code?: number,
        response_time?: number
    ): Promise<void> {
        const success = status_code ? status_code < 400 : true;
        const severity = status_code && status_code >= 500 ? 'high' : 'low';
        
        await this.auditLogModel.createLog({
            user_id,
            user_email,
            action: 'API_ACCESS',
            resource: 'API Endpoint',
            resource_id: `${method} ${endpoint}`,
            details: `${method} ${endpoint} - Status: ${status_code || 'Unknown'} - Response Time: ${response_time || 'Unknown'}ms`,
            severity,
            success
        });
    }

    // Log security events
    async logSecurity(
        action: 'UNAUTHORIZED_ACCESS' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'ACCOUNT_LOCKED',
        user_id?: number,
        user_email?: string,
        additional_details?: string
    ): Promise<void> {
        await this.auditLogModel.createLog({
            user_id,
            user_email,
            action,
            resource: 'Security',
            details: additional_details || action.replace('_', ' ').toLowerCase(),
            severity: 'high',
            success: false
        });
    }

    // Log assignment and allocation events
    async logAssignment(
        action: 'ASSIGN' | 'UNASSIGN' | 'REASSIGN' | 'UPDATE_STATUS' | 'UPDATE_NOTES',
        actor_id: number,
        actor_email: string,
        student_id: number,
        student_email: string,
        course_id: number,
        course_code: string,
        allocation_id?: number,
        previous_values?: any,
        new_values?: any,
        notes?: string
    ): Promise<void> {
        let details = `${action} student ${student_email} ${action === 'UNASSIGN' ? 'from' : 'to'} course ${course_code}`;
        
        // Add detailed information about changes
        if (previous_values && new_values) {
            const changes: string[] = [];
            for (const [key, newValue] of Object.entries(new_values)) {
                const oldValue = (previous_values as any)[key];
                if (oldValue !== newValue) {
                    changes.push(`${key}: "${oldValue}" → "${newValue}"`);
                }
            }
            if (changes.length > 0) {
                details += ` | Changes: ${changes.join(', ')}`;
            }
        }
        
        if (notes) {
            details += ` | Notes: ${notes}`;
        }

        await this.auditLogModel.createLog({
            user_id: actor_id,
            user_email: actor_email,
            action,
            resource: 'TA Assignment',
            resource_id: allocation_id?.toString() || `${student_id}-${course_id}`,
            details,
            severity: action === 'UNASSIGN' ? 'medium' : 'low',
            success: true
        });
    }

    // Log application status changes
    async logApplicationEdit(
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'APPROVE' | 'REJECT',
        actor_id: number,
        actor_email: string,
        application_id: number,
        student_id?: number,
        student_email?: string,
        previous_values?: any,
        new_values?: any,
        additional_details?: string
    ): Promise<void> {
        let details = `${action} TA application #${application_id}`;
        
        if (student_email) {
            details += ` for student ${student_email}`;
        }
        
        // Add detailed information about changes
        if (previous_values && new_values) {
            const changes: string[] = [];
            for (const [key, newValue] of Object.entries(new_values)) {
                const oldValue = (previous_values as any)[key];
                if (oldValue !== newValue) {
                    changes.push(`${key}: "${oldValue}" → "${newValue}"`);
                }
            }
            if (changes.length > 0) {
                details += ` | Changes: ${changes.join(', ')}`;
            }
        }
        
        if (additional_details) {
            details += ` | ${additional_details}`;
        }

        await this.auditLogModel.createLog({
            user_id: actor_id,
            user_email: actor_email,
            action,
            resource: 'TA Application',
            resource_id: application_id.toString(),
            details,
            severity: action === 'DELETE' ? 'medium' : 'low',
            success: true
        });
    }

    // Log course assignment changes (TA Needs)
    async logCourseAssignmentEdit(
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT',
        actor_id: number,
        actor_email: string,
        course_id: number,
        course_code: string,
        need_id?: number,
        previous_values?: any,
        new_values?: any,
        additional_details?: string
    ): Promise<void> {
        let details = `${action} TA need for course ${course_code}`;
        
        // Add detailed information about changes
        if (previous_values && new_values) {
            const changes: string[] = [];
            for (const [key, newValue] of Object.entries(new_values)) {
                const oldValue = (previous_values as any)[key];
                if (oldValue !== newValue) {
                    changes.push(`${key}: "${oldValue}" → "${newValue}"`);
                }
            }
            if (changes.length > 0) {
                details += ` | Changes: ${changes.join(', ')}`;
            }
        }
        
        if (additional_details) {
            details += ` | ${additional_details}`;
        }

        await this.auditLogModel.createLog({
            user_id: actor_id,
            user_email: actor_email,
            action,
            resource: 'TA Course Need',
            resource_id: need_id?.toString() || course_id.toString(),
            details,
            severity: action === 'DELETE' ? 'medium' : 'low',
            success: true
        });
    }

    // Log bulk assignment operations
    async logBulkAssignment(
        action: 'BULK_ASSIGN' | 'BULK_UNASSIGN' | 'BULK_UPDATE',
        actor_id: number,
        actor_email: string,
        affected_count: number,
        operation_details: string,
        success_count?: number,
        failure_count?: number
    ): Promise<void> {
        let details = `${action} operation affecting ${affected_count} assignments`;
        
        if (success_count !== undefined && failure_count !== undefined) {
            details += ` | Success: ${success_count}, Failures: ${failure_count}`;
        }
        
        details += ` | Details: ${operation_details}`;

        await this.auditLogModel.createLog({
            user_id: actor_id,
            user_email: actor_email,
            action,
            resource: 'Bulk Assignment',
            details,
            severity: failure_count && failure_count > 0 ? 'medium' : 'low',
            success: !failure_count || failure_count === 0
        });
    }


    // Helper method to determine severity based on action and success
    private determineSeverity(action: string, success: boolean): 'low' | 'medium' | 'high' {
        if (!success) {
            if (action === 'LOGIN_FAILED') return 'medium';
            return 'high';
        }

        switch (action) {
            case 'LOGIN':
            case 'LOGOUT':
                return 'low';
            case 'PASSWORD_RESET_REQUEST':
            case 'PASSWORD_RESET_COMPLETE':
                return 'medium';
            default:
                return 'low';
        }
    }
}
export default AuditLogger;