// Quick fix for ta_allocations schema mismatch
import { Database } from '../config.ts';

export async function fixAllocationSchema(db: Database): Promise<void> {
  try {
    console.log('🔧 Checking ta_allocations table schema...');
    
    // Check current columns
    const columnsResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ta_allocations'
    `);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    console.log('Current columns:', columns);
    
    const hasLabSectionId = columns.includes('lab_section_id');
    const hasCourseId = columns.includes('course_id');
    
    if (!hasLabSectionId && hasCourseId) {
      console.log('⚠️ Found course_id instead of lab_section_id. Migrating...');
      
      // Add lab_section_id column
      await db.query('ALTER TABLE ta_allocations ADD COLUMN lab_section_id INTEGER');
      
      // Update existing records (map course_id to first lab_section for that course)
      await db.query(`
        UPDATE ta_allocations 
        SET lab_section_id = (
          SELECT lab_section_id 
          FROM lab_sections 
          WHERE lab_sections.course_id = ta_allocations.course_id 
          LIMIT 1
        )
      `);
      
      // Add foreign key constraint
      await db.query(`
        ALTER TABLE ta_allocations 
        ADD CONSTRAINT fk_ta_allocations_lab_section 
        FOREIGN KEY (lab_section_id) REFERENCES lab_sections(lab_section_id) ON DELETE CASCADE
      `);
      
      // Make lab_section_id NOT NULL
      await db.query('ALTER TABLE ta_allocations ALTER COLUMN lab_section_id SET NOT NULL');
      
      // Drop old course_id column
      await db.query('ALTER TABLE ta_allocations DROP CONSTRAINT IF EXISTS ta_allocations_course_id_fkey');
      await db.query('ALTER TABLE ta_allocations DROP COLUMN course_id');
      
      // Add unique constraint
      await db.query(`
        ALTER TABLE ta_allocations 
        ADD CONSTRAINT ta_allocations_lab_section_user_unique 
        UNIQUE(lab_section_id, user_id)
      `);
      
      console.log('✅ Migration completed successfully!');
    } else if (hasLabSectionId) {
      console.log('✅ Schema is already correct!');
    } else {
      console.log('⚠️ Unexpected schema state. Manual review needed.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Temporary workaround: Create a modified allocation model that handles both schemas
export class CompatibleAllocationModel {
  private db: Database;
  private hasLabSectionId: boolean = true;
  
  constructor(database: Database) {
    this.db = database;
  }
  
  async init(): Promise<void> {
    // Check which schema we're using
    const columnsResult = await this.db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ta_allocations'
    `);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    this.hasLabSectionId = columns.includes('lab_section_id');
    
    if (!this.hasLabSectionId) {
      console.log('⚠️ Using legacy course_id schema for ta_allocations');
    }
  }
  
  async getAllocationsByLabSection(labSectionId: number): Promise<any[]> {
    if (this.hasLabSectionId) {
      // Use correct schema
      const query = `
        SELECT 
          alloc.*,
          u.name as student_name,
          u.email as student_email
        FROM ta_allocations alloc
        JOIN users u ON alloc.user_id = u.user_id
        WHERE alloc.lab_section_id = $1
        ORDER BY alloc.allocated_at DESC
      `;
      const result = await this.db.query(query, [labSectionId]);
      return result.rows;
    } else {
      // Use legacy schema - find course_id from lab_section_id
      const courseQuery = `SELECT course_id FROM lab_sections WHERE lab_section_id = $1`;
      const courseResult = await this.db.query(courseQuery, [labSectionId]);
      
      if (courseResult.rows.length === 0) {
        return [];
      }
      
      const courseId = courseResult.rows[0].course_id;
      
      const query = `
        SELECT 
          alloc.*,
          u.name as student_name,
          u.email as student_email
        FROM ta_allocations alloc
        JOIN users u ON alloc.user_id = u.user_id
        WHERE alloc.course_id = $1
        ORDER BY alloc.allocated_at DESC
      `;
      const result = await this.db.query(query, [courseId]);
      return result.rows;
    }
  }
} 