import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createAuditLogsTable = async (database: Database): Promise<void> => {
    const schema = `
        audit_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100),
        details TEXT,
        ip_address INET,
        user_agent TEXT,
        severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        session_id VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
    await createTableIfNotExists(database, 'audit_logs', schema);
    
    // Create indexes separately (PostgreSQL style)
    try {
        await database.query(`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)`);
        await database.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
        await database.query(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`);
        await database.query(`CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity)`);
    } catch (error) {
        console.warn("Warning: Could not create some audit_logs indexes:", error);
    }
    
    console.log("Created audit_logs table");
};

export const createSystemUsageMetricsTable = async (database: Database): Promise<void> => {
    const schema = `
        metric_id SERIAL PRIMARY KEY,
        metric_type VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value BIGINT NOT NULL DEFAULT 0,
        additional_data JSONB,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metric_type, metric_name, period_start)
    `;
    await createTableIfNotExists(database, 'system_usage_metrics', schema);
    
    // Create indexes separately (PostgreSQL style)
    try {
        await database.query(`CREATE INDEX IF NOT EXISTS idx_metrics_type ON system_usage_metrics(metric_type)`);
        await database.query(`CREATE INDEX IF NOT EXISTS idx_metrics_period ON system_usage_metrics(period_start, period_end)`);
    } catch (error) {
        console.warn("Warning: Could not create some system_usage_metrics indexes:", error);
    }
    
    console.log("Created system_usage_metrics table");
};
