import { Database } from '../config.ts';
import { createTableIfNotExists } from "./schemaHelper.ts";

export async function createRefreshTokensTable(db: Database): Promise<void> {
    const query = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
    )
    `;
    
    try {
        await db.query(query);
        console.log("Created refresh_tokens table");
    } catch (error) {
        console.error("Error creating refresh_tokens table:", error);
        throw error;
    }
}

export async function createPasswordResetTokensTable(db: Database): Promise<void> {
    const query = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        reset_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `;
    
    try {
        await db.query(query);
        console.log("Created password_reset_tokens table");
    } catch (error) {
        console.error("Error creating password_reset_tokens table:", error);
        throw error;
    }
}

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
    
    // Create indexes
    try {
        await database.query(`
            CREATE INDEX IF NOT EXISTS idx_password_reset_otp_code 
            ON password_reset_otp(otp_code) 
            WHERE NOT used
        `);
        
        await database.query(`
            CREATE INDEX IF NOT EXISTS idx_password_reset_otp_user_expires 
            ON password_reset_otp(user_id, expires_at) 
            WHERE NOT used
        `);
        
        await database.query(`
            COMMENT ON TABLE password_reset_otp IS 
            'Stores OTP codes for password reset functionality with 15-minute expiration'
        `);
        
        console.log("Created password_reset_otp table");
    } catch (error) {
        console.log("Password reset OTP table setup completed");
    }
};
