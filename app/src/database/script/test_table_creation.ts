import { Database } from '../config.ts';

// Import all table creation functions
import { createApplicationRankingsTable, createDomainAreasTable, createTAAllocationsTable, createTAApplicationsTable, createTANeedsTable } from '../create_tables/applicationSchema.ts';
import { createAuditLogsTable, createSystemUsageMetricsTable } from '../create_tables/auditLogSchema.ts';
import { createPasswordResetTokensTable, createRefreshTokensTable } from '../create_tables/authSchema.ts';
import { createCourseTemplatesTable, createCoursesTable } from '../create_tables/courseSchema.ts';
import { createDepartmentsTable } from '../create_tables/departmentSchema.ts';
import { createLabSectionsTable } from '../create_tables/labSectionSchema.ts';
import { createNotificationsTable, createUserNotificationPreferencesTable, migrateNotificationSchema } from '../create_tables/notificationSchema.ts';
import { createReferencesTable, createStudentProfilesTable } from '../create_tables/profileSchema.ts';
import { createSystemSettingsTable } from '../create_tables/systemSettingsSchema.ts';
import { createTermsTable } from '../create_tables/termSchema.ts';
import { createUserProfilesTable, createUsersTable, migrateUsersTable } from '../create_tables/userSchema.ts';

// Interface for table creation test results
interface TableCreationTest {
    tableName: string;
    functionName: string;
    order: number;
    success: boolean;
    error?: string;
    duration?: number;
}

export async function testTableCreationIndividually(db: Database): Promise<TableCreationTest[]> {
    console.log("🧪 Testing Table Creation Functions Individually...\n");
    
    const tests: TableCreationTest[] = [];
    
    // Define all table creation functions in dependency order
    const tableCreationFunctions = [
        { name: 'departments', func: () => createDepartmentsTable(db), order: 1 },
        { name: 'terms', func: () => createTermsTable(db), order: 2 },
        { name: 'users', func: () => createUsersTable(db), order: 3 },
        { name: 'users_migration', func: () => migrateUsersTable(db), order: 4 },
        { name: 'user_profiles', func: () => createUserProfilesTable(db), order: 5 },
        { name: 'course_templates', func: () => createCourseTemplatesTable(db), order: 6 },
        { name: 'courses', func: () => createCoursesTable(db), order: 7 },
        { name: 'lab_sections', func: () => createLabSectionsTable(db), order: 8 },
        { name: 'ta_applications', func: () => createTAApplicationsTable(db), order: 9 },
        { name: 'application_rankings', func: () => createApplicationRankingsTable(db), order: 10 },
        { name: 'ta_needs', func: () => createTANeedsTable(db), order: 11 },
        { name: 'ta_allocations', func: () => createTAAllocationsTable(db), order: 12 },
        { name: 'student_profiles', func: () => createStudentProfilesTable(db), order: 13 },
        { name: 'professor_references', func: () => createReferencesTable(db), order: 14 },
        { name: 'refresh_tokens', func: () => createRefreshTokensTable(db), order: 15 },
        { name: 'password_reset_tokens', func: () => createPasswordResetTokensTable(db), order: 16 },
        { name: 'domain_areas', func: () => createDomainAreasTable(db), order: 17 },
        { name: 'audit_logs', func: () => createAuditLogsTable(db), order: 18 },
        { name: 'system_usage_metrics', func: () => createSystemUsageMetricsTable(db), order: 19 },
        { name: 'system_settings', func: () => createSystemSettingsTable(db), order: 20 },
        { name: 'notifications', func: () => createNotificationsTable(db), order: 21 },
        { name: 'user_notification_preferences', func: () => createUserNotificationPreferencesTable(db), order: 22 },
        { name: 'notification_migration', func: () => migrateNotificationSchema(db), order: 23 }
    ];
    
    // Test each function individually
    for (const tableFunc of tableCreationFunctions) {
        const startTime = Date.now();
        
        console.log(`Testing ${tableFunc.order}. ${tableFunc.name}...`);
        
        try {
            await tableFunc.func();
            const duration = Date.now() - startTime;
            
            tests.push({
                tableName: tableFunc.name,
                functionName: tableFunc.func.name,
                order: tableFunc.order,
                success: true,
                duration
            });
            
            console.log(`  ✅ ${tableFunc.name} - SUCCESS (${duration}ms)`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            tests.push({
                tableName: tableFunc.name,
                functionName: tableFunc.func.name,
                order: tableFunc.order,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration
            });
            
            console.log(`  ❌ ${tableFunc.name} - FAILED (${duration}ms)`);
            console.log(`     Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    return tests;
}

export async function generateTableCreationReport(tests: TableCreationTest[]): Promise<void> {
    console.log("\n📊 TABLE CREATION REPORT:");
    console.log("=" + "=".repeat(60));
    
    const successful = tests.filter(t => t.success);
    const failed = tests.filter(t => !t.success);
    
    console.log(`\n✅ SUCCESSFUL: ${successful.length} tables`);
    console.log(`❌ FAILED: ${failed.length} tables`);
    console.log(`📊 TOTAL: ${tests.length} functions tested`);
    
    if (failed.length > 0) {
        console.log("\n🚨 FAILED TABLE CREATIONS:");
        console.log("-".repeat(40));
        
        failed.forEach(test => {
            console.log(`\n❌ ${test.tableName} (order ${test.order})`);
            console.log(`   Function: ${test.functionName}`);
            console.log(`   Error: ${test.error}`);
            console.log(`   Duration: ${test.duration}ms`);
        });
        
        console.log("\n🔧 SUGGESTED FIXES:");
        console.log("-".repeat(40));
        
        failed.forEach(test => {
            if (test.error?.includes('does not exist')) {
                console.log(`\n🔗 ${test.tableName}:`);
                console.log(`   - Check if dependent tables exist first`);
                console.log(`   - Review foreign key references`);
                console.log(`   - Consider table creation order`);
            } else if (test.error?.includes('already exists')) {
                console.log(`\n📋 ${test.tableName}:`);
                console.log(`   - Table already exists, this might be expected`);
                console.log(`   - Check if this is a migration function`);
            } else if (test.error?.includes('permission')) {
                console.log(`\n🔐 ${test.tableName}:`);
                console.log(`   - Check database user permissions`);
                console.log(`   - Verify user has CREATE TABLE privileges`);
            } else {
                console.log(`\n⚠️ ${test.tableName}:`);
                console.log(`   - Check function implementation`);
                console.log(`   - Review SQL syntax`);
                console.log(`   - Verify imports are correct`);
            }
        });
    }
    
    if (successful.length > 0) {
        console.log("\n✅ SUCCESSFUL TABLE CREATIONS:");
        console.log("-".repeat(40));
        
        successful.forEach(test => {
            console.log(`✅ ${test.tableName} (${test.duration}ms)`);
        });
    }
}

export async function checkTableExistsAfterCreation(db: Database, tests: TableCreationTest[]): Promise<void> {
    console.log("\n🔍 VERIFYING TABLES EXIST IN DATABASE:");
    console.log("=" + "=".repeat(50));
    
    // Get current tables from database
    const tablesResult = await db.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
    `);
    
    const existingTables = tablesResult.rows.map(row => row.tablename);
    
    // Check each test
    for (const test of tests) {
        if (test.success) {
            // For migration functions, skip table existence check
            if (test.tableName.includes('_migration')) {
                console.log(`⏭️ ${test.tableName} - Migration function (skipping table check)`);
                continue;
            }
            
            // Map function names to actual table names
            let expectedTableName = test.tableName;
            if (test.tableName === 'professor_references') expectedTableName = 'references';
            
            const tableExists = existingTables.includes(expectedTableName);
            
            if (tableExists) {
                console.log(`✅ ${test.tableName} → ${expectedTableName} exists`);
            } else {
                console.log(`⚠️ ${test.tableName} → ${expectedTableName} NOT FOUND in database`);
                console.log(`   Function succeeded but table missing - possible naming mismatch`);
            }
        }
    }
}

// Main function to run all tests
async function main() {
    const config = {
        hostname: Deno.env.get("DB_HOST") || "localhost",
        port: parseInt(Deno.env.get("DB_PORT") || "5432"),
        user: Deno.env.get("DB_USER") || "allocaid_user",
        password: Deno.env.get("DB_PASSWORD") || "allocaid_pass",
        database: Deno.env.get("DB_NAME") || "allocaid_db"
    };

    console.log(`Testing table creation functions...`);
    console.log(`Database: ${config.hostname}:${config.port}/${config.database}`);
    
    const db = new Database(config);
    
    try {
        await db.connect();
        console.log("✅ Connected to database\n");
        
        // Run individual table creation tests
        const tests = await testTableCreationIndividually(db);
        
        // Generate report
        await generateTableCreationReport(tests);
        
        // Verify tables exist
        await checkTableExistsAfterCreation(db, tests);
        
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