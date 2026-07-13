import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createLabSectionsTable = async (database: Database): Promise<void> => {
    const schema = `
        lab_section_id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        section_name VARCHAR(50) NOT NULL,
        lab_days VARCHAR(100) NOT NULL,
        lab_start_time VARCHAR(20) NOT NULL,
        lab_end_time VARCHAR(20) NOT NULL,
        ta_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, section_name)
    `;
    await createTableIfNotExists(database, 'lab_sections', schema);
    console.log("Created lab_sections table");
}; 