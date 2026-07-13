import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createUsersTable = async (database: Database): Promise<void> => {
    const schema = `
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'instructor', 'admin', 'ta_coordinator')),
        major VARCHAR(255),
        student_number VARCHAR(20),
        prev_roles TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
    await createTableIfNotExists(database, 'users', schema);
    console.log("Created users table");
};

export const migrateUsersTable = async (database: Database): Promise<void> => {
    try {
        // Check if student_number column exists
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'student_number'
        `;
        const result = await database.query(checkColumnQuery);
        
        if (result.rows.length === 0) {
            // Add student_number column if it doesn't exist
            const addColumnQuery = `
                ALTER TABLE users 
                ADD COLUMN student_number VARCHAR(20)
            `;
            await database.query(addColumnQuery);
            console.log("Added student_number column to users table");
        } else {
            console.log("student_number column already exists in users table");
        }

        // Check if is_active column exists
        const checkIsActiveQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_active'
        `;
        const isActiveResult = await database.query(checkIsActiveQuery);
        
        if (isActiveResult.rows.length === 0) {
            // Add is_active column if it doesn't exist
            const addIsActiveColumnQuery = `
                ALTER TABLE users 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE
            `;
            await database.query(addIsActiveColumnQuery);
            console.log("Added is_active column to users table");
        } else {
            console.log("is_active column already exists in users table");
        }

        // Update role constraint to include ta_coordinator
        try {
            const updateRoleConstraintQuery = `
                ALTER TABLE users 
                DROP CONSTRAINT IF EXISTS users_role_check,
                ADD CONSTRAINT users_role_check 
                CHECK (role IN ('student', 'instructor', 'admin', 'ta_coordinator'))
            `;
            await database.query(updateRoleConstraintQuery);
            console.log("Updated role constraint to include ta_coordinator");
        } catch (constraintError) {
            console.log("Role constraint update not needed or already applied");
        }
    } catch (error) {
        console.error("Error migrating users table:", error);
        throw error;
    }
};

export const createUserProfilesTable = async (database: Database): Promise<void> => {
    const schema = `
        profile_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        avatar_url VARCHAR(500),
        resume_url VARCHAR(500),
        bio TEXT,
        linkedin_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
    `;
    await createTableIfNotExists(database, 'user_profiles', schema);
    console.log("Created user_profiles table");
};

export const createRefreshTokensTable = async (database: Database): Promise<void> => {
    const schema = `
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
    `;
    await createTableIfNotExists(database, 'refresh_tokens', schema);
    console.log("Created refresh_tokens table");
};
