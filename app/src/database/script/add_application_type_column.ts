// Add application_type column to student_profiles table
import { Database } from '../config.ts';

export async function addApplicationTypeColumn(db: Database): Promise<void> {
  try {
    console.log('🔧 Checking student_profiles table for application_type column...');
    
    // Check if application_type column exists
    const columnsResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'student_profiles' AND column_name = 'application_type'
    `);
    
    const hasApplicationType = columnsResult.rows.length > 0;
    
    if (hasApplicationType) {
      console.log('✅ application_type column already exists in student_profiles table');
      return;
    }
    
    console.log('⚠️ application_type column missing from student_profiles. Adding...');
    
    // Add application_type column with default and constraint
    await db.query(`
      ALTER TABLE student_profiles 
      ADD COLUMN application_type VARCHAR(20) DEFAULT 'Undergraduate' 
      CHECK (application_type IN ('Undergraduate', 'Graduate', 'PhD'))
    `);
    
    console.log('✅ Successfully added application_type column to student_profiles table');
    
  } catch (error) {
    console.error('❌ Error adding application_type column:', error);
    throw error;
  }
}
