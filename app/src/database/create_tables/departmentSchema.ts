import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createDepartmentsTable = async (database: Database): Promise<void> => {
    const schema = `
        dept_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
    `;
    await createTableIfNotExists(database, 'departments', schema);
    console.log("Created departments table");
};