import { hashPassword } from '../../deps.ts';
import { Database, getDatabaseConfig } from './config.ts';
import { UserModel } from './models/user.ts';
import { SchemaManager } from './schema.ts';

/**
 * Get the current environment
 */
function getEnvironment(): string {
    return Deno.env.get('DENO_ENV') || Deno.env.get('ENVIRONMENT') || 'development';
}

/**
 * Create database connection and initialize schema
 */
export async function initializeDatabase(): Promise<Database> {
    const config = getDatabaseConfig();
    const database = new Database(config);
    
    console.log(`📡 Connecting to database: ${config.hostname}:${config.port}/${config.database}`);
    await database.connect();
    console.log('✅ Database connection established');
    
    // Test database connectivity
    const testResult = await database.query('SELECT NOW() as current_time');
    console.log(`🕒 Database time: ${testResult.rows[0].current_time}`);
    
    return database;
}

/**
 * Create all database tables and schema
 */
async function createSchema(database: Database): Promise<boolean> {
    try {
        console.log('🏗️ Creating database schema...');
        
        const schemaManager = new SchemaManager(database);
        
        // Create all tables
        await schemaManager.createAllTables();
        console.log('✅ All tables created successfully');
        
        // Verify schema creation
        const tableCount = await verifySchemaCreation(database);
        console.log(`📊 Created ${tableCount} tables`);
        
        return tableCount > 0;
        
    } catch (error) {
        console.error('❌ Failed to create schema:', error);
        return false;
    }
}

/**
 * Verify that all expected tables were created
 */
async function verifySchemaCreation(database: Database): Promise<number> {
    try {
        const result = await database.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        const tableNames = result.rows.map(row => row.table_name);
        
        // Expected core tables (minimum required)
        const expectedTables = [
            'departments',
            'users', 
            'terms',
            'courses',
            'ta_applications'
        ];
        
        const missingTables = expectedTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length > 0) {
            console.warn(`⚠️ Some expected tables are missing: ${missingTables.join(', ')}`);
            console.log(`📋 Created tables: ${tableNames.join(', ')}`);
        }
        
        return tableNames.length;
        
    } catch (error) {
        console.error('❌ Failed to verify schema creation:', error);
        return 0;
    }
}

/**
 * Create sample users for development environment (ONLY when explicitly requested)
 */
async function createSampleUsers(database: Database): Promise<void> {
    // Only create sample users if explicitly requested
    const createUsers = Deno.env.get('CREATE_SAMPLE_USERS') === 'true';
    
    if (!createUsers) {
        console.log('ℹ️ Skipping sample user creation (set CREATE_SAMPLE_USERS=true to enable)');
        return;
    }
    
    const userModel = new UserModel(database);
    
    try {
        // Check if admin user already exists
        const existingAdmin = await userModel.getUserByEmail("admin@example.com");
        if (existingAdmin) {
            console.log('ℹ️ Sample users already exist, skipping creation');
            return;
        }
        
        console.log('👤 Creating sample users...');
        
        // Create admin user
        const adminPasswordHash = await hashPassword("admin123");
        const adminUser = await userModel.createUser({
            name: "Admin User",
            email: "admin@example.com",
            password_hash: adminPasswordHash,
            role: "admin",
            major: "Computer Science"
        });
        console.log(`✅ Created admin user: ${adminUser.email} (ID: ${adminUser.user_id})`);
        
        // Create TA coordinator user
        const coordinatorPasswordHash = await hashPassword("tacoord123");
        const coordinatorUser = await userModel.createUser({
            name: "TA Coordinator",
            email: "tacoord@example.com",
            password_hash: coordinatorPasswordHash,
            role: "ta_coordinator",
            major: "Computer Science"
        });
        console.log(`✅ Created TA coordinator: ${coordinatorUser.email} (ID: ${coordinatorUser.user_id})`);
        
        // Create instructor user
        const instructorPasswordHash = await hashPassword("instructor123");
        const instructorUser = await userModel.createUser({
            name: "Dr. Jane Smith",
            email: "instructor@example.com",
            password_hash: instructorPasswordHash,
            role: "instructor",
            major: "Computer Science"
        });
        console.log(`✅ Created instructor: ${instructorUser.email} (ID: ${instructorUser.user_id})`);
        
        // Create student user
        const studentPasswordHash = await hashPassword("student123");
        const studentUser = await userModel.createUser({
            name: "John Doe",
            email: "student@example.com",
            password_hash: studentPasswordHash,
            role: "student",
            student_number: "12345678",
            major: "Computer Science"
        });
        console.log(`✅ Created student: ${studentUser.email} (ID: ${studentUser.user_id})`);
        
        console.log('🎉 Sample users created successfully!');
        console.log('📝 Login credentials:');
        console.log("   Admin: admin@example.com / admin123");
        console.log("   Instructor: instructor@example.com / instructor123");
        console.log("   Student: student@example.com / student123");
        console.log("   TA Coordinator: tacoord@example.com / tacoord123");
        
    } catch (error) {
        console.error('❌ Failed to create sample users:', error);
        throw error;
    }
}

/**
 * Main initialization function
 */
async function main(): Promise<void> {
    let db: Database | null = null;
    
    try {
        console.log('🚀 Starting database initialization...');
        console.log('=====================================\n');
        
        const environment = getEnvironment();
        console.log(`🌍 Environment: ${environment}`);
        
        // Initialize database connection
        db = await initializeDatabase();
        
        // Create schema
        const schemaCreated = await createSchema(db);
        if (!schemaCreated) {
            throw new Error('Failed to create database schema');
        }
        
        // Create sample users only if requested
        await createSampleUsers(db);
        
        console.log('\n🎉 Database initialization completed successfully!');
        
        if (environment === 'development') {
            console.log('\n💡 Next steps for development:');
            console.log('   1. Run `make load-dummy-data` to load test data');
            console.log('   2. Or run `make start-w-dummy-data` to start with test data');
            console.log('   3. Access the application at http://localhost:8000');
        }
        
    } catch (error) {
        console.error('\n❌ Database initialization failed:');
        console.error(error);
        
        if (error instanceof Error) {
            console.error(`Error message: ${error.message}`);
            if (error.stack) {
                console.error(`Stack trace: ${error.stack}`);
            }
        }
        
        Deno.exit(1);
        
    } finally {
        // Clean up database connection
        if (db) {
            try {
                await db.disconnect();
                console.log('\n📡 Database connection closed');
            } catch (closeError) {
                console.warn('⚠️ Warning: Could not close database connection:', closeError);
            }
        }
    }
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
    const signals: Deno.Signal[] = ['SIGINT', 'SIGTERM'];
    
    signals.forEach((signal) => {
        Deno.addSignalListener(signal, () => {
            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
            Deno.exit(0);
        });
    });
}

// Only run if this script is executed directly
if (import.meta.main) {
    setupGracefulShutdown();
    
    console.log('AllocAid Database Initialization');
    console.log('================================');
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
    
    await main();
}