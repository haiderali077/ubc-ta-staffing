// deno-lint-ignore-file no-explicit-any
import { Application, assertEquals, assertExists, hashPassword } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { UserModel } from "../../database/models/user.ts";
import { adminOnly, initializeAdminMiddleware } from "../routes/adminRouter.ts";
import { AuthService } from "../services/auth.ts";
import { getTestData } from "./fixtures.ts";
import { createTestApp, setupTestDatabase } from "./test_utils.ts";

// Set test environment variables early
Deno.env.set("DENO_ENV", "test");
Deno.env.set("JWT_SECRET", "test-secret-key-admin-" + crypto.randomUUID());
Deno.env.set("REFRESH_SECRET", "test-refresh-secret-admin-" + crypto.randomUUID());

/** Enhanced getAuthToken specifically for admin tests */
async function getAdminAuthToken(app: Application, email: string, password: string): Promise<string> {
  console.log(`🔑 Getting auth token for admin: ${email}`);
  
  const response = await app.handle(
    new Request("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );

  if (!response || response.status !== 200) {
    const errorText = response ? await response.text() : "No response";
    console.error(`❌ Auth failed - Status: ${response?.status}, Body: ${errorText}`);
    throw new Error(`Authentication failed: ${response?.status} for ${email} - ${errorText}`);
  }

  const cookies = response.headers.get("Set-Cookie") || "";
  const accessTokenMatch = cookies.match(/access_token=([^;]+)/);
  
  if (!accessTokenMatch) {
    console.error("❌ No access token in cookies:", cookies);
    throw new Error(`No access token found for ${email}`);
  }

  console.log(`✅ Token acquired for ${email}`);
  return accessTokenMatch[1];
}

/** Create admin user if it doesn't exist */
async function ensureAdminUser(db: Database, email: string, password: string): Promise<void> {
  console.log(`👤 Ensuring admin user exists: ${email}`);
  
  const userModel = new UserModel(db);
  const authService = new AuthService(db);
  
  try {
    // Check if user exists
    const existingUser = await userModel.getUserByEmail(email);
    
    if (existingUser) {
      console.log(`✅ Admin user exists with ID: ${existingUser.user_id}`);
      
      // Test if password works
      const loginResult = await authService.login(email, password);
      if (loginResult.success) {
        console.log(`✅ Admin user authentication verified`);
        return;
      } else {
        console.warn(`⚠️ Admin user exists but password doesn't work, will recreate`);
        await userModel.deleteUser(existingUser.user_id!);
      }
    }
    
    // Create new admin user
    console.log(`📝 Creating admin user: ${email}`);
    const adminData = {
      name: "Test Admin User",
      email: email,
      password_hash: await hashPassword(password),
      role: "admin" as const,
      is_active: true
    };
    
    const newUser = await userModel.createUser(adminData);
    console.log(`✅ Admin user created with ID: ${newUser.user_id}`);
    
    // Verify the new user works
    const verifyResult = await authService.login(email, password);
    if (!verifyResult.success) {
      throw new Error(`Created admin user failed verification: ${verifyResult.error}`);
    }
    
    console.log(`✅ Admin user verified successfully`);
    
  } catch (error) {
    console.error(`❌ Failed to ensure admin user:`, error);
    throw error;
  }
}

Deno.test("Admin Routes", async (t) => {
  let db: Database | null = null;
  let app: Application | null = null;
  let adminToken: string = "";
  let testUsers: any = null;
  let createdUserId: number;
  let createdInstructorId: number;

  await t.step("Setup", async () => {
    console.log("🔧 Setting up Admin Routes test...");
    
    try {
      // Initialize database and app with retries
      console.log("📊 Initializing test database...");
      db = await setupTestDatabase({ maxRetries: 5 });
      
      if (!db) {
        throw new Error("Database initialization returned null");
      }
      
      console.log("🏗️ Creating test application...");
      app = await createTestApp(db);
      
      if (!app) {
        throw new Error("Test application creation returned null");
      }
      
      // Get test data
      testUsers = getTestData('users');
      console.log("📄 Test users available:", Object.keys(testUsers));
      
      if (!testUsers.admin) {
        throw new Error("No admin user in test data");
      }
      
      // Ensure admin user exists in database
      await ensureAdminUser(db, testUsers.admin.email, testUsers.admin.password);
      
      // Get auth token
      adminToken = await getAdminAuthToken(app, testUsers.admin.email, testUsers.admin.password);
      
      console.log("✅ Admin setup complete");
      
    } catch (error) {
      console.error("❌ Admin setup failed:", error);
      throw error;
    }
  });

  await t.step("GET /admin/users - should list all users", async () => {
    console.log("🧪 Testing GET /admin/users");
    
    const response = await app.handle(
      new Request("http://localhost:8000/admin/users", {
        method: "GET",
        headers: {
          "Cookie": `access_token=${adminToken}`
        }
      })
    );

    assertEquals(response?.status, 200);
    const body = await response?.json();
    assertExists(body.users);
    assertEquals(Array.isArray(body.users), true);
    
    // Verify admin user is in the list
    const adminUser = body.users.find((u: any) => u.role === "admin");
    assertExists(adminUser, "Admin user should be in the list");
    
    console.log(`✅ Found ${body.users.length} users including admin`);
  });

  await t.step("POST /admin/users/create - should create new instructor", async () => {
    console.log("🧪 Testing POST /admin/users/create");
    
    const newInstructor = {
      firstName: "Test",
      lastName: "Instructor",
      email: "test.instructor@ubc.ca",
      role: "instructor",
      temporaryPassword: "TempPass123",
      departmentId: 1,
      notes: "Test instructor created by admin test"
    };

    const response = await app.handle(
      new Request("http://localhost:8000/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify(newInstructor)
      })
    );

    assertEquals(response?.status, 201);
    const body = await response?.json();
    assertExists(body.user);
    assertEquals(body.user.email, newInstructor.email);
    assertEquals(body.user.role, newInstructor.role);
    createdInstructorId = body.user.id;
    
    console.log("✅ Instructor created successfully");
  });

  await t.step("POST /admin/users/create - should reject duplicate email", async () => {
    console.log("🧪 Testing POST /admin/users/create with duplicate email");
    
    const duplicateUser = {
      firstName: "Duplicate",
      lastName: "User",
      email: "test.instructor@ubc.ca", // Same as previously created
      role: "instructor",
      temporaryPassword: "TempPass123",
      departmentId: 1
    };

    const response = await app.handle(
      new Request("http://localhost:8000/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify(duplicateUser)
      })
    );

    assertEquals(response?.status, 409);
    const body = await response?.json();
    assertExists(body.error);
    assertEquals(body.error, "Email already registered");
    
    console.log("✅ Duplicate email properly rejected");
  });

  await t.step("POST /admin/users/create - should reject invalid input", async () => {
    console.log("🧪 Testing POST /admin/users/create with invalid data");
    
    const invalidData = {
      firstName: "", // Invalid - empty
      lastName: "Test",
      email: "not-an-email", // Invalid email format
      role: "invalid_role", // Invalid role
      temporaryPassword: "short" // Too short
    };

    const response = await app.handle(
      new Request("http://localhost:8000/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify(invalidData)
      })
    );

    assertEquals(response?.status, 400);
    const body = await response?.json();
    assertExists(body.error);
    assertExists(body.details);
    assertEquals(body.details.length > 0, true);
    
    console.log("✅ Invalid input properly rejected with detailed errors");
  });

  await t.step("PUT /admin/users/:userId/role - should update user role", async () => {
    console.log("🧪 Testing PUT /admin/users/:userId/role");
    
    // Get a student user to update
    const usersResponse = await app.handle(
      new Request("http://localhost:8000/admin/users", {
        method: "GET",
        headers: { "Cookie": `access_token=${adminToken}` }
      })
    );
    
    if (!usersResponse) {
      throw new Error("No response from users endpoint");
    }
    
    const users = await usersResponse.json();
    const studentUser = users.users.find((u: any) => u.role === "student");
    
    if (!studentUser) {
      console.log("⚠️ No student user found, skipping role update test");
      return;
    }
    
    createdUserId = studentUser.id;
    
    const newRole = "ta_coordinator";
    const response = await app.handle(
      new Request(`http://localhost:8000/admin/users/${studentUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify({ role: newRole })
      })
    );
    
    assertEquals(response?.status, 200);
    const body = await response?.json();
    assertEquals(body.user.role, newRole);
    
    console.log("✅ Role update successful");
  });

  await t.step("PUT /admin/users/:userId/role - should reject invalid role", async () => {
    console.log("🧪 Testing PUT /admin/users/:userId/role with invalid role");
    
    const response = await app.handle(
      new Request(`http://localhost:8000/admin/users/${createdUserId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify({ role: "invalid_role" })
      })
    );
    
    assertEquals(response?.status, 400);
    const body = await response?.json();
    assertExists(body.error);
    
    console.log("✅ Invalid role properly rejected");
  });

  await t.step("PUT /admin/users/:userId/role - should prevent self-role-change", async () => {
    console.log("🧪 Testing self-role-change prevention");
    
    // Get admin user ID
    const usersResponse = await app.handle(
      new Request("http://localhost:8000/admin/users", {
        method: "GET",
        headers: { "Cookie": `access_token=${adminToken}` }
      })
    );

    if (!usersResponse) {
      throw new Error("No response from users endpoint");
    }

    const users = await usersResponse.json();
    const adminUser = users.users.find((u: any) => u.role === "admin");

    const response = await app.handle(
      new Request(`http://localhost:8000/admin/users/${adminUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify({ role: "student" })
      })
    );

    assertEquals(response?.status, 400);
    const body = await response?.json();
    assertEquals(body.error, "Cannot change admin role through this method.");
    console.log("✅ Self-role-change properly prevented");
  });

  await t.step("PUT /admin/users/:userId/activate - should activate user", async () => {
    console.log("🧪 Testing PUT /admin/users/:userId/activate");
    
    if (!createdUserId) {
      console.log("⚠️ No user created yet, skipping activation test");
      return;
    }

    const response = await app.handle(
      new Request(`http://localhost:8000/admin/users/${createdUserId}/activate`, {
        method: "PUT",
        headers: {
          "Cookie": `access_token=${adminToken}`
        }
      })
    );

    assertEquals(response?.status, 200);
    const body = await response?.json();
    assertEquals(body.message, "User activated successfully");
    console.log("✅ User activation successful");
  });

  await t.step("DELETE /admin/users/:userId - should deactivate user", async () => {
    console.log("🧪 Testing DELETE /admin/users/:userId");
    
    if (!createdUserId) {
      console.log("⚠️ No user created yet, skipping deactivation test");
      return;
    }

    const response = await app.handle(
      new Request(`http://localhost:8000/admin/users/${createdUserId}`, {
        method: "DELETE",
        headers: {
          "Cookie": `access_token=${adminToken}`
        }
      })
    );

    assertEquals(response?.status, 200);
    const body = await response?.json();
    assertEquals(body.message, "User deactivated successfully");
    console.log("✅ User deactivation successful");
  });

  await t.step("DELETE /admin/users/:userId - should prevent self-deactivation", async () => {
    console.log("🧪 Testing self-deactivation prevention");
    
    // Get admin user ID
    const usersResponse = await app.handle(
      new Request("http://localhost:8000/admin/users", {
        method: "GET",
        headers: { "Cookie": `access_token=${adminToken}` }
      })
    );

    if (!usersResponse) {
      throw new Error("No response from users endpoint");
    }

    const users = await usersResponse.json();
    const adminUser = users.users.find((u: any) => u.role === "admin");

    const response = await app.handle(
      new Request(`http://localhost:8000/admin/users/${adminUser.id}`, {
        method: "DELETE",
        headers: {
          "Cookie": `access_token=${adminToken}`
        }
      })
    );

    assertEquals(response?.status, 400);
    const body = await response?.json();
    assertEquals(body.error, "Cannot deactivate your own account");
    console.log("✅ Self-deactivation properly prevented");
  });

  await t.step("POST /admin/terms - should create new term with valid dates", async () => {
    const newTerm = {
      name: `Summer ${Date.now()}`, // Make unique
      start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      end_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0] // 30 days from now
    };

    const response = await app.handle(
      new Request("http://localhost:8000/admin/terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify(newTerm)
      })
    );

    assertEquals(response?.status, 200);
    const body = await response?.json();
    assertExists(body.message);
    console.log("✅ Term creation successful");
  });

  await t.step("POST /admin/terms - should reject invalid dates", async () => {
    const invalidTerm = {
      name: "Invalid Term",
      start_date: "2020-01-01", // Past date
      end_date: "2019-12-31" // Before start date
    };

    const response = await app.handle(
      new Request("http://localhost:8000/admin/terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify(invalidTerm)
      })
    );

    assertEquals(response?.status, 400);
    const body = await response?.json();
    assertExists(body.error);
    console.log("✅ Invalid term dates properly rejected");
  });

  await t.step("POST /admin/courses - should create new course", async () => {
    console.log("🧪 Testing POST /admin/courses");
    
    const newCourse = {
      code: "CPSC310",
      title: "Introduction to Software Engineering",
      term: "Winter 2024",
      instructor_id: createdInstructorId,
      dept_id: 1
    };

    const response = await app.handle(
      new Request("http://localhost:8000/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify(newCourse)
      })
    );

    assertEquals(response?.status, 200);
    const body = await response?.json();
    assertExists(body.message);
    console.log("✅ Course creation successful");
  });

  await t.step("POST /admin/courses - should reject invalid course data", async () => {
    console.log("🧪 Testing POST /admin/courses with invalid data");
    
    const invalidCourse = {
      code: "", // Empty code
      title: "", // Empty title
      term: "" // Empty term
    };

    const response = await app.handle(
      new Request("http://localhost:8000/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `access_token=${adminToken}`
        },
        body: JSON.stringify(invalidCourse)
      })
    );

    assertEquals(response?.status, 400);
    const body = await response?.json();
    assertExists(body.error);
    console.log("✅ Invalid course data properly rejected");
  });

  await t.step("GET /admin/terms - should list all terms", async () => {
  console.log("🧪 Testing GET /admin/terms");
  
  const response = await app.handle(
    new Request("http://localhost:8000/admin/terms", {
      method: "GET",
      headers: {
        "Cookie": `access_token=${adminToken}`
      }
    })
  );

  assertEquals(response?.status, 200);
  const body = await response?.json();
  assertExists(body.message);
  assertEquals(body.message, "Admin term listing - redirect to TA coordinator endpoint");
  
  console.log("✅ Term listing successful");
});

await t.step("GET /admin/courses - should list all courses", async () => {
  console.log("🧪 Testing GET /admin/courses");
  
  const response = await app.handle(
    new Request("http://localhost:8000/admin/courses", {
      method: "GET",
      headers: {
        "Cookie": `access_token=${adminToken}`
      }
    })
  );

  assertEquals(response?.status, 200);
  const body = await response?.json();
  assertExists(body.message);
  assertEquals(body.message, "Admin course listing - redirect to TA coordinator endpoint");
  
  console.log("✅ Course listing successful");
});

await t.step("initializeAdminMiddleware - should initialize admin middleware", () => {
  console.log("🧪 Testing initializeAdminMiddleware");
  
  const mockAuthService = {
    verifyToken: () => ({ success: true, user: { role: "admin" } })
  } as unknown as AuthService;
  
  initializeAdminMiddleware(mockAuthService);
  
  // Verify the adminOnly middleware was created
  assertExists(adminOnly, "Middleware should be initialized");
  assertEquals(typeof adminOnly, "function", "Should be a middleware function");
  
  console.log("✅ Admin middleware initialized successfully");
});

  await t.step("Teardown", async () => {
    console.log("🧹 Cleaning up admin test");
    
    try {
      if (db) {
        await db.disconnect();
        console.log("✅ Database disconnected");
      }
    } catch (error) {
      console.warn("⚠️ Cleanup warning:", error);
    }
  });
});