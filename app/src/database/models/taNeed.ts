import { Database } from '../config.ts';

export interface TANeed {
    need_id?: number;
    course_id: number;
    hours_required: number;
    notes?: string;
    status: 'open' | 'filled' | 'cancelled';
    qualifications?: string;
    lab_tutorial_skills?: string;
    created_at?: Date;
    updated_at?: Date;
}

export class TANeedModel {
    private db: Database;

    constructor(database: Database) {
        this.db = database;
    }

    async createNeed(need: Omit<TANeed, 'need_id' | 'created_at' | 'updated_at'>): Promise<TANeed> {
        const query = `
        INSERT INTO ta_needs (course_id, hours_required, notes, status, qualifications, lab_tutorial_skills)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `;
        
        const result = await this.db.query<TANeed>(query, [
            need.course_id,
            need.hours_required,
            need.notes,
            need.status || 'open',
            need.qualifications,
            need.lab_tutorial_skills
        ]);
        
        return result.rows[0];
    }

    async getNeedById(needId: number): Promise<TANeed | null> {
        const query = `SELECT * FROM ta_needs WHERE need_id = $1`;
        const result = await this.db.query<TANeed>(query, [needId]);
        return result.rows[0] || null;
    }

    async getNeedsByCourse(courseId: number): Promise<TANeed[]> {
        const query = `SELECT * FROM ta_needs WHERE course_id = $1 ORDER BY created_at DESC`;
        const result = await this.db.query<TANeed>(query, [courseId]);
        return result.rows;
    }

    // New method for TA coordinators to get all TA needs with course info
    async getAllNeedsWithCourseInfo(): Promise<any[]> {
        const query = `
        SELECT 
            tn.*,
            c.code as course_code,
            c.title as course_title,
            c.term as course_term,
            u.name as instructor_name,
            u.email as instructor_email
        FROM ta_needs tn
        JOIN courses c ON tn.course_id = c.course_id
        LEFT JOIN users u ON c.instructor_id = u.user_id
        ORDER BY tn.created_at DESC
        `;
        const result = await this.db.query<any>(query);
        return result.rows;
    }

    async updateNeed(needId: number, updates: Partial<TANeed>): Promise<TANeed | null> {
        const fields = Object.keys(updates);
        if (fields.length === 0) return null;

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const query = `
        UPDATE ta_needs 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE need_id = $1
        RETURNING *
        `;
        
        const values = [needId, ...fields.map(field => (updates as any)[field])];
        const result = await this.db.query<TANeed>(query, values);

        return result.rows[0] || null;
    }

    async deleteNeed(needId: number): Promise<boolean> {
        const query = `DELETE FROM ta_needs WHERE need_id = $1`;
        const result = await this.db.query(query, [needId]) as { rowCount: number };
        return result.rowCount > 0;
    }
}