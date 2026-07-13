import { Database } from '../config.ts';

export async function debugDatabaseTables(db: Database): Promise<void> {
    console.log("🔍 Starting Database Debug Analysis...\n");
    
    try {
        // 1. Check what tables currently exist
        console.log("📋 CURRENT TABLES IN DATABASE:");
        console.log("=" + "=".repeat(50));
        
        const existingTablesResult = await db.query(`
            SELECT 
                schemaname,
                tablename,
                tableowner
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);
        
        const existingTables: string[] = existingTablesResult.rows.map((row) => (row as { tablename: string }).tablename);
        console.log(`Found ${existingTables.length} tables:`);
        existingTables.forEach((table, index) => {
            console.log(`  ${index + 1}. ${table}`);
        });
        
        // 2. Check what tables SHOULD exist based on schema.ts
        console.log("\n📋 EXPECTED TABLES (from schema.ts):");
        console.log("=" + "=".repeat(50));
        
        const expectedTables = [
            'departments',
            'terms', 
            'users',
            'user_profiles',
            'course_templates',
            'courses',
            'lab_sections',
            'ta_applications',
            'application_rankings',
            'ta_needs',
            'ta_allocations',
            'student_profiles',
            'professor_references',
            'refresh_tokens',
            'password_reset_tokens',
            'domain_areas',
            'audit_logs',
            'system_usage_metrics',
            'system_settings',
            'notifications',
            'user_notification_preferences',
            'gta_exam_availability',
            'availability_conflicts_view'
        ];
        
        console.log(`Expected ${expectedTables.length} tables:`);
        expectedTables.forEach((table, index) => {
            const exists = existingTables.includes(table);
            const status = exists ? "✅" : "❌";
            console.log(`  ${index + 1}. ${table} ${status}`);
        });
        
        // 3. Find missing tables
        console.log("\n🚨 MISSING TABLES:");
        console.log("=" + "=".repeat(50));
        
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        if (missingTables.length === 0) {
            console.log("✅ All expected tables exist!");
        } else {
            console.log(`Found ${missingTables.length} missing tables:`);
            missingTables.forEach((table, index) => {
                console.log(`  ${index + 1}. ${table} ❌`);
            });
        }
        
        // 4. Find unexpected tables
        console.log("\n❓ UNEXPECTED TABLES:");
        console.log("=" + "=".repeat(50));

        const unexpectedTables = existingTables.filter(table => !expectedTables.includes(table));
        if (unexpectedTables.length === 0) {
            console.log("✅ No unexpected tables found!");
        } else {
            console.log(`Found ${unexpectedTables.length} unexpected tables:`);
            unexpectedTables.forEach((table, index) => {
                console.log(`  ${index + 1}. ${table} ⚠️`);
            });
        }
        
        // 5. Check for dependency issues
        console.log("\n🔗 CHECKING FOREIGN KEY DEPENDENCIES:");
        console.log("=" + "=".repeat(50));
        
        const dependenciesResult = await db.query(`
            SELECT 
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name, kcu.column_name;
        `);
        
        if (dependenciesResult.rows.length === 0) {
            console.log("⚠️ No foreign key constraints found!");
        } else {
            console.log("Foreign key relationships:");
            dependenciesResult.rows.forEach(row => {
                console.log(`  ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
            });
        }
        
        // 6. Check for specific dependency problems
        console.log("\n🔍 DEPENDENCY ANALYSIS:");
        console.log("=" + "=".repeat(50));
        
        const dependencyProblems = [];
        
        // Check if lab_sections exists before ta_allocations
        if (existingTables.includes('ta_allocations') && !existingTables.includes('lab_sections')) {
            dependencyProblems.push("ta_allocations exists but lab_sections is missing");
        }
        
        // Check if users exists before dependent tables
        if (!existingTables.includes('users')) {
            dependencyProblems.push("users table is missing - many tables depend on this");
        }
        
        // Check if departments exists before courses
        if (existingTables.includes('courses') && !existingTables.includes('departments')) {
            dependencyProblems.push("courses exists but departments is missing");
        }
        
        if (dependencyProblems.length === 0) {
            console.log("✅ No obvious dependency problems found!");
        } else {
            console.log("❌ Dependency problems found:");
            dependencyProblems.forEach((problem, index) => {
                console.log(`  ${index + 1}. ${problem}`);
            });
        }
        
        // 7. Show detailed column information for existing tables
        console.log("\n📊 TABLE COLUMN DETAILS:");
        console.log("=" + "=".repeat(50));
        
        for (const tableName of existingTables.slice(0, 5) as string[]) { // Show first 5 tables only
            console.log(`\n📋 Table: ${tableName.toUpperCase()}`);
            console.log("-".repeat(30));
            
            const columnsResult = await db.query(`
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position;
            `, [tableName]);
            
            columnsResult.rows.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default || '';
                console.log(`  ${col.column_name}: ${col.data_type} ${nullable} ${defaultVal}`);
            });
        }
        
        console.log("\n✅ Database debug analysis complete!");
        
    } catch (error) {
        console.error("❌ Error during database debug analysis:", error);
        throw error;
    }
}

// Main function to run the debug script
async function main() {
    const config = {
        hostname: Deno.env.get("DB_HOST") || "localhost",
        port: parseInt(Deno.env.get("DB_PORT") || "5432"),
        user: Deno.env.get("DB_USER") || "allocaid_user",
        password: Deno.env.get("DB_PASSWORD") || "allocaid_pass",
        database: Deno.env.get("DB_NAME") || "allocaid_db"
    };

    console.log(`Connecting to database: ${config.hostname}:${config.port}/${config.database}`);
    
    const db = new Database(config);
    
    try {
        await db.connect();
        console.log("✅ Connected to database\n");
        
        await debugDatabaseTables(db);
        
    } catch (error) {
        console.error("❌ Error:", error);
        Deno.exit(1);
    } finally {
        await db.disconnect();
        console.log("\n✅ Database connection closed");
    }
}

if (import.meta.main) {
    main();
}