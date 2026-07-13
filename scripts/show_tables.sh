#!/bin/bash

# Script to display all tables and their columns in the database

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-allocaid_db}"
DB_USER="${DB_USER:-allocaid_user}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AllocAid Database Schema Viewer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get password
if [ -z "$DB_PASSWORD" ]; then
    echo -n "Enter database password for user '$DB_USER': "
    read -s DB_PASSWORD
    echo ""
fi

# Create SQL script to show all tables and columns
cat > /tmp/show_tables.sql << 'EOF'
-- Script to display all tables and their columns

\echo ''
\echo '================================================'
\echo 'DATABASE TABLES AND COLUMNS'
\echo '================================================'
\echo ''

-- First, show a summary of all tables
\echo 'TABLE SUMMARY:'
\echo '--------------'
SELECT 
    schemaname AS schema,
    tablename AS table_name,
    COALESCE(obj_description(c.oid), '') AS description
FROM 
    pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename;

\echo ''
\echo '================================================'
\echo 'DETAILED TABLE STRUCTURES:'
\echo '================================================'

-- Create a function to display table details
DO $$
DECLARE
    tbl RECORD;
    col RECORD;
    constraint_text TEXT;
BEGIN
    -- Loop through all tables
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE '----------------------------------------';
        RAISE NOTICE 'TABLE: %', UPPER(tbl.tablename);
        RAISE NOTICE '----------------------------------------';
        
        -- Show columns for this table
        RAISE NOTICE 'COLUMNS:';
        FOR col IN 
            SELECT 
                ordinal_position AS pos,
                column_name,
                data_type,
                character_maximum_length,
                column_default,
                is_nullable,
                CASE 
                    WHEN data_type = 'character varying' THEN 
                        data_type || '(' || character_maximum_length || ')'
                    WHEN data_type = 'numeric' THEN 
                        data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
                    ELSE data_type
                END AS full_type
            FROM 
                information_schema.columns 
            WHERE 
                table_name = tbl.tablename 
                AND table_schema = 'public'
            ORDER BY 
                ordinal_position
        LOOP
            RAISE NOTICE '  % | % | % | % | %', 
                LPAD(col.pos::TEXT, 2), 
                RPAD(col.column_name, 30), 
                RPAD(col.full_type, 25),
                CASE WHEN col.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END,
                COALESCE(col.column_default, '');
        END LOOP;
        
        -- Show primary key
        SELECT string_agg(a.attname, ', ' ORDER BY array_position(i.indkey, a.attnum))
        INTO constraint_text
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = tbl.tablename::regclass AND i.indisprimary;
        
        IF constraint_text IS NOT NULL THEN
            RAISE NOTICE '';
            RAISE NOTICE 'PRIMARY KEY: %', constraint_text;
        END IF;
        
        -- Show foreign keys
        RAISE NOTICE '';
        RAISE NOTICE 'FOREIGN KEYS:';
        FOR col IN 
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = tbl.tablename
            ORDER BY kcu.column_name
        LOOP
            RAISE NOTICE '  % -> %.%', 
                col.column_name, 
                col.foreign_table, 
                col.foreign_column;
        END LOOP;
        
        -- Show unique constraints
        RAISE NOTICE '';
        RAISE NOTICE 'UNIQUE CONSTRAINTS:';
        FOR col IN 
            SELECT 
                tc.constraint_name,
                string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
            FROM 
                information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
            WHERE 
                tc.constraint_type = 'UNIQUE'
                AND tc.table_name = tbl.tablename
            GROUP BY tc.constraint_name
        LOOP
            RAISE NOTICE '  %: %', col.constraint_name, col.columns;
        END LOOP;
        
        -- Show check constraints
        RAISE NOTICE '';
        RAISE NOTICE 'CHECK CONSTRAINTS:';
        FOR col IN 
            SELECT 
                con.conname AS constraint_name,
                pg_get_constraintdef(con.oid) AS definition
            FROM 
                pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE 
                rel.relname = tbl.tablename
                AND con.contype = 'c'
        LOOP
            RAISE NOTICE '  %: %', col.constraint_name, col.definition;
        END LOOP;
        
    END LOOP;
END $$;

-- Show table count summary
\echo ''
\echo '================================================'
\echo 'SUMMARY STATISTICS:'
\echo '================================================'

SELECT 
    'Total Tables' AS metric,
    COUNT(*)::TEXT AS value
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Total Columns' AS metric,
    COUNT(*)::TEXT AS value
FROM information_schema.columns 
WHERE table_schema = 'public'

UNION ALL

SELECT 
    'Tables with Foreign Keys' AS metric,
    COUNT(DISTINCT tc.table_name)::TEXT AS value
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'

UNION ALL

SELECT 
    'Total Foreign Key Relationships' AS metric,
    COUNT(*)::TEXT AS value
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public';

-- Show which tables reference which
\echo ''
\echo 'TABLE RELATIONSHIPS:'
\echo '-------------------'
SELECT 
    tc.table_name AS "Table",
    string_agg(DISTINCT ccu.table_name, ', ' ORDER BY ccu.table_name) AS "References Tables"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
GROUP BY tc.table_name
ORDER BY tc.table_name;

-- Show which tables are referenced by others
\echo ''
\echo 'TABLES REFERENCED BY OTHERS:'
\echo '----------------------------'
SELECT 
    ccu.table_name AS "Table",
    string_agg(DISTINCT tc.table_name, ', ' ORDER BY tc.table_name) AS "Referenced By"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
GROUP BY ccu.table_name
ORDER BY ccu.table_name;

EOF

# Run the script
echo -e "${YELLOW}Analyzing database schema...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/show_tables.sql

# Optionally output to a file
echo ""
echo -e "${YELLOW}Do you want to save this output to a file? [y/N]${NC}"
read -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_FILE="allocaid_schema_${TIMESTAMP}.txt"
    
    echo -e "${YELLOW}Saving schema to ${OUTPUT_FILE}...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/show_tables.sql > "$OUTPUT_FILE" 2>&1
    echo -e "${GREEN}Schema saved to ${OUTPUT_FILE}${NC}"
fi

# Cleanup
rm -f /tmp/show_tables.sql

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Schema analysis complete!${NC}"
echo -e "${BLUE}========================================${NC}"