import { Database } from '../config.ts';

export async function createTableIfNotExists(db: Database, tableName: string, columnsDefinition: string): Promise<void> {
    try {
        const checkTableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = $1
            );
        `;
        const result = await db.query(checkTableExistsQuery, [tableName]);
        
        if (result.rows[0] && result.rows[0].exists) {
            console.log(`Table "${tableName}" already exists.`);
            return;
        }

        // Create the full CREATE TABLE query using the columns definition
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                ${columnsDefinition}
            )
        `;
        
        // If the table does not exist, create it
        await db.query(createTableQuery);
        console.log(`Created table "${tableName}".`);

    } catch (error) {
        console.error(`Error creating table "${tableName}":`, error);
        throw error;
    }
}
