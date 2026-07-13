import { Database } from '../config.ts';

export interface Term {
    term_id?: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'upcoming';
    created_at?: Date;
    updated_at?: Date;
}

export class TermModel {
    private db: Database;

    constructor(database: Database) {
        this.db = database;
    }

    async createTerm(term: Omit<Term, 'term_id' | 'created_at' | 'updated_at' | 'status'>): Promise<Term> {
        const query = `
            INSERT INTO terms (name, start_date, end_date, status)
            VALUES ($1, $2, $3, 'upcoming')
            RETURNING *
        `;
        
        const result = await this.db.query<Term>(query, [
            term.name,
            term.start_date,
            term.end_date
        ]);
        
        return result.rows[0];
    }

    async getAllTerms(): Promise<Term[]> {
        const query = `SELECT * FROM terms ORDER BY start_date DESC`;
        const result = await this.db.query<Term>(query);
        
        return result.rows;
    }

    async getTermById(termId: number): Promise<Term | null> {
        const query = `SELECT * FROM terms WHERE term_id = $1`;
        const result = await this.db.query<Term>(query, [termId]);
        
        return result.rows[0] || null;
    }

    async updateTerm(termId: number, updates: Partial<Term>): Promise<Term | null> {
        const fields = Object.keys(updates).filter(key => key !== 'term_id' && key !== 'status');
        if (fields.length === 0) return null;

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const query = `
            UPDATE terms 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP
            WHERE term_id = $1
            RETURNING *
        `;
        
        const values = [termId, ...fields.map(field => updates[field as keyof Term])];
        const result = await this.db.query<Term>(query, values);

        return result.rows[0] || null;
    }

    async deleteTerm(termId: number): Promise<boolean> {
        try {
            // First, get the term name to find related courses
            const termQuery = `SELECT name FROM terms WHERE term_id = $1`;
            const termResult = await this.db.query<{ name: string }>(termQuery, [termId]);
            
            if (termResult.rows.length === 0) {
                return false; // Term doesn't exist
            }
            
            const termName = termResult.rows[0].name;
            
            // Get all courses associated with this term
            const coursesQuery = `SELECT course_id FROM courses WHERE term = $1`;
            const coursesResult = await this.db.query<{ course_id: number }>(coursesQuery, [termName]);
            const courseIds = coursesResult.rows.map(row => row.course_id);
            
            if (courseIds.length > 0) {
                // Delete TA allocations for lab sections of these courses
                const deleteAllocationsQuery = `
                    DELETE FROM ta_allocations 
                    WHERE lab_section_id IN (
                        SELECT lab_section_id FROM lab_sections WHERE course_id = ANY($1)
                    )
                `;
                await this.db.query(deleteAllocationsQuery, [courseIds]);
                console.log(`Deleted TA allocations for courses in term: ${termName}`);
                
                // Delete lab sections for these courses
                const deleteLabSectionsQuery = `DELETE FROM lab_sections WHERE course_id = ANY($1)`;
                await this.db.query(deleteLabSectionsQuery, [courseIds]);
                console.log(`Deleted lab sections for courses in term: ${termName}`);
                
                // Delete TA needs for these courses
                const deleteTANeedsQuery = `DELETE FROM ta_needs WHERE course_id = ANY($1)`;
                await this.db.query(deleteTANeedsQuery, [courseIds]);
                console.log(`Deleted TA needs for courses in term: ${termName}`);
                
                // Delete application rankings for these courses
                const deleteRankingsQuery = `DELETE FROM applicationrankings WHERE course_id = ANY($1)`;
                await this.db.query(deleteRankingsQuery, [courseIds]);
                console.log(`Deleted application rankings for courses in term: ${termName}`);
                
                // Delete the courses themselves
                const deleteCoursesQuery = `DELETE FROM courses WHERE term = $1`;
                await this.db.query(deleteCoursesQuery, [termName]);
                console.log(`Deleted courses for term: ${termName}`);
            }
            
            // Finally, delete the term itself
            const deleteTermQuery = `DELETE FROM terms WHERE term_id = $1`;
            const result = await this.db.query(deleteTermQuery, [termId]) as { rowCount: number };
            
            console.log(`Successfully deleted term: ${termName} and all related data`);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Error deleting term and related data:", error);
            return false;
        }
    }
} 