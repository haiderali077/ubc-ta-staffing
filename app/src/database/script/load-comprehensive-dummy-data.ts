#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

// app/src/database/script/load-comprehensive-dummy-data.ts
/**
 * Comprehensive Dummy Data Loading Script
 * 
 * This script loads realistic dummy data for development and testing.
 * It can be run standalone or integrated with Docker/Makefile workflows.
 * 
 * Usage:
 *   deno run --allow-net --allow-env --allow-read src/database/script/load-comprehensive-dummy-data.ts
 */

import { Database, getDatabaseConfig } from '../config.ts';
import { ComprehensiveDummyDataLoader } from '../seeders/comprehensive-dummy-data.ts';

/**
 * Check if default test users already exist
 */
async function checkExistingUsers(database: Database): Promise<boolean> {
  try {
    const result = await database.query(
      `SELECT COUNT(*) as count FROM users WHERE email IN ($1, $2, $3, $4)`,
      ['admin@example.com', 'instructor@example.com', 'student@example.com', 'tacoord@example.com']
    );
    
    const count = parseInt(result.rows[0].count as string);
    return count > 0;
  } catch (error) {
    console.warn('Could not check for existing users:', error);
    return false;
  }
}

/**
 * Create sample users matching the required credentials
 */
async function createSampleUsers(database: Database): Promise<void> {
  // Import here to avoid circular dependencies during initialization
  const { UserModel } = await import('../models/user.ts');
  const { hashPassword } = await import('../../../deps.ts');
  
  const userModel = new UserModel(database);
  
  // Check if users already exist
  const existingAdmin = await userModel.getUserByEmail("admin@example.com");
  if (existingAdmin) {
    console.log("Sample users already exist, skipping creation");
    return;
  }
  
  console.log("Creating sample users for development...");
  
  try {
    // Create admin user
    const adminPasswordHash = await hashPassword("admin123");
    await userModel.createUser({
      name: "Admin User",
      email: "admin@example.com",
      password_hash: adminPasswordHash,
      role: "admin",
      major: "Computer Science"
    });
    
    // Create instructor user
    const instructorPasswordHash = await hashPassword("instructor123");
    await userModel.createUser({
      name: "Dr. Jane Smith",
      email: "instructor@example.com", 
      password_hash: instructorPasswordHash,
      role: "instructor",
      major: "Computer Science"
    });
    
    // Create student user
    const studentPasswordHash = await hashPassword("student123");
    await userModel.createUser({
      name: "John Doe",
      email: "student@example.com",
      password_hash: studentPasswordHash,
      role: "student",
      student_number: "12345678",
      major: "Computer Science"
    });
    
    // Create TA coordinator user
    const taCoordinatorPasswordHash = await hashPassword("tacoord123");
    await userModel.createUser({
      name: "Sarah Johnson",
      email: "tacoord@example.com",
      password_hash: taCoordinatorPasswordHash,
      role: "ta_coordinator",
      major: "Computer Science"
    });
    
    console.log('🎉 All sample users created successfully!');
    console.log('📝 Login credentials:');
    console.log("   Admin: admin@example.com / admin123");
    console.log("   Instructor: instructor@example.com / instructor123");
    console.log("   Student: student@example.com / student123");
    console.log("   TA Coordinator: tacoord@example.com / tacoord123");
    
  } catch (error) {
    console.error("Error creating sample users:", error);
    throw error;
  }
}

/**
 * Main function to load comprehensive dummy data
 */
async function main(): Promise<void> {
  let db: Database | null = null;
  
  try {
    console.log('🚀 Starting comprehensive dummy data loading...');
    console.log('==========================================\n');
    
    // Get database configuration
    const config = getDatabaseConfig();
    console.log(`📡 Connecting to database: ${config.hostname}:${config.port}/${config.database}`);
    
    // Create database connection
    db = new Database(config);
    await db.connect();
    console.log('✅ Database connection established\n');
    
    // Test database connectivity
    const testResult = await db.query('SELECT NOW() as current_time');
    console.log(`🕒 Database time: ${testResult.rows[0].current_time}\n`);
    
    // Check if users already exist
    const hasExistingUsers = await checkExistingUsers(db);
    if (hasExistingUsers) {
      console.log('ℹ️  Default test users already exist. Skipping dummy data creation.');
      console.log('💡 To reload dummy data, first run: make restore-before-dummy');
      return;
    }
    
    // Create sample users first (minimal required users)
    await createSampleUsers(db);
    
    // Ask if user wants to load comprehensive dummy data
    if (Deno.env.get('LOAD_FULL_DUMMY_DATA') === 'true') {
      console.log('\n🌱 Loading comprehensive dummy data...');
      const loader = new ComprehensiveDummyDataLoader(db);
      await loader.loadAllData();
    } else {
      console.log('\n✅ Basic user accounts created successfully!');
      console.log('💡 Set LOAD_FULL_DUMMY_DATA=true to load comprehensive test data');
    }
    
    console.log('\n🎉 Dummy data loading completed successfully!');
    console.log('\n🔍 You can now test the application with the loaded data.');
    
  } catch (error) {
    console.error('❌ Error during dummy data loading:');
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
  
  console.log('AllocAid Comprehensive Dummy Data Loader');
  console.log('========================================');
  console.log(`Environment: ${Deno.env.get('DENO_ENV') || 'development'}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  await main();
}