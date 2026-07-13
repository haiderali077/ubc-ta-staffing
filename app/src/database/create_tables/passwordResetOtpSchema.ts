import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createPasswordResetOtpTable = async (database: Database): Promise<void> => {
    const schema = `
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        otp_code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        attempts INTEGER DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        CONSTRAINT valid_otp CHECK (otp_code ~ '^\\d{6}$')
    `;
    
    await createTableIfNotExists(database, 'password_reset_otp', schema);
    
    // Create indexes for better performance
    try {
        // Index for OTP code lookups
        await database.query(`
            CREATE INDEX IF NOT EXISTS idx_password_reset_otp_code 
            ON password_reset_otp(otp_code) 
            WHERE NOT used
        `);
        
        // Index for user and expiration lookups
        await database.query(`
            CREATE INDEX IF NOT EXISTS idx_password_reset_otp_user_expires 
            ON password_reset_otp(user_id, expires_at) 
            WHERE NOT used
        `);
        
        console.log("Created password_reset_otp table with indexes");
    } catch (error) {
        console.log("Indexes for password_reset_otp might already exist:", error);
    }
};

// Migration function to add table description (PostgreSQL comment)
export const addPasswordResetOtpTableComment = async (database: Database): Promise<void> => {
    try {
        await database.query(`
            COMMENT ON TABLE password_reset_otp IS 
            'Stores OTP codes for password reset functionality with 15-minute expiration'
        `);
        console.log("Added comment to password_reset_otp table");
    } catch (error) {
        console.log("Comment might already exist:", error);
    }
};