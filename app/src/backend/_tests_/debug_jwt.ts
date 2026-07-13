// JWT Token Diagnostic Script
// Save as: app/src/backend/_tests_/debug_jwt.ts
// Run with: deno run --allow-all app/src/backend/_tests_/debug_jwt.ts

import { createJWT, verifyJWT } from "../../../deps.ts";

/**
 * Test JWT token creation and verification
 */
async function testJWTTokens() {
  console.log("🔧 Testing JWT token creation and verification...");
  
  // Set test environment
  const testSecret = "test-secret-key-" + crypto.randomUUID();
  console.log(`🔑 Using test secret: ${testSecret}`);
  
  try {
    // Create CryptoKey
    const encoder = new TextEncoder();
    const keyData = encoder.encode(testSecret);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    console.log("✅ CryptoKey created successfully");
    
    // Create test payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: "123",
      email: "test@example.com",
      role: "admin",
      iat: now,
      exp: now + 3600 // 1 hour
    };
    
    console.log("📝 Test payload:", payload);
    
    // Create JWT
    const token = await createJWT({ alg: "HS256" }, payload, cryptoKey);
    console.log(`🎫 Created JWT token: ${token.substring(0, 50)}...`);
    
    // Verify JWT
    const decoded = await verifyJWT(token, cryptoKey);
    console.log("✅ JWT verification successful");
    console.log("📄 Decoded payload:", decoded);
    
    // Test with invalid token
    try {
      await verifyJWT("invalid.jwt.token", cryptoKey);
      console.error("❌ Should have failed to verify invalid token");
    } catch (error) {
      if (error instanceof Error) {
        console.log("✅ Invalid token properly rejected:", error.message);
      } else {
        console.log("✅ Invalid token properly rejected:", error);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error("❌ JWT test failed:", error);
    return false;
  }
}

/**
 * Test the auth service token generation
 */
async function testAuthServiceTokens() {
  console.log("\n🔧 Testing AuthService token generation...");
  
  try {
    // Import dependencies
    const { Database, getDatabaseConfig } = await import("../../database/config.ts");
    const { AuthService } = await import("../services/auth.ts");
    const { UserModel } = await import("../../database/models/user.ts");
    const { hashPassword } = await import("../../../deps.ts");
    
    // Set environment variables
    Deno.env.set("JWT_SECRET", "test-secret-key");
    Deno.env.set("REFRESH_SECRET", "test-refresh-secret");
    Deno.env.set("DENO_ENV", "test");
    
    // Create database connection
    const config = getDatabaseConfig();
    const db = new Database(config);
    await db.connect();
    
    console.log("✅ Database connected");
    
    // Create services
    const authService = new AuthService(db);
    const userModel = new UserModel(db);
    
    // Create test user
    const testUserData = {
      name: "JWT Test User",
      email: "jwt.test@example.com",
      password_hash: await hashPassword("testpassword123"),
      role: "admin" as const,
      is_active: true
    };
    
    console.log("👤 Creating test user...");
    
    // Clean up any existing user first
    try {
      const existingUser = await userModel.getUserByEmail(testUserData.email);
      if (existingUser) {
        await userModel.deleteUser(existingUser.user_id!);
        console.log("🗑️ Cleaned up existing test user");
      }
    } catch (e) {
      // User doesn't exist, that's fine
    }
    
    const testUser = await userModel.createUser(testUserData);
    console.log(`✅ Test user created with ID: ${testUser.user_id}`);
    
    // Test login
    console.log("🔑 Testing login...");
    const loginResult = await authService.login("jwt.test@example.com", "testpassword123");
    
    if (loginResult.success) {
      console.log("✅ Login successful");
      console.log("🎫 Access token:", loginResult.accessToken?.substring(0, 50) + "...");
      console.log("🔄 Refresh token:", loginResult.refreshToken?.substring(0, 50) + "...");
      
      // Test token verification
      if (loginResult.accessToken) {
        console.log("🔍 Testing token verification...");
        const verifyResult = await authService.verifyToken(loginResult.accessToken);
        
        if (verifyResult.success) {
          console.log("✅ Token verification successful");
          console.log("👤 Verified user:", verifyResult.user?.email);
        } else {
          console.error("❌ Token verification failed:", verifyResult.error);
        }
      }
      
    } else {
      console.error("❌ Login failed:", loginResult.error);
    }
    
    // Cleanup
    await userModel.deleteUser(testUser.user_id!);
    await db.disconnect();
    console.log("🧹 Cleanup complete");
    
    return loginResult.success;
    
  } catch (error) {
    console.error("❌ AuthService test failed:", error);
    return false;
  }
}

/**
 * Test the complete authentication flow
 */
async function testCompleteAuthFlow() {
  console.log("\n🔧 Testing complete authentication flow...");
  
  try {
    // Import test utilities
    const { setupTestDatabase, createTestApp } = await import("./test_utils.ts");
    const { getTestData } = await import("./fixtures.ts");
    
    // Setup test environment
    console.log("🏗️ Setting up test environment...");
    const db = await setupTestDatabase();
    const app = await createTestApp(db);
    
    // Get test data
    const testUsers = getTestData('users');
    console.log("📄 Test users:", Object.keys(testUsers));
    
    if (!testUsers.admin) {
      console.error("❌ No admin user in test data");
      return false;
    }
    
    // Test login endpoint directly
    console.log(`🔑 Testing login for: ${testUsers.admin.email}`);
    
    const loginResponse = await app.handle(
      new Request("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUsers.admin.email,
          password: testUsers.admin.password
        }),
      })
    );
    
    console.log(`📊 Login response status: ${loginResponse?.status}`);
    
    if (loginResponse?.status === 200) {
      console.log("✅ Login endpoint working");
      
      const cookies = loginResponse.headers.get("Set-Cookie") || "";
      console.log("🍪 Response cookies:", cookies);
      
      const accessTokenMatch = cookies.match(/access_token=([^;]+)/);
      if (accessTokenMatch) {
        console.log("✅ Access token found in cookies");
        
        // Test protected endpoint
        console.log("🛡️ Testing protected endpoint...");
        const protectedResponse = await app.handle(
          new Request("http://localhost:8000/admin/users", {
            method: "GET",
            headers: {
              "Cookie": `access_token=${accessTokenMatch[1]}`
            }
          })
        );
        
        console.log(`📊 Protected endpoint status: ${protectedResponse?.status}`);
        
        if (protectedResponse?.status === 200) {
          console.log("✅ Protected endpoint accessible with token");
          return true;
        } else {
          const errorBody = await protectedResponse?.text();
          console.error("❌ Protected endpoint failed:", errorBody);
        }
      } else {
        console.error("❌ No access token in cookies");
      }
    } else {
      const errorBody = await loginResponse?.text();
      console.error("❌ Login failed:", errorBody);
    }
    
    // Cleanup
    await db.disconnect();
    return false;
    
  } catch (error) {
    console.error("❌ Complete auth flow test failed:", error);
    return false;
  }
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
  console.log("🚀 Starting JWT diagnostics...\n");
  
  const tests = [
    { name: "Basic JWT Operations", fn: testJWTTokens },
    { name: "AuthService Tokens", fn: testAuthServiceTokens },
    { name: "Complete Auth Flow", fn: testCompleteAuthFlow }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`Running: ${test.name}`);
    console.log(`${"=".repeat(50)}`);
    
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
      console.log(`\n${result ? "✅" : "❌"} ${test.name}: ${result ? "PASSED" : "FAILED"}`);
    } catch (error) {
      console.error(`\n❌ ${test.name}: FAILED with error:`, error);
      results.push({ name: test.name, success: false, error });
    }
  }
  
  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log("DIAGNOSTIC SUMMARY");
  console.log(`${"=".repeat(50)}`);
  
  results.forEach(result => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} - ${result.name}`);
    if (result.error) {
      if (result.error instanceof Error) {
        console.log(`   Error: ${result.error.message}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    }
  });
  
  const passCount = results.filter(r => r.success).length;
  console.log(`\nOverall: ${passCount}/${results.length} tests passed`);
  
  if (passCount === results.length) {
    console.log("🎉 All diagnostics passed! JWT authentication should be working.");
  } else {
    console.log("⚠️ Some diagnostics failed. Check the errors above.");
  }
}

// Run diagnostics if this file is executed directly
if (import.meta.main) {
  await runDiagnostics();
}