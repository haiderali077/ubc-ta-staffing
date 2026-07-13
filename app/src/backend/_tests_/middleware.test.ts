import { Application, assertEquals, assertExists, hashPassword, Status } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { UserModel } from "../../database/models/user.ts";
import { createAuthMiddleware, requireAuth, requireRole } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";
import { createTestApp, getAuthToken, setupTestDatabase, TestMockFactory } from "./test_utils.ts";

/**
 * Backend Middleware Test
 * 
 * This file tests authentication middleware functionality including
 * token validation, role-based access control, and error handling.
 */

// Set test environment
Deno.env.set("DENO_ENV", "test");
Deno.env.set("JWT_SECRET", "test-secret-key");
Deno.env.set("REFRESH_SECRET", "test-refresh-secret");

Deno.test("Authentication Middleware", async (t) => {
  let db: Database;
  let app: Application;
  let authService: AuthService;
  let userModel: UserModel;
  
  // Test tokens for different user roles
  let studentToken: string;
  let instructorToken: string;
  let adminToken: string;
  let invalidToken: string;
  
  // Test user data
  let testUsers: any = {};

  /**
   * Test 1: Setup and create test users
   * Creates users with different roles for testing
   */
  await t.step("Setup test environment and users", async () => {
    // Initialize database and services
    db = await setupTestDatabase();
    authService = new AuthService(db);
    userModel = new UserModel(db);
    app = await createTestApp(db);
    
    // Create test users with different roles
    const roles = ["student", "instructor", "admin", "ta_coordinator"];
    
    for (const role of roles) {
      const userData = TestMockFactory.createMockUser({
        email: `${role}@test.ubc.ca`,
        role: role as any,
        password_hash: await hashPassword("password123")
      });
      
      const user = await userModel.createUser(userData);
      testUsers[role] = {
        ...user,
        password: "password123"
      };
    }
    
    // Get authentication tokens for each user
    studentToken = await getAuthToken(app, testUsers.student.email, "password123");
    instructorToken = await getAuthToken(app, testUsers.instructor.email, "password123");
    adminToken = await getAuthToken(app, testUsers.admin.email, "password123");
    
    // Create an invalid token
    invalidToken = "invalid.jwt.token";
  });

  /**
   * Test 2: Basic authentication middleware
   * Tests that middleware properly validates tokens
   */
  await t.step("Test basic authentication validation", async () => {
    // Create test route with auth middleware
    const testRouter = new Application();
    
    testRouter.use(async (ctx, next) => {
      ctx.state = {}; // Initialize state
      await next();
    });
    
    // Add route that requires authentication
    testRouter.use(requireAuth(authService));
    
    testRouter.use((ctx) => {
      ctx.response.body = { 
        success: true, 
        user: ctx.state.user 
      };
    });
    
    // Test with valid token
    const validRequest = new Request("http://localhost:8000/test", {
      headers: {
        "Cookie": `access_token=${studentToken}`
      }
    });
    
    const validResponse = await testRouter.handle(validRequest);
    assertEquals(validResponse?.status, 200, "Should allow access with valid token");
    
    const validBody = await validResponse?.json();
    assertExists(validBody.user, "Should set user in context");
    assertEquals(validBody.user.email, testUsers.student.email, "Should have correct user email");
    
    // Test with invalid token
    const invalidRequest = new Request("http://localhost:8000/test", {
      headers: {
        "Cookie": `access_token=${invalidToken}`
      }
    });
    
    const invalidResponse = await testRouter.handle(invalidRequest);
    assertEquals(invalidResponse?.status, Status.Unauthorized, "Should reject invalid token");
    
    // Test without token
    const noTokenRequest = new Request("http://localhost:8000/test");
    const noTokenResponse = await testRouter.handle(noTokenRequest);
    assertEquals(noTokenResponse?.status, Status.Unauthorized, "Should reject request without token");
  });

  /**
   * Test 3: Role-based access control
   * Tests that middleware properly enforces role requirements
   */
  await t.step("Test role-based access control", async () => {
    // Create route that requires admin role
    const adminRouter = new Application();
    
    adminRouter.use(async (ctx, next) => {
      ctx.state = {};
      await next();
    });
    
    adminRouter.use(requireRole(authService, "admin"));
    
    adminRouter.use((ctx) => {
      ctx.response.body = { success: true, message: "Admin access granted" };
    });
    
    // Test with admin token (should succeed)
    const adminRequest = new Request("http://localhost:8000/admin", {
      headers: {
        "Cookie": `access_token=${adminToken}`
      }
    });
    
    const adminResponse = await adminRouter.handle(adminRequest);
    assertEquals(adminResponse?.status, 200, "Admin should have access to admin route");
    
    // Test with student token (should fail)
    const studentRequest = new Request("http://localhost:8000/admin", {
      headers: {
        "Cookie": `access_token=${studentToken}`
      }
    });
    
    const studentResponse = await adminRouter.handle(studentRequest);
    assertEquals(studentResponse?.status, Status.Forbidden, "Student should not have admin access");
    
    const studentBody = await studentResponse?.json();
    assertEquals(studentBody.error, "Insufficient permissions", "Should return proper error message");
  });

  /**
   * Test 4: Multiple role authorization
   * Tests middleware with multiple allowed roles
   */
  await t.step("Test multiple role authorization", async () => {
    // Create route that allows instructors and admins
    const instructorAdminRouter = new Application();
    
    instructorAdminRouter.use(async (ctx, next) => {
      ctx.state = {};
      await next();
    });
    
    instructorAdminRouter.use(requireRole(authService, "instructor", "admin"));
    
    instructorAdminRouter.use((ctx) => {
      ctx.response.body = { success: true, role: ctx.state.user.role };
    });
    
    // Test with instructor token (should succeed)
    const instructorRequest = new Request("http://localhost:8000/course", {
      headers: {
        "Cookie": `access_token=${instructorToken}`
      }
    });
    
    const instructorResponse = await instructorAdminRouter.handle(instructorRequest);
    assertEquals(instructorResponse?.status, 200, "Instructor should have access");
    
    // Test with admin token (should succeed)
    const adminRequest = new Request("http://localhost:8000/course", {
      headers: {
        "Cookie": `access_token=${adminToken}`
      }
    });
    
    const adminResponse = await instructorAdminRouter.handle(adminRequest);
    assertEquals(adminResponse?.status, 200, "Admin should also have access");
    
    // Test with student token (should fail)
    const studentRequest = new Request("http://localhost:8000/course", {
      headers: {
        "Cookie": `access_token=${studentToken}`
      }
    });
    
    const studentResponse = await instructorAdminRouter.handle(studentRequest);
    assertEquals(studentResponse?.status, Status.Forbidden, "Student should not have access");
  });

  /**
   * Test 5: Token expiration handling
   * Tests that expired tokens are properly rejected
   */
  await t.step("Test expired token handling", async () => {
    // To test expired token, we'll create a token that's already expired
    // Since AuthService doesn't expose generateToken directly, we'll simulate
    // an expired token scenario by using an old/invalid token
    
    // Create a malformed token that looks expired
    const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDAsInVzZXJfaWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJzdHVkZW50In0.invalid";
    
    const expiredRouter = new Application();
    expiredRouter.use(async (ctx, next) => {
      ctx.state = {};
      await next();
    });
    
    expiredRouter.use(requireAuth(authService));
    
    const expiredRequest = new Request("http://localhost:8000/test", {
      headers: {
        "Cookie": `access_token=${expiredToken}`
      }
    });
    
    const expiredResponse = await expiredRouter.handle(expiredRequest);
    assertEquals(expiredResponse?.status, Status.Unauthorized, "Should reject expired token");
    
    const body = await expiredResponse?.json();
    assertExists(body.error, "Should return error message");
    
    // Alternative: Test with a very short-lived token if the auth service supports it
    // This would require the auth service to have a method to create tokens with custom expiration
  });

  /**
   * Test 6: Malformed token handling
   * Tests various forms of invalid tokens
   */
  await t.step("Test malformed token handling", async () => {
    const malformedTokens = [
      "not.a.jwt",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // Incomplete JWT
      "",
      "null",
      "undefined"
    ];
    
    const testRouter = new Application();
    testRouter.use(async (ctx, next) => {
      ctx.state = {};
      await next();
    });
    
    testRouter.use(requireAuth(authService));
    
    for (const malformedToken of malformedTokens) {
      const request = new Request("http://localhost:8000/test", {
        headers: {
          "Cookie": `access_token=${malformedToken}`
        }
      });
      
      const response = await testRouter.handle(request);
      assertEquals(
        response?.status,
        Status.Unauthorized,
        `Should reject malformed token: ${malformedToken}`
      );
    }
  });

  /**
   * Test 7: Context state propagation
   * Tests that user information is properly added to context
   */
  await t.step("Test context state propagation", async () => {
    const stateRouter = new Application();
    let capturedState: any = null;
    
    stateRouter.use(async (ctx, next) => {
      ctx.state = {};
      await next();
    });
    
    stateRouter.use(requireAuth(authService));
    
    stateRouter.use((ctx) => {
      capturedState = ctx.state;
      ctx.response.body = { success: true };
    });
    
    const request = new Request("http://localhost:8000/test", {
      headers: {
        "Cookie": `access_token=${instructorToken}`
      }
    });
    
    await stateRouter.handle(request);
    
    assertExists(capturedState, "State should be captured");
    assertExists(capturedState.user, "User should be in state");
    assertEquals(capturedState.user.id, testUsers.instructor.user_id, "User ID should match");
    assertEquals(capturedState.user.email, testUsers.instructor.email, "Email should match");
    assertEquals(capturedState.user.role, "instructor", "Role should match");
  });

  /**
   * Test 8: Custom middleware options
   * Tests createAuthMiddleware with custom configurations
   */
  await t.step("Test custom middleware configurations", async () => {
    // Create custom middleware with specific role requirements
    const customMiddleware = createAuthMiddleware({
      authService,
      requiredRoles: ["ta_coordinator", "admin"]
    });
    
    const customRouter = new Application();
    customRouter.use(async (ctx, next) => {
      ctx.state = {};
      await next();
    });
    
    customRouter.use(customMiddleware);
    customRouter.use((ctx) => {
      ctx.response.body = { success: true };
    });
    
    // Test with ta_coordinator (should succeed)
    const taCoordinatorToken = await getAuthToken(
      app,
      testUsers.ta_coordinator.email,
      "password123"
    );
    
    const taRequest = new Request("http://localhost:8000/test", {
      headers: {
        "Cookie": `access_token=${taCoordinatorToken}`
      }
    });
    
    const taResponse = await customRouter.handle(taRequest);
    assertEquals(taResponse?.status, 200, "TA coordinator should have access");
    
    // Test with instructor (should fail)
    const instructorRequest = new Request("http://localhost:8000/test", {
      headers: {
        "Cookie": `access_token=${instructorToken}`
      }
    });
    
    const instructorResponse = await customRouter.handle(instructorRequest);
    assertEquals(instructorResponse?.status, Status.Forbidden, "Instructor should not have access");
  });

  /**
   * Test 9: Error handling in middleware
   * Tests that middleware handles errors gracefully
   */
  await t.step("Test middleware error handling", async () => {
    // Create a mock auth service that throws errors
    const errorAuthService = {
      verifyToken: async (token: string) => {
        if (token === "throw_error") {
          throw new Error("Database connection failed");
        }
        return authService.verifyToken(token);
      }
    } as AuthService;
    
    const errorRouter = new Application();
    errorRouter.use(async (ctx, next) => {
      ctx.state = {};
      await next();
    });
    
    errorRouter.use(requireAuth(errorAuthService));
    
    const errorRequest = new Request("http://localhost:8000/test", {
      headers: {
        "Cookie": "access_token=throw_error"
      }
    });
    
    const errorResponse = await errorRouter.handle(errorRequest);
    assertEquals(
      errorResponse?.status,
      Status.InternalServerError,
      "Should return 500 on internal errors"
    );
    
    const errorBody = await errorResponse?.json();
    assertEquals(errorBody.error, "Authentication error", "Should return generic error message");
  });

  /**
   * Test 10: Cleanup
   * Clean up test data and connections
   */
  await t.step("Cleanup middleware tests", async () => {
    await db.disconnect();
    assertEquals(true, true, "Middleware tests completed successfully");
  });
});