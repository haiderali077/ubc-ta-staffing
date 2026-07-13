import { Database } from '../config.ts';

export interface LabSection {
    lab_section_id?: number;
    course_id: number;
    section_name: string;
    lab_days: string;
    lab_start_time: string;
    lab_end_time: string;
    ta_id?: number;
    created_at?: Date;
    updated_at?: Date;
}

export interface LabSectionWithTA extends LabSection {
    ta_name?: string;
    ta_email?: string;
}

export interface LabSectionWithCourse extends LabSection {
    course_code?: string;
    course_title?: string;
    course_term?: string;
}

export class LabSectionModel {
    private db: Database;

    constructor(database: Database) {
        this.db = database;
    }

    async createLabSection(labSection: Omit<LabSection, 'lab_section_id' | 'created_at' | 'updated_at'>): Promise<LabSection> {
        const query = `
        INSERT INTO lab_sections (course_id, section_name, lab_days, lab_start_time, lab_end_time, ta_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `;
        
        const result = await this.db.query<LabSection>(query, [
            labSection.course_id,
            labSection.section_name,
            labSection.lab_days,
            labSection.lab_start_time,
            labSection.lab_end_time,
            labSection.ta_id || null
        ]);
        
        return result.rows[0];
    }

    async getLabSectionsByCourse(courseId: number): Promise<LabSectionWithTA[]> {
        const query = `
        SELECT 
            ls.*,
            u.name as ta_name,
            u.email as ta_email
        FROM lab_sections ls
        LEFT JOIN users u ON ls.ta_id = u.user_id
        WHERE ls.course_id = $1
        ORDER BY ls.section_name
        `;
        const result = await this.db.query<LabSectionWithTA>(query, [courseId]);
        return result.rows;
    }

    async getAllLabSections(): Promise<LabSectionWithTA[]> {
        const query = `
        SELECT 
            ls.*,
            u.name as ta_name,
            u.email as ta_email
        FROM lab_sections ls
        LEFT JOIN users u ON ls.ta_id = u.user_id
        ORDER BY ls.course_id, ls.section_name
        `;
        const result = await this.db.query<LabSectionWithTA>(query);
        return result.rows;
    }

    async getLabSectionById(labSectionId: number): Promise<LabSection | null> {
        const query = `SELECT * FROM lab_sections WHERE lab_section_id = $1`;
        const result = await this.db.query<LabSection>(query, [labSectionId]);
        return result.rows[0] || null;
    }

    async updateLabSection(labSectionId: number, updates: Partial<LabSection>): Promise<LabSection | null> {
        const fields = Object.keys(updates);
        if (fields.length === 0) return null;

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const query = `
        UPDATE lab_sections 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE lab_section_id = $1
        RETURNING *
        `;
        
        const values = [labSectionId, ...fields.map(field => (updates as any)[field])];
        const result = await this.db.query<LabSection>(query, values);

        return result.rows[0] || null;
    }

    async deleteLabSection(labSectionId: number): Promise<boolean> {
        try {
            const query = `DELETE FROM lab_sections WHERE lab_section_id = $1`;
            const result = await this.db.query(query, [labSectionId]);
            return result.rowCount ? result.rowCount > 0 : false;
        } catch (error) {
            console.error("Error deleting lab section:", error);
            return false;
        }
    }

    async deleteLabSectionsByCourse(courseId: number): Promise<boolean> {
        try {
            const query = `DELETE FROM lab_sections WHERE course_id = $1`;
            const result = await this.db.query(query, [courseId]);
            return true;
        } catch (error) {
            console.error("Error deleting lab sections for course:", error);
            return false;
        }
    }

    async assignTAToLabSection(labSectionId: number, taId: number): Promise<LabSection | null> {
        return this.updateLabSection(labSectionId, { ta_id: taId });
    }

    async unassignTAFromLabSection(labSectionId: number): Promise<LabSection | null> {
        return this.updateLabSection(labSectionId, { ta_id: undefined });
    }

    async getLabSectionsWithCourseInfo(): Promise<LabSectionWithCourse[]> {
        const query = `
        SELECT 
            ls.*,
            c.code as course_code,
            c.title as course_title,
            c.term as course_term
        FROM lab_sections ls
        JOIN courses c ON ls.course_id = c.course_id
        ORDER BY c.term DESC, c.code, ls.section_name
        `;
        const result = await this.db.query<LabSectionWithCourse>(query);
        return result.rows;
    }
} 