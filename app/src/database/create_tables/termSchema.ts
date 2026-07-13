import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createTermsTable = async (database: Database): Promise<void> => {
    const schema = `
        term_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
    await createTableIfNotExists(database, 'terms', schema);
    
    // Update any existing terms to use 'upcoming' status
    try {
        await database.query(`UPDATE terms SET status = 'upcoming' WHERE status != 'upcoming'`);
        console.log("Updated existing terms to 'upcoming' status");
    } catch (error) {
        console.log("No existing terms to update or update failed:", error);
    }
    
    console.log("Created terms table");
};