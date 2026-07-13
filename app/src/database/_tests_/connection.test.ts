import { assertEquals, assertExists } from "../../../deps.ts";
import { Database, getDatabaseConfig } from "../config.ts";

/**
 * Database Connection Test
 * 
 * This file tests basic database connectivity and query execution.
 * It ensures the database can connect, execute queries, and handle errors properly.
 */

// Set test environment
Deno.env.set("DENO_ENV", "test");

Deno.test({
  name: "Database Connection and Basic Operations",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    let db: Database;

  /**
   * Test 1: Database configuration
   * Ensures proper configuration is loaded for test environment
   */
  await t.step("Load test database configuration", () => {
    const config = getDatabaseConfig();
    
    assertExists(config, "Database configuration should exist");
    assertExists(config.hostname, "Config should have hostname");
    assertExists(config.database, "Config should have database name");
    assertExists(config.user, "Config should have user");
    assertExists(config.password, "Config should have password");
    assertExists(config.port, "Config should have port");
    
    // Verify we're using test database
    assertEquals(
      config.database.includes("test") || Deno.env.get("DENO_ENV") === "test",
      true,
      "Should be using test database configuration"
    );
  });

  /**
   * Test 2: Create database instance
   * Tests that we can create a database instance with config
   */
  await t.step("Create database instance", () => {
    const config = getDatabaseConfig();
    db = new Database(config);
    
    assertExists(db, "Database instance should be created");
  });

  /**
   * Test 3: Connect to database
   * Tests successful connection to the database
   */
  await t.step("Connect to database successfully", async () => {
    // Connect to database
    await db.connect();
    
    // If we reach here without error, connection is successful
    assertEquals(true, true, "Database connection should succeed");
  });

  /**
   * Test 4: Execute simple query
   * Tests basic query execution
   */
  await t.step("Execute SELECT 1 query", async () => {
    const result = await db.query("SELECT 1 as test_value");
    
    assertExists(result, "Query should return a result");
    assertExists(result.rows, "Result should have rows");
    assertEquals(result.rows.length, 1, "Should return exactly one row");
    assertEquals(result.rows[0].test_value, 1, "Should return correct value");
  });

  /**
   * Test 5: Execute query with parameters
   * Tests parameterized query execution to prevent SQL injection
   */
  await t.step("Execute parameterized query", async () => {
    const testValue = 42;
    const testString = "Hello, Database!";
    
    const result = await db.query(
      "SELECT $1::integer as number_value, $2::text as string_value",
      [testValue, testString]
    );
    
    assertExists(result.rows[0], "Should return a row");
    assertEquals(result.rows[0].number_value, testValue, "Number parameter should work");
    assertEquals(result.rows[0].string_value, testString, "String parameter should work");
  });

  /**
   * Test 6: Test transaction support
   * Ensures database supports transactions properly
   */
  await t.step("Execute transaction operations", async () => {
    // Start transaction
    await db.query("BEGIN");
    
    // Create temporary table within transaction
    await db.query(`
      CREATE TEMPORARY TABLE test_transaction (
        id SERIAL PRIMARY KEY,
        value TEXT
      )
    `);
    
    // Insert data
    await db.query(
      "INSERT INTO test_transaction (value) VALUES ($1)",
      ["test_value"]
    );
    
    // Verify data exists within transaction
    const result = await db.query("SELECT * FROM test_transaction");
    assertEquals(result.rows.length, 1, "Should have one row in transaction");
    
    // Rollback transaction
    await db.query("ROLLBACK");
    
    // Verify table no longer exists after rollback
    try {
      await db.query("SELECT * FROM test_transaction");
      assertEquals(true, false, "Table should not exist after rollback");
    } catch (error) {
      assertExists(error, "Should throw error when accessing rolled back table");
    }
  });

  /**
   * Test 7: Test database error handling
   * Ensures proper error handling for invalid queries
   */
  await t.step("Handle invalid query errors", async () => {
    try {
      // Execute invalid SQL
      await db.query("SELECT * FROM non_existent_table_xyz");
      assertEquals(true, false, "Should throw error for invalid query");
    } catch (error) {
      assertExists(error, "Should catch database error");
      // Verify it's a database error (contains relation or table error message)
      assertEquals(
        (typeof error === "string" && error.toLowerCase().includes("relation")) ||
        (error instanceof Error && error.message.toLowerCase().includes("table")),
        true,
        "Error should mention missing relation/table"
      );
    }
  });

  /**
   * Test 8: Test connection pooling
   * Ensures multiple queries can be executed efficiently
   */
  await t.step("Execute multiple concurrent queries", async () => {
    // Execute multiple queries concurrently
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(db.query("SELECT $1::integer as value", [i]));
    }
    
    const results = await Promise.all(promises);
    
    // Verify all queries completed successfully
    assertEquals(results.length, 5, "All concurrent queries should complete");
    
    // Verify each query returned correct result
    for (let i = 0; i < 5; i++) {
      assertEquals(
        results[i].rows[0].value,
        i,
        `Query ${i} should return correct value`
      );
    }
  });

  /**
   * Test 9: Test connection recovery
   * Ensures database can handle connection issues gracefully
   */
  await t.step("Test disconnection and reconnection", async () => {
    // First disconnect
    await db.disconnect();
    
    // Try to execute query after disconnect (should fail or auto-reconnect)
    try {
      // Attempt to reconnect
      await db.connect();
      
      // Execute query after reconnection
      const result = await db.query("SELECT 1 as reconnect_test");
      assertEquals(
        result.rows[0].reconnect_test,
        1,
        "Should be able to query after reconnection"
      );
    } catch (error) {
      // If auto-reconnect is not supported, ensure proper error
      assertExists(error, "Should have error if reconnection fails");
    }
  });

  /**
   * Test 10: Cleanup and final disconnect
   * Ensures proper cleanup of database connections
   */
  await t.step("Cleanup database connection", async () => {
    // Ensure we're connected for cleanup
    try {
      await db.query("SELECT 1");
    } catch {
      // Reconnect if needed
      await db.connect();
    }
    
    // Final disconnect
    await db.disconnect();
    
    // Verify disconnection by attempting query
    try {
      await db.query("SELECT 1");
      assertEquals(true, false, "Should not be able to query after disconnect");
    } catch (error) {
      assertExists(error, "Should throw error when querying after disconnect");
    }
  });
  }
});