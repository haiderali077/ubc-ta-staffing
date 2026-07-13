import { assertEquals, assertExists } from "../../../deps.ts";
import { Database, getDatabaseConfig } from "./../../database/config.ts";
import { SchemaManager } from "./../../database/schema.ts";

// Set test environment to use test database
Deno.env.set("DENO_ENV", "test");

/**
 * Database Performance Tests - Improved Version
 * 
 * Tests database performance with corrected schema references
 * and improved error handling.
 */

async function setupPerformanceDatabase(): Promise<Database> {
  const config = getDatabaseConfig();
  const db = new Database(config);
  await db.connect();
  
  // Reset database state
  const schemaManager = new SchemaManager(db);
  await schemaManager.dropAllTables();
  await schemaManager.createAllTables();
  
  return db;
}

/**
 * Helper function to measure execution time
 */
async function measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const endTime = Date.now();
  return { result, duration: endTime - startTime };
}

/**
 * Generate test data for performance testing
 */
function generateTestUsers(count: number) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      name: `Performance User ${i}`,
      email: `perfuser${i}@test.allocaid.com`,
      password_hash: `$2b$10$hashedpassword${i.toString().padStart(3, '0')}`,
      role: 'student',
      student_number: `2000${i.toString().padStart(4, '0')}`
    });
  }
  return users;
}

Deno.test("Improved Database Performance Tests", async (t) => {
  let db: Database;

  await t.step("Setup", async () => {
    db = await setupPerformanceDatabase();
    
    // Seed initial data required for tests
    const schemaManager = new SchemaManager(db);
    await schemaManager.seedTestData();
  });

  await t.step("should handle efficient bulk operations", async () => {
    const batchSize = 50;
    const users = generateTestUsers(batchSize);
    
    const { duration } = await measureTime(async () => {
      // Use batch inserts for better performance
      const batchQueries = [];
      for (let i = 0; i < users.length; i += 10) {
        const batch = users.slice(i, i + 10);
        const values = batch.map((_, idx) => 
          `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5})`
        ).join(',');
        
        const params = batch.flatMap(user => [
          user.name, user.email, user.password_hash, user.role, user.student_number
        ]);
        
        batchQueries.push(
          db.query(`
            INSERT INTO users (name, email, password_hash, role, student_number) 
            VALUES ${values}
          `, params)
        );
      }
      
      await Promise.all(batchQueries);
    });

    // Verify insertion count - fix the BigInt comparison issue
    const countResult = await db.query("SELECT COUNT(*) as count FROM users WHERE email LIKE '%@test.allocaid.com'");
    const insertedCount = Number(countResult.rows[0].count);
    
    assertEquals(insertedCount, batchSize, "All test users should be inserted");
    
    // Performance check
    assertEquals(duration < 3000, true, `Bulk insert should complete quickly (took ${duration}ms)`);
    
    console.log(`✅ Bulk Operations: Inserted ${batchSize} users in ${duration}ms`);
  });

  await t.step("should perform complex aggregation queries efficiently", async () => {
    // Create some test applications for complex queries
    const userResult = await db.query("SELECT user_id FROM users WHERE role = 'student' LIMIT 5");
    const courseResult = await db.query("SELECT course_id FROM courses LIMIT 3");
    
    if (userResult.rows.length > 0 && courseResult.rows.length > 0) {
      // Insert some TA applications
      for (let i = 0; i < Math.min(userResult.rows.length, 3); i++) {
        await db.query(`
          INSERT INTO ta_applications (user_id, status, notes) 
          VALUES ($1, 'pending', 'Performance test application ${i}')
        `, [userResult.rows[i].user_id]);
      }
    }

    const { result, duration } = await measureTime(async () => {
      return await db.query(`
        SELECT 
          u.role,
          COUNT(u.user_id) as user_count,
          COUNT(ta.application_id) as application_count
        FROM users u
        LEFT JOIN ta_applications ta ON u.user_id = ta.user_id
        WHERE u.role IN ('student', 'instructor')
        GROUP BY u.role
        ORDER BY user_count DESC
      `);
    });

    // Verify query results
    assertExists(result.rows, "Query should return results");
    assertEquals(result.rows.length >= 1, true, "Should have at least one role group");
    
    // Performance check
    assertEquals(duration < 1000, true, `Complex query should complete quickly (took ${duration}ms)`);
    
    console.log(`✅ Complex Query: Aggregated ${result.rows.length} role groups in ${duration}ms`);
  });

  await t.step("should handle concurrent read operations efficiently", async () => {
    const concurrentReads = 8;
    const startTime = Date.now();
    
    const readOperations = Array.from({ length: concurrentReads }, async (_, index) => {
      return await db.query(`
        SELECT user_id, name, email, role 
        FROM users 
        WHERE role = 'student' 
        ORDER BY user_id 
        LIMIT 10 OFFSET $1
      `, [index * 5]);
    });
    
    const results = await Promise.all(readOperations);
    const duration = Date.now() - startTime;
    
    // Verify all reads succeeded
    assertEquals(results.length, concurrentReads, "All concurrent reads should complete");
    results.forEach((result: { rows: any[] }, index: number) => {
      assertExists(result.rows, `Read operation ${index} should return data`);
    });
    
    // Performance check
    assertEquals(duration < 2000, true, `Concurrent reads should complete quickly (took ${duration}ms)`);
    
    console.log(`✅ Concurrent Reads: ${concurrentReads} operations completed in ${duration}ms`);
  });

  await t.step("should manage database connections properly", async () => {
    const connectionTests: Promise<boolean>[] = [];
    
    // Test multiple connection scenarios
    for (let i = 0; i < 5; i++) {
      connectionTests.push((async () => {
        const testDb = new Database(getDatabaseConfig());
        await testDb.connect();
        
        // Perform a simple query
        const result = await testDb.query("SELECT COUNT(*) as count FROM users");
        assertExists(result.rows[0].count, "Connection should work");
        
        await testDb.disconnect();
        return true;
      })());
    }
    
    const { duration } = await measureTime(async () => {
      const results = await Promise.all(connectionTests);
      return results;
    });
    
    // Performance check
    assertEquals(duration < 5000, true, `Connection management should be efficient (took ${duration}ms)`);
    
    console.log(`✅ Connection Management: 5 connection cycles completed in ${duration}ms`);
  });

  await t.step("should handle data consistency under load", async () => {
    const operations = 6;
    let successCount = 0;
    
    const { duration } = await measureTime(async () => {
      const dataOperations = Array.from({ length: operations }, async (_, index) => {
        try {
          // Insert a user with conflict handling
          await db.query(`
            INSERT INTO users (name, email, password_hash, role, student_number) 
            VALUES ($1, $2, $3, 'student', $4)
            ON CONFLICT (email) DO NOTHING
          `, [
            `Load Test User ${index}`,
            `loadtest${index}@consistency.test`,
            '$2b$10$hashedpassword',
            `3000${index.toString().padStart(3, '0')}`
          ]);
          successCount++;
          return true;
        } catch (error) {
          console.log(`Operation ${index} failed:`, error);
          return false;
        }
      });
      
      await Promise.all(dataOperations);
    });
    
    // Verify data consistency
    const finalCount = await db.query("SELECT COUNT(*) as count FROM users WHERE email LIKE '%@consistency.test'");
    const insertedUsers = Number(finalCount.rows[0].count);
    
    assertEquals(insertedUsers <= operations, true, "Should not have duplicate inserts");
    assertEquals(successCount >= operations - 1, true, "Most operations should succeed");
    
    // Performance check
    assertEquals(duration < 3000, true, `Load test should complete efficiently (took ${duration}ms)`);
    
    console.log(`✅ Data Consistency: ${successCount}/${operations} operations succeeded in ${duration}ms`);
  });

  await t.step("Cleanup", async () => {
    await db.disconnect();
    console.log("✅ Performance tests completed successfully");
  });
});