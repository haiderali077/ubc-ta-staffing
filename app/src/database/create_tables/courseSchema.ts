import { Database } from '../config.ts';
import { createTableIfNotExists } from './schemaHelper.ts';

export const createCourseTemplatesTable = async (database: Database): Promise<void> => {
    const schema = `
        template_id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        dept_id INTEGER REFERENCES departments(dept_id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
    await createTableIfNotExists(database, 'course_templates', schema);
    console.log("Created course_templates table");
};

export const createCoursesTable = async (database: Database): Promise<void> => {
    const schema = `
        course_id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        term VARCHAR(50) NOT NULL,
        instructor_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        dept_id INTEGER REFERENCES departments(dept_id) ON DELETE SET NULL,
        template_id INTEGER REFERENCES course_templates(template_id) ON DELETE SET NULL,
        max_tas INTEGER DEFAULT 5 CHECK (max_tas > 0),
        course_days VARCHAR(100),
        course_time VARCHAR(100),
        course_frequency VARCHAR(20) CHECK (course_frequency IN ('weekly', 'bi-weekly')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(code, term)
    `;
    await createTableIfNotExists(database, 'courses', schema);
    console.log("Created courses table");
};