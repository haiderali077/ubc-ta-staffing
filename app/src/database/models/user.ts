import { Database } from '../config.ts';

export interface User {
    user_id?: number; //id
    name: string;
    email: string;
    password_hash: string;
    role: 'student' | 'instructor' | 'admin' | 'ta_coordinator';
    student_number?: string;
    major?: string;
    prev_roles?: string;
    is_active?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface UserWithoutPassword {
    user_id?: number; //id
    name: string;
    email: string;
    role: 'student' | 'instructor' | 'admin' | 'ta_coordinator';
    student_number?: string;
    major?: string;
    prev_roles?: string;
    is_active?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export class UserModel {
    private db: Database;

        constructor(database: Database) {
        this.db = database;
    }

    async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
        const query = `
        INSERT INTO users (name, email, password_hash, role, student_number, major, prev_roles, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `; // using parameter binding to prevent SQL injection
        
        const result = await this.db.query<User>(query, [
            user.name,
            user.email,
            user.password_hash,
            user.role,
            user.student_number,
            user.major,
            user.prev_roles,
            user.is_active ?? true // Default to true if not specified
        ]);
           
        return result.rows[0];
    }

    async getUserById(userId: number): Promise<User | null> {
        const query = `SELECT * FROM users WHERE user_id = $1`;
        const result = await this.db.query<User>(query, [userId]);
        
        return result.rows[0] || null;
    }


    async getUserByEmail(email: string): Promise<User | null> {
        const query = `SELECT * FROM users WHERE email = $1`;
        const result = await this.db.query<User>(query, [email]);

        return result.rows[0] || null;
    }

    async getUsersByRole(role: 'student' | 'instructor' | 'admin' | 'ta_coordinator'): Promise<UserWithoutPassword[]> {
        const query = `SELECT user_id, name, email, role, major, student_number, prev_roles, created_at, updated_at, is_active FROM users WHERE role = $1 ORDER BY name`;
        const result = await this.db.query<UserWithoutPassword>(query, [role]);
        return result.rows;
    }

        async updateUser(userId: number, updates: Partial<User>): Promise<User | null> {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Only update fields that are provided
        if (updates.name !== undefined) {
            fields.push(`name = $${paramCount}`);
            values.push(updates.name);
            paramCount++;
        }
        if (updates.email !== undefined) {
            fields.push(`email = $${paramCount}`);
            values.push(updates.email);
            paramCount++;
        }
        if (updates.password_hash !== undefined) {
            fields.push(`password_hash = $${paramCount}`);
            values.push(updates.password_hash);
            paramCount++;
        }
        if (updates.role !== undefined) {
            fields.push(`role = $${paramCount}`);
            values.push(updates.role);
            paramCount++;
        }
        if (updates.student_number !== undefined) {
            fields.push(`student_number = $${paramCount}`);
            values.push(updates.student_number);
            paramCount++;
        }
        if (updates.major !== undefined) {
            fields.push(`major = $${paramCount}`);
            values.push(updates.major);
            paramCount++;
        }
        if (updates.prev_roles !== undefined) {
            fields.push(`prev_roles = $${paramCount}`);
            values.push(updates.prev_roles);
            paramCount++;
        }
        if (updates.is_active !== undefined) {
            fields.push(`is_active = $${paramCount}`);
            values.push(updates.is_active);
            paramCount++;
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);

        const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING *
        `;

        const result = await this.db.query<User>(query, values);
        return result.rows[0] || null;
    }

    async deleteUser(userId: number): Promise<boolean> {
        const query = `DELETE FROM users WHERE user_id = $1`;
        const result = await this.db.query(query, [userId]);
        return result.rows.length > 0;
    }

    // Authentication-related methods
    async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
        // First, remove any existing refresh tokens for this user
        await this.db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
        
        // Then insert the new refresh token
        const query = `
        INSERT INTO refresh_tokens (user_id, token, created_at, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days')
        `;
        await this.db.query(query, [userId, refreshToken]);
    }

    async removeRefreshToken(refreshToken: string): Promise<void> {
        const query = `DELETE FROM refresh_tokens WHERE token = $1`;
        await this.db.query(query, [refreshToken]);
    }

    async isValidRefreshToken(refreshToken: string): Promise<boolean> {
        const query = `
        SELECT COUNT(*) as count FROM refresh_tokens 
        WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
        `;
        const result = await this.db.query<{count: string}>(query, [refreshToken]);
        return parseInt(result.rows[0].count) > 0;
    }

    async cleanupExpiredTokens(): Promise<void> {
        const query = `DELETE FROM refresh_tokens WHERE expires_at <= CURRENT_TIMESTAMP`;
        await this.db.query(query);
    }

    // Admin user management methods
    async getAllUsers(): Promise<User[]> {
        const query = `
        SELECT user_id, name, email, role, student_number, major, prev_roles, created_at, updated_at, is_active
        FROM users 
        ORDER BY created_at DESC
        `;
        const result = await this.db.query<User>(query);
        return result.rows;
    }

    async searchUsers(searchTerm: string): Promise<User[]> {
        const query = `
        SELECT * FROM users 
        WHERE name ILIKE $1 OR email ILIKE $1 
        ORDER BY name
        `;
        const result = await this.db.query<User>(query, [`%${searchTerm}%`]);
        return result.rows;
    }

    async removeAllRefreshTokensForUser(userId: number): Promise<void> {
        const query = `DELETE FROM refresh_tokens WHERE user_id = $1`;
        await this.db.query(query, [userId]);
    }

    // Method to deactivate user (set is_active to false)
    async activateUser(userId: number): Promise<boolean> {
        const query = `UPDATE users SET is_active = true WHERE user_id = $1 RETURNING user_id`;
        const result = await this.db.query(query, [userId]);
        return result.rows.length > 0;
    }

    async deactivateUser(userId: number): Promise<boolean> {
        const query = `UPDATE users SET is_active = false WHERE user_id = $1 RETURNING user_id`;
        const result = await this.db.query(query, [userId]);
        return result.rows.length > 0;
    }

    async updatePassword(userId: number, newPasswordHash: string): Promise<void> {
        const query = `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`;
        await this.db.query(query, [newPasswordHash, userId]);
    }

    async cleanupExpiredPasswordResetTokens(): Promise<void> {
        const query = `DELETE FROM password_reset_tokens WHERE expires_at <= CURRENT_TIMESTAMP`;
        await this.db.query(query);
    }

        // OTP-related methods
    async createPasswordResetOTP(
        userId: number, 
        otpCode: string, 
        ipAddress?: string, 
        userAgent?: string
    ): Promise<void> {
        try {
            // First, invalidate any existing OTPs for this user
            await this.db.query(
                `UPDATE password_reset_otp 
                SET used = TRUE 
                WHERE user_id = $1 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP`,
                [userId]
            );

            // Create new OTP with 15-minute expiration
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            
            await this.db.query(
                `INSERT INTO password_reset_otp 
                (user_id, otp_code, expires_at, ip_address, user_agent) 
                VALUES ($1, $2, $3, $4, $5)`,
                [userId, otpCode, expiresAt, ipAddress || null, userAgent || null]
            );
        } catch (error) {
            console.error("Error creating password reset OTP:", error);
            throw error;
        }
    }

    async getValidOTP(otpCode: string): Promise<{
        id: number;
        user_id: number;
        otp_code: string;
        created_at: Date;
        expires_at: Date;
        attempts: number;
    } | null> {
        try {
            const result = await this.db.query<{
                id: number;
                user_id: number;
                otp_code: string;
                created_at: Date;
                expires_at: Date;
                attempts: number;
            }>(
                `SELECT id, user_id, otp_code, created_at, expires_at, attempts
                FROM password_reset_otp 
                WHERE otp_code = $1 
                    AND used = FALSE 
                    AND expires_at > CURRENT_TIMESTAMP 
                    AND attempts < 3`,
                [otpCode]
            );

            return result.rows[0] || null;
        } catch (error) {
            console.error("Error getting valid OTP:", error);
            throw error;
        }
    }

    async markOTPAsUsed(otpCode: string): Promise<void> {
        try {
            await this.db.query(
                `UPDATE password_reset_otp 
                SET used = TRUE 
                WHERE otp_code = $1`,
                [otpCode]
            );
        } catch (error) {
            console.error("Error marking OTP as used:", error);
            throw error;
        }
    }

    async incrementOTPAttempts(otpCode: string): Promise<number> {
        try {
            const result = await this.db.query<{ attempts: number }>(
                `UPDATE password_reset_otp 
                SET attempts = attempts + 1 
                WHERE otp_code = $1 
                RETURNING attempts`,
                [otpCode]
            );
            
            return result.rows[0]?.attempts || 0;
        } catch (error) {
            console.error("Error incrementing OTP attempts:", error);
            throw error;
        }
    }

    async clearExpiredOTPs(): Promise<number> {
        try {
            const result = await this.db.query<{ count: number }>(
                `WITH deleted AS (
                    DELETE FROM password_reset_otp 
                    WHERE expires_at < CURRENT_TIMESTAMP 
                    OR used = TRUE 
                    OR attempts >= 3
                    RETURNING *
                )
                SELECT COUNT(*) as count FROM deleted`
            );
            
            return result.rows[0]?.count || 0;
        } catch (error) {
            console.error("Error clearing expired OTPs:", error);
            throw error;
        }
    }

    // Check rate limit for OTP generation (max 3 per hour)
    async checkOTPRateLimit(userId: number): Promise<boolean> {
        try {
            const result = await this.db.query<{ count: number }>(
                `SELECT COUNT(*) as count
                FROM password_reset_otp 
                WHERE user_id = $1 
                    AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
                [userId]
            );
            
            return (result.rows[0]?.count || 0) < 300; // change to 3 if needed
        } catch (error) {
            console.error("Error checking OTP rate limit:", error);
            throw error;
        }
    }

    // Password reset token methods
    async _createPasswordResetToken(userId: number, resetToken: string): Promise<void> {
        // First, remove any existing reset tokens for this user
        await this.db.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
        
        // Then insert the new reset token (expires in 1 hour)
        const query = `
        INSERT INTO password_reset_tokens (user_id, reset_token, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 hour')
        `;
        await this.db.query(query, [userId, resetToken]);
    }

    async _getValidPasswordResetToken(resetToken: string): Promise<{ user_id: number } | null> {
        const query = `
        SELECT user_id FROM password_reset_tokens 
        WHERE reset_token = $1 AND expires_at > CURRENT_TIMESTAMP AND used = FALSE
        `;
        const result = await this.db.query<{ user_id: number }>(query, [resetToken]);
        return result.rows[0] || null;
    }

    async _markPasswordResetTokenAsUsed(resetToken: string): Promise<void> {
        const query = `UPDATE password_reset_tokens SET used = TRUE WHERE reset_token = $1`;
        await this.db.query(query, [resetToken]);
    }

    // Legacy method updates (to maintain compatibility)
    async createPasswordResetToken(userId: number, token: string): Promise<void> {
        // Now uses OTP instead - this method is deprecated
        console.warn("createPasswordResetToken is deprecated. Use createPasswordResetOTP instead.");
    }

    async getValidPasswordResetToken(token: string): Promise<{ user_id: number } | null> {
        // Now uses OTP instead - this method is deprecated
        console.warn("getValidPasswordResetToken is deprecated. Use getValidOTP instead.");
        return null;
    }

    async markPasswordResetTokenAsUsed(token: string): Promise<void> {
        // Now uses OTP instead - this method is deprecated
        console.warn("markPasswordResetTokenAsUsed is deprecated. Use markOTPAsUsed instead.");
    }

}