-- Migration script to fix ta_allocations table schema
-- This fixes the mismatch between course_id and lab_section_id

DO $$
BEGIN
    -- Check if ta_allocations table has course_id instead of lab_section_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ta_allocations' 
        AND column_name = 'course_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ta_allocations' 
        AND column_name = 'lab_section_id'
    ) THEN
        RAISE NOTICE 'Migrating ta_allocations table schema...';
        
        -- Step 1: Add the new lab_section_id column
        ALTER TABLE ta_allocations ADD COLUMN lab_section_id INTEGER;
        
        -- Step 2: For existing records, we need to map course_id to lab_section_id
        -- This assumes each course has at least one lab section
        -- We'll use the first lab section for each course
        UPDATE ta_allocations 
        SET lab_section_id = (
            SELECT lab_section_id 
            FROM lab_sections 
            WHERE lab_sections.course_id = ta_allocations.course_id 
            LIMIT 1
        );
        
        -- Step 3: Add the foreign key constraint
        ALTER TABLE ta_allocations 
        ADD CONSTRAINT fk_ta_allocations_lab_section 
        FOREIGN KEY (lab_section_id) REFERENCES lab_sections(lab_section_id) ON DELETE CASCADE;
        
        -- Step 4: Make lab_section_id NOT NULL
        ALTER TABLE ta_allocations ALTER COLUMN lab_section_id SET NOT NULL;
        
        -- Step 5: Drop the old course_id column and its constraint
        ALTER TABLE ta_allocations DROP CONSTRAINT IF EXISTS ta_allocations_course_id_fkey;
        ALTER TABLE ta_allocations DROP COLUMN course_id;
        
        -- Step 6: Add unique constraint
        ALTER TABLE ta_allocations 
        ADD CONSTRAINT ta_allocations_lab_section_user_unique 
        UNIQUE(lab_section_id, user_id);
        
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE NOTICE 'Table already has correct schema or needs manual review.';
    END IF;
END $$; 