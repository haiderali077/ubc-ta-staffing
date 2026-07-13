import { Application, hashPassword, Router } from "../../../deps.ts";
import { Database, getDatabaseConfig } from "../../database/config.ts";
import { AllocationModel } from "../../database/models/allocation.ts";
import { ApplicationModel } from "../../database/models/application.ts";
import { AuditLogModel } from "../../database/models/auditLog.ts";
import { CourseModel } from "../../database/models/course.ts";
import { ExportModel } from "../../database/models/export.ts";
import { LabSectionModel } from "../../database/models/labSection.ts";
import { ProfileModel } from "../../database/models/profile.ts";
import { TARecommendationModel } from "../../database/models/recommendation.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import { TANeedModel } from "../../database/models/taNeed.ts";
import { TermModel } from "../../database/models/term.ts";
import { UserModel } from "../../database/models/user.ts";
import { SchemaManager } from "../../database/schema.ts";
import {
  adminRouter,
  initializeAdminMiddleware,
  setAdminAuthService,
} from "../routes/adminRouter.ts";
import {
  applicationRouter,
  setApplicationModels,
} from "../routes/applicationRouter.ts";
import { authRouter, setAuthService } from "../routes/auth.ts";
import {
  courseRouter,
  setCourseAuthService,
  setCourseModel,
} from "../routes/courseRouter.ts";
import {
  recommendationRouter,
  setRecommendationDependencies,
} from "../routes/recommendationRouter.ts";
import {
  profileRouter,
  setupProfileRoutes,
} from "../routes/studentProfile/index.ts";
import {
  setExportModel,
  setTACoordinatorModels,
  taCoordinatorRouter,
} from "../routes/taCoordinatorRouter.ts";
import { taNeedRouter } from "../routes/taNeedRouter.ts";
import { AuditLogger } from "../services/auditLogger.ts";
import { AuthService } from "../services/auth.ts";
import { NotificationService } from "../services/notification.ts";
import { getTestData } from "./fixtures.ts";

// Test environment configuration
const TEST_JWT_SECRET = "test-secret-key-" + crypto.randomUUID();
const TEST_REFRESH_SECRET = "test-refresh-secret-" + crypto.randomUUID();

// Set test JWT secrets before any tests run
Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);
Deno.env.set("REFRESH_SECRET", TEST_REFRESH_SECRET);

/**
 * Test database connection manager
 * Handles database lifecycle for tests
 */
export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private databases = new Map<string, Database>();
  private schemaManager?: SchemaManager;

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  async createDatabase(name = "default"): Promise<Database> {
    if (this.databases.has(name)) {
      const existingDb = this.databases.get(name)!;
      // Test if connection is still valid
      try {
        await existingDb.query("SELECT 1");
        return existingDb;
      } catch (error) {
        console.log(`Database connection ${name} is stale, creating new one`);
        this.databases.delete(name);
      }
    }

    const config = getDatabaseConfig();
    const db = new Database(config);

    // Retry connection with exponential backoff
    let retries = 5;
    let delay = 1000;

    while (retries > 0) {
      try {
        await db.connect();
        console.log(`✅ Database connection ${name} established successfully`);
        this.databases.set(name, db);
        return db;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(
            `❌ Failed to connect to database ${name} after 5 attempts:`,
            error
          );
          throw error;
        }
        console.log(
          `⏳ Database connection ${name} failed, retrying in ${delay}ms... (${retries} attempts left)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new Error(`Failed to create database connection ${name}`);
  }

  async getDatabase(name = "default"): Promise<Database> {
    const db = this.databases.get(name);
    if (!db) {
      throw new Error(
        `Database ${name} not found. Create it first with createDatabase()`
      );
    }
    return db;
  }

  // Generate unique database name for each test
  private generateUniqueName(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async resetDatabase(name = "default"): Promise<void> {
    const db = await this.getDatabase(name);
    if (!this.schemaManager) {
      this.schemaManager = new SchemaManager(db);
    }

    try {
      // First, disable foreign key checks to allow clean deletion
      await db.query("SET session_replication_role = replica;");

      // Drop all tables and recreate
      await this.schemaManager.dropAllTables();
      await this.schemaManager.createAllTables();

      // Re-enable foreign key checks
      await db.query("SET session_replication_role = DEFAULT;");
    } catch (error) {
      console.warn("Database reset encountered error:", error);
      // Try alternative cleanup method
      await this.cleanupTableData(db);
    }
  }

  private async cleanupTableData(db: Database): Promise<void> {
    // Clean up tables in reverse dependency order to avoid foreign key violations
    const cleanupOrder = [
      "ta_allocations",
      "ta_needs",
      "application_rankings",
      "ta_applications",
      "professor_references",
      "student_profiles",
      "lab_sections",
      "courses",
      "course_templates",
      "user_profiles",
      "refresh_tokens",
      "password_reset_tokens",
      "users",
      "terms",
      "departments",
      "system_settings",
      "notifications",
      "user_notification_preferences",
      "audit_logs",
      "system_usage_metrics",
    ];

    for (const table of cleanupOrder) {
      try {
        await db.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      } catch (error) {
        // Ignore errors for tables that don't exist or can't be truncated
        console.log(`Could not truncate ${table}:`, (error as Error).message);
      }
    }
  }

  async cleanupDatabase(name = "default"): Promise<void> {
    const db = this.databases.get(name);
    if (db) {
      await db.disconnect();
      this.databases.delete(name);
    }
  }

  async cleanupAll(): Promise<void> {
    for (const [name] of this.databases) {
      await this.cleanupDatabase(name);
    }
  }
}

/**
 * Enhanced test application factory
 * Creates a fully configured test application with all routes and middleware
 */
export async function createTestApp(db: Database): Promise<Application> {
  if (!db) {
    throw new Error("Database connection is required to create test app");
  }

  try {
    // Test database connection before proceeding
    await db.query("SELECT 1");
    console.log("🔗 Database connection verified for app creation");
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    throw new Error(`Database connection is not working: ${error}`);
  }

  const app = new Application();

  try {
    console.log("🏗️ Initializing models and services...");

    // Initialize models with error handling
    const userModel = new UserModel(db);
    const courseModel = new CourseModel(db);
    const applicationModel = new ApplicationModel(db);
    const profileModel = new ProfileModel(db);
    const taNeedModel = new TANeedModel(db);
    const termModel = new TermModel(db);
    const allocationModel = new AllocationModel(db);
    const systemSettingsModel = new SystemSettingsModel(db);
    const notificationService = new NotificationService(db);
    const labSectionModel = new LabSectionModel(db);
    const exportModel = new ExportModel(db);
    const auditLogModel = new AuditLogModel(db);
    const recommendationModel = new TARecommendationModel(db);

    // Initialize services
    const authService = new AuthService(db);
    const auditLogger = new AuditLogger(db);

    console.log("🔧 Configuring routers...");

    // Configure routers with dependencies
    setAuthService(authService);
    setApplicationModels(
      applicationModel,
      courseModel,
      systemSettingsModel,
      authService,
      notificationService,
      termModel,
      auditLogModel
    );
    setCourseModel(courseModel);
    setCourseAuthService(authService);
    setupProfileRoutes(profileRouter, db);
    setTACoordinatorModels(
      termModel,
      courseModel,
      authService,
      userModel,
      taNeedModel,
      applicationModel,
      allocationModel,
      labSectionModel,
      auditLogger,
      notificationService
    );
    setAdminAuthService(authService);
    initializeAdminMiddleware(authService);
    setExportModel(exportModel);
    setRecommendationDependencies(
      recommendationModel,
      courseModel,
      authService
    );

    console.log("🛣️ Adding routes...");

    // Add routes with error handling
    app.use(authRouter.routes());
    app.use(authRouter.allowedMethods());
    app.use(applicationRouter.routes());
    app.use(applicationRouter.allowedMethods());
    app.use(courseRouter.routes());
    app.use(courseRouter.allowedMethods());
    app.use(profileRouter.routes());
    app.use(profileRouter.allowedMethods());
    app.use(taCoordinatorRouter.routes());
    app.use(taCoordinatorRouter.allowedMethods());
    app.use(taNeedRouter.routes());
    app.use(taNeedRouter.allowedMethods());

    // Add recommendation router with /api prefix
    const prefixedRecommendationRouter = new Router({
      prefix: "/api",
    });
    prefixedRecommendationRouter.use(recommendationRouter.routes());
    prefixedRecommendationRouter.use(recommendationRouter.allowedMethods());
    app.use(prefixedRecommendationRouter.routes());
    app.use(prefixedRecommendationRouter.allowedMethods());

    app.use(adminRouter.routes());
    app.use(adminRouter.allowedMethods());

    // Enhanced error handling middleware
    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        console.error("Test app error:", err);

        // Set appropriate status based on error type
        if (err && typeof err === "object" && "status" in err) {
          ctx.response.status = (err as any).status || 500;
        } else {
          ctx.response.status = 500;
        }

        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message?: string }).message
            : String(err);
        ctx.response.body = {
          error: "Test app error",
          message,
          status: ctx.response.status,
        };
      }
    });

    console.log("✅ Test application created successfully");
    return app;
  } catch (error) {
    console.error("❌ Failed to create test app:", error);
    throw new Error(`Failed to create test application: ${error}`);
  }
}

/**
 * Enhanced database setup with data seeding
 */
export async function setupTestDatabase(
  options: {
    reset?: boolean;
    seedData?: boolean;
    databaseName?: string;
    maxRetries?: number;
  } = {}
): Promise<Database> {
  const {
    reset = true,
    seedData = true,
    databaseName = "default",
    maxRetries = 3,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📊 Setting up test database (attempt ${attempt}/${maxRetries})`
      );

      const dbManager = TestDatabaseManager.getInstance();
      const db = await dbManager.createDatabase(databaseName);

      if (reset) {
        console.log(`🔄 Resetting database schema...`);
        await dbManager.resetDatabase(databaseName);
      }

      if (seedData) {
        console.log(`🌱 Seeding test data...`);
        await seedTestData(db);
      }

      console.log(`✅ Test database setup completed successfully`);
      return db;
    } catch (error) {
      lastError = error as Error;
      console.log(`⚠️ Database setup attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Increasing delay
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(
    `❌ Failed to setup test database after ${maxRetries} attempts`
  );
  throw lastError || new Error("Database setup failed");
}

/**
 * Seed database with comprehensive test data
 */
export async function seedTestData(db: Database): Promise<void> {
  // Clear all tables before seeding
  const schemaManager = new SchemaManager(db);

  console.log("Dropping all tables...");
  await schemaManager.dropAllTables();
  console.log("Creating all tables...");
  await schemaManager.createAllTables();

  // Check that users table is empty
  try {
    const result = await db.query("SELECT COUNT(*) AS count FROM users");
    const count = result?.rows?.[0]?.count ?? "unknown";
    console.log(`Users table row count after reset: ${count}`);
  } catch (err) {
    console.warn(
      "Could not check users table row count:",
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log("Seeding test data...");

  const users = getTestData("users") as Record<string, any>;
  const terms = getTestData("terms") as Record<string, any>;
  const departments = getTestData("departments") as Record<string, any>;
  const courses = getTestData("courses") as Record<string, any>;

  // Hash passwords for all users before insertion
  const { hashPassword } = await import("../../../deps.ts");

  // Step 1: Check and insert departments if needed
  console.log("Inserting departments...");

  // First, check if departments already exist
  const existingDepts = await db.query("SELECT dept_id, name FROM departments");
  const existingDeptNames = new Set(
    existingDepts?.rows?.map((d) => d.name) || []
  );

  console.log(
    `Found ${existingDeptNames.size} existing departments: ${Array.from(
      existingDeptNames
    ).join(", ")}`
  );

  // Only insert departments that don't exist
  for (const dept of Object.values(departments)) {
    if (!existingDeptNames.has(dept.name)) {
      try {
        await db.query("INSERT INTO departments (name) VALUES ($1)", [
          dept.name,
        ]);
        console.log(`✅ Inserted department: ${dept.name}`);
      } catch (error) {
        console.log(`⚠️ Failed to insert department ${dept.name}:`, error);
      }
    } else {
      console.log(`⏭️ Department ${dept.name} already exists, skipping`);
    }
  }

  // Step 2: Check and insert terms if needed
  console.log("Inserting terms...");

  const existingTerms = await db.query("SELECT term_id, name FROM terms");
  const existingTermNames = new Set(
    existingTerms?.rows?.map((t) => t.name) || []
  );

  console.log(
    `Found ${existingTermNames.size} existing terms: ${Array.from(
      existingTermNames
    ).join(", ")}`
  );

  for (const term of Object.values(terms)) {
    if (!existingTermNames.has(term.name)) {
      try {
        await db.query(
          "INSERT INTO terms (name, start_date, end_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            term.name,
            term.start_date,
            term.end_date,
            term.status,
            term.created_at,
            term.updated_at,
          ]
        );
        console.log(`✅ Inserted term: ${term.name}`);
      } catch (error) {
        console.log(`⚠️ Failed to insert term ${term.name}:`, error);
      }
    } else {
      console.log(`⏭️ Term ${term.name} already exists, skipping`);
    }
  }

  // Step 3: Check and insert users if needed
  console.log("Inserting users...");

  const existingUsers = await db.query("SELECT user_id, email FROM users");
  const existingUserEmails = new Set(
    existingUsers?.rows?.map((u) => u.email) || []
  );

  console.log(
    `Found ${existingUserEmails.size} existing users: ${Array.from(
      existingUserEmails
    ).join(", ")}`
  );

  for (const user of Object.values(users)) {
    if (!existingUserEmails.has(user.email)) {
      try {
        // Hash the password if it hasn't been hashed yet
        let passwordHash = user.password_hash;
        if (
          user.password &&
          (!passwordHash ||
            passwordHash.startsWith("$2b$10$YourHashedPasswordHere"))
        ) {
          passwordHash = await hashPassword(user.password);
        }

        await db.query(
          `INSERT INTO users (name, email, password_hash, role, major, student_number, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            user.name,
            user.email,
            passwordHash,
            user.role,
            user.major,
            user.student_number ?? null,
            user.is_active ?? true,
            user.created_at,
            user.updated_at,
          ]
        );
        console.log(`✅ Inserted user: ${user.email} (${user.role})`);
      } catch (error) {
        console.log(`⚠️ Failed to insert user ${user.email}:`, error);
      }
    } else {
      console.log(`⏭️ User ${user.email} already exists, skipping`);
    }
  }

  // Step 4: Get actual user IDs from database to use as foreign keys
  console.log("Fetching user IDs for course assignments...");
  const instructorResult = await db.query(
    "SELECT user_id, email FROM users WHERE role = 'instructor' ORDER BY user_id LIMIT 1"
  );
  let instructorId = 1; // Default fallback

  if (instructorResult?.rows && instructorResult.rows.length > 0) {
    instructorId = instructorResult.rows[0].user_id;
    console.log(`Using instructor ID ${instructorId} for courses`);
  } else {
    console.warn("No instructor found, using default instructor_id = 1");
  }

  // Step 5: Check and insert courses if needed
  console.log("Inserting courses...");

  const existingCourses = await db.query("SELECT course_id, code FROM courses");
  const existingCourseCodes = new Set(
    existingCourses?.rows?.map((c) => c.code) || []
  );

  console.log(
    `Found ${existingCourseCodes.size} existing courses: ${Array.from(
      existingCourseCodes
    ).join(", ")}`
  );

  for (const course of Object.values(courses)) {
    if (!existingCourseCodes.has(course.course_code)) {
      try {
        // Use the actual instructor ID from the database, or the one specified in test data
        const courseInstructorId = course.instructor_id || instructorId;

        await db.query(
          `INSERT INTO courses (code, title, term, instructor_id, dept_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            course.course_code,
            course.course_name,
            course.term_id,
            courseInstructorId,
            course.dept_id,
            course.created_at,
            course.updated_at,
          ]
        );
        console.log(`✅ Inserted course: ${course.course_code}`);
      } catch (error) {
        console.log(`⚠️ Failed to insert course ${course.course_code}:`, error);
      }
    } else {
      console.log(`⏭️ Course ${course.course_code} already exists, skipping`);
    }
  }

  console.log("Test data seeding completed successfully");
}

/**
 * Enhanced authentication token helper
 */
export async function getAuthToken(
  app: Application,
  email: string,
  password: string,
  options: { expectSuccess?: boolean; returnResponse?: boolean } = {}
): Promise<string> {
  const { expectSuccess = true, returnResponse = false } = options;

  const response = await app.handle(
    new Request("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );

  if (expectSuccess && (!response || response.status !== 200)) {
    throw new Error(`Authentication failed: ${response?.status} for ${email}`);
  }

  const cookies = response?.headers.get("Set-Cookie") || "";
  const accessTokenMatch = cookies.match(/access_token=([^;]+)/);

  if (expectSuccess && !accessTokenMatch) {
    throw new Error(`No access token found in response for ${email}`);
  }

  return accessTokenMatch?.[1] || "";
}

/**
 * Enhanced test request helper with better error handling
 */
export async function makeTestRequest(
  app: Application,
  method: string,
  path: string,
  token?: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ response: Response | undefined; data: any }> {
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Cookie"] = `access_token=${token}`;
  }

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await app.handle(
    new Request(`http://localhost:8000${path}`, requestInit)
  );

  let data: any = null;
  if (response) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        data = await response.json();
      } catch (err) {
        console.warn("Failed to parse JSON response:", err);
        data = { error: "Failed to parse response" };
      }
    } else {
      data = await response.text();
    }
  }

  return { response, data };
}

/**
 * Test data validation helpers
 */
export function validateTestUser(user: any, expectedRole?: string): void {
  if (!user) throw new Error("User is null or undefined");
  if (!user.email) throw new Error("User missing email");
  if (!user.role) throw new Error("User missing role");
  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`Expected role ${expectedRole}, got ${user.role}`);
  }
}

export function validateTestResponse(
  response: Response | undefined,
  expectedStatus: number
): void {
  if (!response) throw new Error("Response is undefined");
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

/**
 * Test cleanup utilities
 */
export async function cleanupTestDatabase(
  databaseName = "default"
): Promise<void> {
  const dbManager = TestDatabaseManager.getInstance();
  await dbManager.cleanupDatabase(databaseName);
}

export async function cleanupAllTestDatabases(): Promise<void> {
  const dbManager = TestDatabaseManager.getInstance();
  await dbManager.cleanupAll();
}

/**
 * Performance testing utilities
 */
export class TestPerformanceMonitor {
  private startTime: number;
  private checkpoints: Array<{ name: string; time: number; duration: number }> =
    [];

  constructor() {
    this.startTime = performance.now();
  }

  checkpoint(name: string): void {
    const now = performance.now();
    const duration =
      now -
      (this.checkpoints[this.checkpoints.length - 1]?.time || this.startTime);
    this.checkpoints.push({ name, time: now, duration });
  }

  getTotalDuration(): number {
    return performance.now() - this.startTime;
  }

  getReport(): string {
    const total = this.getTotalDuration();
    let report = `Performance Report (Total: ${total.toFixed(2)}ms)\n`;
    report += "=".repeat(50) + "\n";

    for (const checkpoint of this.checkpoints) {
      const percentage = ((checkpoint.duration / total) * 100).toFixed(1);
      report += `${checkpoint.name}: ${checkpoint.duration.toFixed(
        2
      )}ms (${percentage}%)\n`;
    }

    return report;
  }
}

/**
 * Mock factory utilities for testing
 */
export class TestMockFactory {
  static createMockUser(overrides: Partial<any> = {}): any {
    return {
      id: Math.floor(Math.random() * 10000),
      email: `test${Date.now()}@student.ubc.ca`,
      name: "Test User",
      role: "student",
      major: "Computer Science",
      password_hash: "$2b$10$hashedpassword",
      ...overrides,
    };
  }

  static createMockCourse(overrides: Partial<any> = {}): any {
    return {
      id: Math.floor(Math.random() * 10000),
      course_code: `TEST${Math.floor(Math.random() * 1000)}`,
      course_name: "Test Course",
      dept_id: 1,
      term_id: 1,
      ...overrides,
    };
  }

  static createMockApplication(overrides: Partial<any> = {}): any {
    return {
      user_id: 1,
      course_id: 1,
      status: "pending",
      statement_of_interest: "Test interest statement",
      previous_experience: "Test experience",
      submitted_at: new Date().toISOString(),
      ...overrides,
    };
  }
}

/**
 * Test environment utilities
 */
export function isTestEnvironment(): boolean {
  return Deno.env.get("DENO_ENV") === "test";
}

export function requireTestEnvironment(): void {
  if (!isTestEnvironment()) {
    throw new Error("This function can only be called in test environment");
  }
}

/**
 * Test timeout utilities
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Test timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Standardized test setup for all test files
 */
export async function setupStandardTest(
  options: {
    testName: string;
    maxRetries?: number;
    seedData?: boolean;
    databaseName?: string;
  } = { testName: "Generic Test" }
): Promise<{
  db: Database;
  app: Application;
}> {
  const {
    testName,
    maxRetries = 5,
    seedData = true,
    databaseName = "default",
  } = options;

  console.log(`🔧 Setting up ${testName} test environment...`);

  let db: Database | null = null;
  let app: Application | null = null;

  try {
    console.log("📊 Initializing test database...");
    db = await setupTestDatabase({ maxRetries, seedData, databaseName });

    if (!db) {
      throw new Error("Database initialization returned null");
    }

    console.log("🏗️ Creating test application...");
    app = await createTestApp(db);

    if (!app) {
      throw new Error("Test application creation returned null");
    }

    console.log(`✅ ${testName} test environment setup completed successfully`);
    return { db, app };
  } catch (error) {
    console.error(`❌ ${testName} setup failed:`, error);

    // Cleanup partial setup
    if (db) {
      try {
        await db.disconnect();
      } catch (cleanupError) {
        console.warn("Cleanup error:", cleanupError);
      }
    }

    throw error;
  }
}

/**
 * Standardized test validation helper
 */
export function validateTestSetup(
  db: Database | null,
  app: Application | null,
  testName: string
): void {
  if (!db) {
    throw new Error(`Database is not initialized - ${testName} setup failed`);
  }

  if (!app) {
    throw new Error(
      `Application is not initialized - ${testName} setup failed`
    );
  }
}

/**
 * Database transaction test helpers
 */
export async function withTestTransaction<T>(
  db: Database,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  await db.query("BEGIN");
  try {
    const result = await callback(db);
    await db.query("ROLLBACK"); // Always rollback in tests
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

// Debug helpers for admin.test.ts and other test files
// Add this to test_utils.ts or create as separate debug file
/**
 * Enhanced getAuthToken with better debugging
 */
export async function getAuthTokenWithDebug(
  app: Application,
  email: string,
  password: string
): Promise<string> {
  console.log(`🔑 Attempting authentication for: ${email}`);

  try {
    const response = await app.handle(
      new Request("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
    );

    console.log(`📊 Login response status: ${response?.status}`);

    if (!response) {
      throw new Error("No response received from login endpoint");
    }

    if (response.status !== 200) {
      const errorBody = await response.text();
      console.error(
        `❌ Login failed with status ${response.status}: ${errorBody}`
      );
      throw new Error(`Authentication failed: ${response.status} for ${email}`);
    }

    const responseBody = await response.json();
    console.log(
      "📄 Login response body:",
      JSON.stringify(responseBody, null, 2)
    );

    const cookies = response.headers.get("Set-Cookie") || "";
    console.log("🍪 Response cookies:", cookies);

    const accessTokenMatch = cookies.match(/access_token=([^;]+)/);

    if (!accessTokenMatch) {
      console.error("❌ No access token found in cookies");
      throw new Error(`No access token found in response for ${email}`);
    }

    const token = accessTokenMatch[1];
    console.log(
      `✅ Successfully extracted token for ${email}: ${token.substring(
        0,
        20
      )}...`
    );

    return token;
  } catch (error) {
    console.error(`❌ getAuthToken failed for ${email}:`, error);
    throw error;
  }
}

/**
 * Verify that a user exists in the database with correct credentials
 */
export async function verifyUserInDatabase(
  db: Database,
  email: string,
  expectedPassword: string
): Promise<boolean> {
  console.log(`🔍 Verifying user ${email} exists in database`);

  try {
    const userModel = new UserModel(db);
    const user = await userModel.getUserByEmail(email);

    if (!user) {
      console.error(`❌ User ${email} not found in database`);
      return false;
    }

    console.log(
      `✅ User found: ID=${user.user_id}, Role=${user.role}, Active=${user.is_active}`
    );

    // Try to verify password
    const authService = new AuthService(db);
    const loginResult = await authService.login(email, expectedPassword);

    if (loginResult.success) {
      console.log(`✅ Password verification successful for ${email}`);
      return true;
    } else {
      console.error(
        `❌ Password verification failed for ${email}: ${loginResult.error}`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Database verification failed for ${email}:`, error);
    return false;
  }
}

/**
 * Create or ensure admin user exists with proper credentials
 */
export async function ensureAdminUserExists(
  db: Database,
  adminEmail: string,
  adminPassword: string,
  adminName: string = "Test Admin"
): Promise<any> {
  console.log(`👤 Ensuring admin user exists: ${adminEmail}`);

  const userModel = new UserModel(db);

  try {
    // Check if user already exists
    let existingUser = await userModel.getUserByEmail(adminEmail);

    if (existingUser) {
      console.log(
        `✅ Admin user already exists with ID: ${existingUser.user_id}`
      );

      // Verify password works
      const authService = new AuthService(db);
      const loginResult = await authService.login(adminEmail, adminPassword);

      if (loginResult.success) {
        console.log(`✅ Existing admin user credentials verified`);
        return existingUser;
      } else {
        console.warn(
          `⚠️ Existing admin user has incorrect password, updating...`
        );
        // Update password hash
        const newPasswordHash = await hashPassword(adminPassword);
        // Note: You might need to implement updateUserPassword in UserModel
        // For now, we'll delete and recreate the user
        await userModel.deleteUser(existingUser.user_id!);
        existingUser = null;
      }
    }

    if (!existingUser) {
      console.log(`📝 Creating new admin user: ${adminEmail}`);

      const adminData = {
        name: adminName,
        email: adminEmail,
        password_hash: await hashPassword(adminPassword),
        role: "admin" as const,
        is_active: true,
      };

      const newUser = await userModel.createUser(adminData);
      console.log(`✅ Admin user created with ID: ${newUser.user_id}`);

      // Verify the new user can authenticate
      const authService = new AuthService(db);
      const loginResult = await authService.login(adminEmail, adminPassword);

      if (!loginResult.success) {
        throw new Error(
          `Failed to verify newly created admin user: ${loginResult.error}`
        );
      }

      console.log(`✅ New admin user authentication verified`);
      return newUser;
    }
  } catch (error) {
    console.error(`❌ Failed to ensure admin user exists:`, error);
    throw error;
  }
}

/**
 * Debug test environment setup
 */
export async function debugTestEnvironment() {
  console.log("🔧 Debugging test environment...");

  // Check environment variables
  const jwtSecret = Deno.env.get("JWT_SECRET");
  const refreshSecret = Deno.env.get("REFRESH_SECRET");
  const denoEnv = Deno.env.get("DENO_ENV");

  console.log(`📝 DENO_ENV: ${denoEnv}`);
  console.log(
    `📝 JWT_SECRET: ${
      jwtSecret ? `Set (${jwtSecret.length} chars)` : "Not set"
    }`
  );
  console.log(
    `📝 REFRESH_SECRET: ${
      refreshSecret ? `Set (${refreshSecret.length} chars)` : "Not set"
    }`
  );

  if (!jwtSecret || !refreshSecret) {
    console.warn(
      "⚠️ Missing JWT secrets - this could cause authentication issues"
    );
  }

  console.log("✅ Environment check complete");
}

/**
 * Test the /auth/login endpoint directly
 */
export async function testLoginEndpoint(
  app: Application,
  email: string,
  password: string
): Promise<void> {
  console.log(`🧪 Testing login endpoint directly for: ${email}`);

  try {
    const response = await app.handle(
      new Request("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
    );

    console.log(`📊 Response status: ${response?.status}`);
    console.log(
      `📊 Response headers:`,
      Object.fromEntries(response?.headers || [])
    );

    if (response) {
      const responseText = await response.text();
      console.log(`📄 Response body: ${responseText}`);

      try {
        const responseJson = JSON.parse(responseText);
        console.log(`📊 Parsed response:`, responseJson);
      } catch (e) {
        console.log(`⚠️ Response is not valid JSON`);
      }
    }
  } catch (error) {
    console.error(`❌ Login endpoint test failed:`, error);
  }
}

/**
 * Enhanced setup function that includes all debugging
 */
export async function setupAdminTestWithDebug(
  setupTestDatabase: () => Promise<Database>,
  createTestApp: (db: Database) => Promise<Application>,
  getTestData: (type: string) => any
): Promise<{
  db: Database;
  app: Application;
  adminToken: string;
  testUsers: any;
}> {
  console.log("🔧 Starting enhanced admin test setup...");

  // Debug environment
  await debugTestEnvironment();

  // Setup database and app
  const db = await setupTestDatabase();
  const app = await createTestApp(db);

  // Get test data
  const testUsers = getTestData("users");
  console.log("📄 Available test users:", Object.keys(testUsers));

  // Ensure admin user exists
  const adminUser = await ensureAdminUserExists(
    db,
    testUsers.admin.email,
    testUsers.admin.password,
    testUsers.admin.name
  );

  // Verify database state
  const isVerified = await verifyUserInDatabase(
    db,
    testUsers.admin.email,
    testUsers.admin.password
  );

  if (!isVerified) {
    throw new Error("Admin user verification failed");
  }

  // Test login endpoint
  await testLoginEndpoint(app, testUsers.admin.email, testUsers.admin.password);

  // Get authentication token
  const adminToken = await getAuthTokenWithDebug(
    app,
    testUsers.admin.email,
    testUsers.admin.password
  );

  console.log("✅ Enhanced admin test setup complete");

  return {
    db,
    app,
    adminToken,
    testUsers,
  };
}
