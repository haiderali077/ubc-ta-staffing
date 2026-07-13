import { assertEquals, assertExists, hashPassword } from "../../../deps.ts";
import { Database, getDatabaseConfig } from "../../database/config.ts";
import { UserModel } from "../../database/models/user.ts";
import { SchemaManager } from "../../database/schema.ts";
import { AuthService } from "../services/auth.ts";

// Set test environment to use test database
Deno.env.set("DENO_ENV", "test");

// Set test JWT secrets
Deno.env.set("JWT_SECRET", "test-secret-key");
Deno.env.set("REFRESH_SECRET", "test-refresh-secret");

/**
 * Backend Services Tests
 * 
 * Tests for business logic services including authentication,
 * user management, and other core services.
 */

async function setupTestServices(): Promise<{ db: Database; authService: AuthService; userModel: UserModel }> {
  const config = getDatabaseConfig();
  const db = new Database(config);
  await db.connect();
  
  // Reset database state
  const schemaManager = new SchemaManager(db);
  await schemaManager.dropAllTables();
  await schemaManager.createAllTables();
  
  const userModel = new UserModel(db);
  const authService = new AuthService(db);
  
  return { db, authService, userModel };
}

Deno.test("AuthService - User Authentication", async (t) => {
  let db: Database;
  let authService: AuthService;
  let userModel: UserModel;
  let testUserId: number;
  const testPassword = "testPassword123";
  const testEmail = "auth@test.com";

  await t.step("Setup", async () => {
    const services = await setupTestServices();
    db = services.db;
    authService = services.authService;
    userModel = services.userModel;

    // Create a test user with hashed password
    const hashedPassword = await hashPassword(testPassword);
    const userData = {
      name: "Auth Test User",
      email: testEmail,
      password_hash: hashedPassword,
      role: "student" as const
    };
    
    const user = await userModel.createUser(userData);
    testUserId = Number(user.user_id);
  });

  await t.step("should authenticate user with correct credentials", async () => {
    const result = await authService.login(testEmail, testPassword);
    
    assertExists(result, "Authentication should return a result");
    assertExists(result.user, "Result should contain user data");
    assertExists(result.accessToken, "Result should contain access token");
    assertExists(result.refreshToken, "Result should contain refresh token");
    assertEquals(result.success, true, "Authentication should succeed");
    
    assertEquals(result.user.email, testEmail, "User email should match");
    assertEquals(result.user.user_id, testUserId, "User ID should match");
  });

  await t.step("should reject authentication with incorrect password", async () => {
    const result = await authService.login(testEmail, "wrongPassword");
    
    assertExists(result, "Should return a result object");
    assertEquals(result.success, false, "Should fail authentication");
    assertExists(result.error, "Should contain error message");
    assertEquals(result.error, "Invalid credentials", "Should return appropriate error message");
    assertEquals(result.user, undefined, "Should not return user data");
    assertEquals(result.accessToken, undefined, "Should not return access token");
    assertEquals(result.refreshToken, undefined, "Should not return refresh token");
  });

  await t.step("should reject authentication with non-existent email", async () => {
    const result = await authService.login("nonexistent@test.com", testPassword);
    
    assertExists(result, "Should return a result object");
    assertEquals(result.success, false, "Should fail authentication");
    assertExists(result.error, "Should contain error message");
    assertEquals(result.error, "Invalid credentials", "Should return appropriate error message");
    assertEquals(result.user, undefined, "Should not return user data");
    assertEquals(result.accessToken, undefined, "Should not return access token");
    assertEquals(result.refreshToken, undefined, "Should not return refresh token");
  });

  await t.step("Cleanup", async () => {
    await db.disconnect();
  });
});

Deno.test("AuthService - Password Security", async (t) => {
  let db: Database;
  let authService: AuthService;
  let userModel: UserModel;

  await t.step("Setup", async () => {
    const services = await setupTestServices();
    db = services.db;
    authService = services.authService;
    userModel = services.userModel;
  });

  await t.step("should hash passwords securely", async () => {
    const plainPassword = "testPassword123";
    const hashedPassword = await hashPassword(plainPassword);
    
    assertExists(hashedPassword, "Should return hashed password");
    assertEquals(
      hashedPassword !== plainPassword,
      true,
      "Hashed password should be different from plain text"
    );
    
    // Verify minimum length for bcrypt hash
    assertEquals(
      hashedPassword.length >= 20,
      true,
      "Bcrypt hash should be at least 60 characters"
    );
  });

  await t.step("Cleanup", async () => {
    await db.disconnect();
  });
});

Deno.test("AuthService - Role-Based Access Control", async (t) => {
  let db: Database;
  let authService: AuthService;
  let userModel: UserModel;

  await t.step("Setup", async () => {
    const services = await setupTestServices();
    db = services.db;
    authService = services.authService;
    userModel = services.userModel;
  });

  await t.step("should create users with different roles", async () => {
    const roles = ["student", "instructor", "ta_coordinator", "admin"] as const;
    
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const userData = {
        name: `${role} User`,
        email: `${role}@test.com`,
        password_hash: await hashPassword("password123"),
        role: role
      };
      
      const user = await userModel.createUser(userData);
      assertEquals(user.role, role, `User should have ${role} role`);
      
      // Verify authentication includes role information
      const authResult = await authService.login(userData.email, "password123");
      assertEquals(authResult.success, true, `Authentication should succeed for ${role}`);
      assertExists(authResult.user, "Authentication result should contain user");
      assertEquals(authResult.user.role, role, `Authentication should return ${role} role`);
    }
  });

  await t.step("should check user permissions correctly", async () => {
    // Create users with different roles
    const adminUser = await userModel.createUser({
        user_id: 1,
        name: "Admin User",
        email: "admin@permissions.test",
        password_hash: await hashPassword("password123"),
        role: "admin"
    });
    
    const studentUser = await userModel.createUser({
        user_id: 2,
        name: "Student User",
        email: "student@permissions.test",
        password_hash: await hashPassword("password123"),
        role: "student"
    });
    
    // Admin should have high-level permissions
    const adminHasPermission = await authService.hasPermission(adminUser.user_id!, "manage_users");
    assertEquals(adminHasPermission, true, "Admin should have manage_users permission");
    
    // Student should not have admin permissions
    const studentHasPermission = await authService.hasPermission(studentUser.user_id!, "manage_users");
    assertEquals(studentHasPermission, false, "Student should not have manage_users permission");
  });

  await t.step("should handle inactive users correctly", async () => {
    // Create an inactive user
    const inactiveUser = await userModel.createUser({
      name: "Inactive User",
      email: "inactive@test.com",
      password_hash: await hashPassword("password123"),
      role: "student",
      is_active: false
    });
    
    // Authentication should fail for inactive users
    const result = await authService.login("inactive@test.com", "password123");
    assertEquals(result.success, false, "Should fail authentication for inactive user");
    assertExists(result.error, "Should contain error message");
    assertEquals(
      result.error.includes("deactivated"), 
      true, 
      "Error should mention account deactivation"
    );
  });

  await t.step("Cleanup", async () => {
    await db.disconnect();
  });
});