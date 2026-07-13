import { Database } from '../config.ts';

export interface Course {
    course_id?: number;
    code: string;
    title: string;
    term: string;
    instructor_id?: number;
    dept_id?: number;
    template_id?: number;
    max_tas?: number;
    course_days?: string;
    course_time?: string;
    course_frequency?: 'weekly' | 'bi-weekly';
    // UR 2.7 - Conflict detection scheduling fields
    schedule_days?: string[] | null;    // ["Monday", "Wednesday", "Friday"]
    start_time?: string | null;         // "09:00"
    end_time?: string | null;           // "11:00"
    weekly_hours?: number | null;       // 6
    created_at?: Date;
    updated_at?: Date;
}

export class CourseModel {
private db: Database;

constructor(database: Database) {
    this.db = database;
}

    async createCourse(course: Omit<Course, 'course_id' | 'created_at' | 'updated_at'>): Promise<Course> {
    const query = `
    INSERT INTO courses (code, title, term, instructor_id, dept_id, template_id, max_tas, course_days, course_time, course_frequency)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `;
    
    const result = await this.db.query<Course>(query, [
        course.code,
        course.title,
        course.term,
        course.instructor_id,
        course.dept_id,
        course.template_id,
        course.max_tas || 3,
        course.course_days || null,
        course.course_time || null,
        course.course_frequency || null
    ]);
    
    return result.rows[0];
}

    async getCourseById(courseId: number): Promise<Course | null> {
        const query = `SELECT * FROM courses WHERE course_id = $1`;
        const result = await this.db.query<Course>(query, [courseId]);

        return result.rows[0] || null;
    }

    async getAllCourses(): Promise<Course[]> {
        const query = `
        SELECT 
            c.course_id,
            c.code,
            c.title,
            c.term,
            c.instructor_id,
            c.dept_id,
            c.template_id,
            c.max_tas,
            c.course_days,
            c.course_time,
            c.course_frequency,
            c.created_at,
            c.updated_at,
            tn.hours_required, 
            tn.notes as ta_notes, 
            tn.status as need_status,
            tn.need_id,
            COALESCE(tn.qualifications, '') as qualifications,
            u.name as instructor_name,
            u.email as instructor_email
        FROM courses c
        LEFT JOIN ta_needs tn ON c.course_id = tn.course_id
        LEFT JOIN users u ON c.instructor_id = u.user_id
        ORDER BY c.term DESC, c.code
        `;
        const result = await this.db.query<Course>(query);

        return result.rows;
    }

    async getCoursesByTerm(term: string): Promise<Course[]> {
        const query = `SELECT * FROM courses WHERE term = $1 ORDER BY code`;
        const result = await this.db.query<Course>(query, [term]);

        return result.rows;
    }

    async getCoursesByInstructor(instructorId: number): Promise<Course[]> {
        const query = `SELECT * FROM courses WHERE instructor_id = $1 ORDER BY term DESC, code`;
        const result = await this.db.query<Course>(query, [instructorId]);

        return result.rows;
    }

async getCoursesWithTANeeds(): Promise<any[]> {
    const query = `
    SELECT 
        c.*, 
        tn.hours_required, 
        tn.notes as ta_notes, 
        tn.status as need_status,
        tn.need_id,
        COALESCE(tn.qualifications, '') as qualifications
    FROM courses c
    LEFT JOIN ta_needs tn ON c.course_id = tn.course_id
    ORDER BY c.term DESC, c.code
    `;
    const result = await this.db.query<Course>(query);

    return result.rows;
}

    // New method to check if user is instructor of a course
    async isInstructorOfCourse(courseId: number, userId: number): Promise<boolean> {
        const query = `SELECT COUNT(*) as count FROM courses WHERE course_id = $1 AND instructor_id = $2`;
        const result = await this.db.query<{ count: number }>(query, [courseId, userId]);
        return Number(result.rows[0].count) > 0;
    }

    async updateCourse(courseId: number, updates: Partial<Course>): Promise<Course | null> {
    const fields = Object.keys(updates);
    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
    UPDATE courses 
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE course_id = $1
    RETURNING *
    `;
    
    const values = [courseId, ...fields.map(field => (updates as any)[field])];
    const result = await this.db.query<Course>(query, values);

    return result.rows[0] || null;
}

    // Get courses without assigned instructors
    async getCoursesWithoutInstructors(): Promise<Course[]> {
        const query = `SELECT * FROM courses WHERE instructor_id IS NULL ORDER BY term DESC, code`;
        const result = await this.db.query<Course>(query);
        return result.rows;
    }

    // Get courses with their instructor information
    async getCoursesWithInstructors(): Promise<any[]> {
        const query = `
        SELECT 
            c.*,
            u.name as instructor_name,
            u.email as instructor_email
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.user_id
        ORDER BY c.term DESC, c.code
        `;
        const result = await this.db.query<any>(query);
        return result.rows;
    }

    // Delete course
    async deleteCourse(courseId: number): Promise<boolean> {
        try {
            const query = `DELETE FROM courses WHERE course_id = $1`;
            const result = await this.db.query(query, [courseId]);
            return result.rows.length > 0;
        } catch (error) {
            console.error("Error deleting course:", error);
            return false;
        }
    }

    async assignInstructor(courseId: number, instructorId: number) {
        await this.db.query(
            `UPDATE courses SET instructor_id = $1 WHERE course_id = $2`,
            [instructorId, courseId]
        );
    }
}