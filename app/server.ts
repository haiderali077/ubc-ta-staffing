import {
    Application,
    Context,
    Router,
    Status,
    getEnvConfig,
    oakCors,
    send,
} from "./deps.ts";
import {
    exportRouter,
    setExportDependencies,
} from "./src/backend/routes/exportRouter.ts";
import { initializeDatabase } from "./src/database/init.ts";

import { setExportModel } from "./src/backend/routes/taCoordinatorRouter.ts";
import { ExportModel } from "./src/database/models/export.ts";

// Auth
import {
    adminRouter,
    initializeAdminMiddleware,
    setAdminAuthService,
    setAdminModels,
} from "./src/backend/routes/adminRouter.ts";
import { authRouter, setAuthService } from "./src/backend/routes/auth.ts";
import { AuditLogger } from "./src/backend/services/auditLogger.ts";
import { AuthService } from "./src/backend/services/auth.ts";

// TA Needs and Courses
import {
    courseRouter,
    setCourseAuthService,
    setCourseModel,
} from "./src/backend/routes/courseRouter.ts";
import {
    setTACoordinatorModels,
    taCoordinatorRouter,
} from "./src/backend/routes/taCoordinatorRouter.ts";
import {
    setTANeedModels,
    taNeedRouter,
} from "./src/backend/routes/taNeedRouter.ts";
import { AllocationModel } from "./src/database/models/allocation.ts";
import { ApplicationModel } from "./src/database/models/application.ts";
import { CourseModel } from "./src/database/models/course.ts";
import { LabSectionModel } from "./src/database/models/labSection.ts";
import { TANeedModel } from "./src/database/models/taNeed.ts";
import { TermModel } from "./src/database/models/term.ts";
import { UserModel } from "./src/database/models/user.ts";

// Applications and TA Experience
import {
    applicationRouter,
    setApplicationModels,
} from "./src/backend/routes/applicationRouter.ts";
import { setupTAExperienceRoutes } from "./src/backend/routes/taExperienceRouter.ts";

// Notifications, Assignments, Profiles
import {
    notificationRouter,
    setNotificationDependencies,
} from "./src/backend/routes/notificationRouter.ts";
import { NotificationService } from "./src/backend/services/notification.ts";
import { NotificationScheduler } from "./src/backend/services/notificationScheduler.ts";
import { NotificationModel } from "./src/database/models/notification.ts";

import { setupAssignmentRoutes } from "./src/backend/routes/assignmentRouter.ts";
import { setupProfileRoutes } from "./src/backend/routes/studentProfile/profileRouter.ts";

// Instructor routes
import {
    instructorRouter,
    setInstructorRouterDependencies,
} from "./src/backend/routes/instructorRouter.ts";

// Instructor Notifications
import {
    instructorNotificationRouter,
    setInstructorNotificationDependencies,
} from "./src/backend/routes/instructorNotificationRouter.ts";
import { InstructorNotificationScheduler } from "./src/backend/services/instructorNotificationScheduler.ts";
import { InstructorNotificationService } from "./src/backend/services/instructorNotificationService.ts";

// Audit logs
import {
    auditLogRouter,
    setAuditLogModels,
} from "./src/backend/routes/auditLogRouter.ts";
import { AuditLogModel } from "./src/database/models/auditLog.ts";

// GTA Exam Availability
import {
    gtaExamAvailabilityRouter,
    setGTAExamAvailabilityDependencies,
} from "./src/backend/routes/gtaExamAvailabilityRouter.ts";
import { GTAExamAvailabilityModel } from "./src/database/models/gtaExamAvailability.ts";

// System settings routes
import {
    setSystemSettingsModels,
    systemSettingsRouter,
} from "./src/backend/routes/systemSettingsRouter.ts";
import { SystemSettingsModel } from "./src/database/models/systemSettings.ts";

// Recommendation routes
import {
  recommendationRouter,
  setRecommendationDependencies,
} from "./src/backend/routes/recommendationRouter.ts";
import { TARecommendationModel } from "./src/database/models/recommendation.ts";

// Archive routes

import {
    archiveRouter,
    setArchiveDependencies,
} from "./src/backend/routes/archiveRouter.ts";
import { ArchiveModel } from "./src/database/models/archive.ts";

// import { archiveRouter, setArchiveDependencies } from "./src/backend/routes/archiveRouter.ts";
// import { ArchiveModel } from "./src/database/models/archive.ts";

// Conflict routes
import {
    conflictRouter,
    setConflictDependencies,
} from "./src/backend/routes/conflictRouter.ts";

//importing ProfileModel for GTA Exam Availability
import { ProfileModel } from "./src/database/models/profile.ts";

// Middleware


import { bulkUploadRouter } from "./src/backend/routes/bulkUploadRouter.ts";
import {
  passwordResetRouter,
  setPasswordResetDependencies,
} from "./src/backend/routes/passwordResetRouter.ts";

import {
    rateLimit,
    sanitizeInput,
} from "./src/database/middleware/security.ts";

// BigInt fix
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// Load environment variables
const envConfig = getEnvConfig();

const app = new Application();
const PORT = parseInt(globalThis.Deno?.env.get("PORT") || "8000");

// Determine if running in Docker
const isDocker =
  Deno.env.get("ENVIRONMENT") === "production" ||
  Deno.env.get("DB_HOST") === "database" ||
  Deno.env.get("DOCKER_CONTAINER") === "true";

const isLocalDeno = !isDocker;

console.log("\n" + "=".repeat(60));
console.log("🚀 ALLOCAID SERVER STARTUP");
console.log("=".repeat(60));
console.log(`📅 Started at: ${new Date().toISOString()}`);
console.log(
  `🔧 Runtime: ${isDocker ? "🐳 Docker Container" : "🦕 Local Deno"}`
);
console.log(`🌍 Environment: ${Deno.env.get("ENVIRONMENT") || "development"}`);
console.log(`🚪 Port: ${PORT}`);
console.log("=".repeat(60));

// Add this after database initialization
console.log("\n📊 Database Configuration:");
console.log(`   Host: ${Deno.env.get("DB_HOST") || "localhost"}`);
console.log(`   Port: ${Deno.env.get("DB_PORT") || "5432"}`);
console.log(`   Database: ${Deno.env.get("DB_NAME") || "allocaid_db"}`);
console.log(`   User: ${Deno.env.get("DB_USER") || "allocaid_user"}`);
console.log("=".repeat(60));

// Update the existing setTimeout block at the end of server.ts with this enhanced version:
setTimeout(() => {
  console.log("\n" + "🎉".repeat(30));
  console.log("\n" + "=".repeat(60));
  console.log("🚀 SERVER IS FULLY INITIALIZED AND READY!");
  console.log("=".repeat(60));

  // Runtime specific information
  if (isDocker) {
    console.log("🐳 Running in DOCKER CONTAINER");
    console.log("   - To view logs: docker-compose logs -f app");
    console.log("   - To stop: docker-compose stop app");
    console.log("   - Container name: allocaid-app");
  } else {
    console.log("🦕 Running with LOCAL DENO");
    console.log("   - Hot reload enabled (--watch)");
    console.log("   - To stop: Ctrl+C");
    console.log("   - Started with: deno task start");
  }

  console.log("=".repeat(60));
  console.log(`📍 Backend API: http://localhost:${PORT}`);
  console.log(`📍 Frontend: http://localhost:3000`);
  console.log(`📍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📍 pgAdmin: http://localhost:5050`);
  console.log("=".repeat(60));
  console.log("✅ All systems operational!");
  console.log("💡 OTP codes will appear in this console");

  if (isLocalDeno) {
    console.log("👀 Watching for file changes...");
  }

  // Process information
  console.log("\n📈 Process Information:");
  console.log(`   - PID: ${Deno.pid}`);
  console.log(`   - Deno Version: ${Deno.version.deno}`);
  console.log(`   - V8 Version: ${Deno.version.v8}`);
  console.log(`   - TypeScript: ${Deno.version.typescript}`);

  console.log("=".repeat(60));
  console.log("\n" + "🎉".repeat(30) + "\n");
}, 500);

// Initialize database
console.log("Initializing database...");
const database = await initializeDatabase();

// Auth Service
const authService = new AuthService(database);
setAuthService(authService); // For auth router
setAdminAuthService(authService); // For admin router
initializeAdminMiddleware(authService); // Initialize admin middleware

// Models
const taNeedModel = new TANeedModel(database);
const termModel = new TermModel(database);
const courseModel = new CourseModel(database);
const userModel = new UserModel(database);
const applicationModel = new ApplicationModel(database);
const allocationModel = new AllocationModel(database);
const exportModel = new ExportModel(database);
const auditLogModel = new AuditLogModel(database);
const labSectionModel = new LabSectionModel(database);
const systemSettingsModel = new SystemSettingsModel(database);
// Profile Model for GTA Exam Availability
const profileModel = new ProfileModel(database);

// Set up admin router dependencies
setAdminModels(userModel, applicationModel, auditLogModel);

// GTA Exam Availability Model
const gtaExamAvailabilityModel = new GTAExamAvailabilityModel(database);

// Recommendation Model
const recommendationModel = new TARecommendationModel(database);

// Archive Model
const archiveModel = new ArchiveModel(database);

// Create audit logger instance for other routers
const auditLogger = new AuditLogger(database);

// Notification Model and Service
const notificationModel = new NotificationModel(database);
const notificationService = new NotificationService(database);
const notificationScheduler = new NotificationScheduler(database);

// Instructor Notification Service and Scheduler
const instructorNotificationService = new InstructorNotificationService(
  database
);
const instructorNotificationScheduler = new InstructorNotificationScheduler(
  database
);

// Set up models for routers
setExportDependencies(exportModel, authService);

// Inject dependencies into routers
setTANeedModels(taNeedModel, courseModel, authService);
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
  notificationService,
  instructorNotificationService
);
setCourseModel(courseModel);
setCourseAuthService(authService);
setApplicationModels(
  applicationModel,
  courseModel,
  systemSettingsModel,
  authService,
  notificationService,
  termModel,
  auditLogModel
);
setExportModel(exportModel);
setInstructorRouterDependencies(
  authService,
  courseModel,
  taNeedModel,
  applicationModel,
  allocationModel,
  labSectionModel,
  systemSettingsModel,
  userModel,
  instructorNotificationService
);
setAuditLogModels(auditLogModel, authService);
setSystemSettingsModels(systemSettingsModel, authService);
setNotificationDependencies(
  notificationModel,
  notificationService,
  authService
);
// GTA Exam Availability Dependencies
setGTAExamAvailabilityDependencies(
  gtaExamAvailabilityModel,
  termModel,
  profileModel,
  authService
);

// Recommendation Dependencies
setRecommendationDependencies(recommendationModel, courseModel, authService);

// Archive Dependencies
setArchiveDependencies(archiveModel, termModel, authService, auditLogger);

// Conflict Dependencies
setConflictDependencies(
  database,
  authService,
  allocationModel,
  auditLogger,
  notificationService
);

// Instructor Notification Dependencies
setInstructorNotificationDependencies(
  instructorNotificationService,
  instructorNotificationScheduler,
  authService
);
setPasswordResetDependencies(userModel, auditLogger);

const environment = Deno.env.get("ENVIRONMENT") || "development";
if (["development", "production"].includes(environment)) {
  const checkInterval = environment === "development" ? 30 : 60;
  notificationScheduler.start(checkInterval);
  console.log(
    `🔔 Notification scheduler started (${checkInterval}min intervals)`
  );
}

const prefixedExportRouter = new Router({
  prefix: "/api/ta-coordinator/export",
});
prefixedExportRouter.use(exportRouter.routes());
prefixedExportRouter.use(exportRouter.allowedMethods());

app.use(prefixedExportRouter.routes());
app.use(prefixedExportRouter.allowedMethods());

// CORS and Security Middleware
app.use(
  oakCors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// Serve static files from /uploads
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname.startsWith("/uploads/")) {
    await send(ctx, ctx.request.url.pathname, {
      root: "/",
    });
  } else {
    await next();
  }
});
app.use(sanitizeInput);
app.use(rateLimit);

// Setup routers for feature/studentDashboard
const taExperienceRouter = new Router();
setupTAExperienceRoutes(taExperienceRouter, database, authService);

const assignmentRouter = new Router();
setupAssignmentRoutes(assignmentRouter, database);

const profileRouter = new Router();
setupProfileRoutes(profileRouter, database, authService, auditLogger);

// Health check endpoint
app.use(async (ctx: Context, next) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.status = Status.OK;
    ctx.response.body = {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
    return;
  }
  await next();
});

// Error handling middleware
app.use(async (ctx: Context, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Server error:", err);
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      "message" in err
    ) {
      ctx.response.status =
        (err as { status?: number }).status || Status.InternalServerError;
      ctx.response.body = {
        error: (err as { message?: string }).message || "Internal server error",
        status:
          (err as { status?: number }).status || Status.InternalServerError,
      };
    } else {
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = {
        error: "Internal server error",
        status: Status.InternalServerError,
      };
    }
  }
});

// Register routes
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// Admin routes with /api prefix
const prefixedAdminRouter = new Router({
  prefix: "/api",
});
prefixedAdminRouter.use(adminRouter.routes());
prefixedAdminRouter.use(adminRouter.allowedMethods());

app.use(prefixedAdminRouter.routes());
app.use(prefixedAdminRouter.allowedMethods());

app.use(taNeedRouter.routes());
app.use(taNeedRouter.allowedMethods());

// Register TA Coordinator routes with /api/ta-coordinator prefix
const prefixedTACoordinatorRouter = new Router({
  prefix: "/api/ta-coordinator",
});
prefixedTACoordinatorRouter.use(taCoordinatorRouter.routes());
prefixedTACoordinatorRouter.use(taCoordinatorRouter.allowedMethods());

app.use(prefixedTACoordinatorRouter.routes());
app.use(prefixedTACoordinatorRouter.allowedMethods());

app.use(courseRouter.routes());
app.use(courseRouter.allowedMethods());

// Register Instructor routes with /api prefix
const prefixedInstructorRouter = new Router({
  prefix: "/api",
});
prefixedInstructorRouter.use(instructorRouter.routes());
prefixedInstructorRouter.use(instructorRouter.allowedMethods());

app.use(prefixedInstructorRouter.routes());
app.use(prefixedInstructorRouter.allowedMethods());

// Register Instructor Notification routes with /api prefix
const prefixedInstructorNotificationRouter = new Router({
  prefix: "/api",
});
prefixedInstructorNotificationRouter.use(instructorNotificationRouter.routes());
prefixedInstructorNotificationRouter.use(
  instructorNotificationRouter.allowedMethods()
);

app.use(prefixedInstructorNotificationRouter.routes());
app.use(prefixedInstructorNotificationRouter.allowedMethods());

// Feature/studentDashboard routers
// Register Application routes with /api prefix
const prefixedApplicationRouter = new Router({
  prefix: "/api",
});
prefixedApplicationRouter.use(applicationRouter.routes());
prefixedApplicationRouter.use(applicationRouter.allowedMethods());

app.use(prefixedApplicationRouter.routes());
app.use(prefixedApplicationRouter.allowedMethods());

// Register TA Experience routes with /api prefix
const prefixedTAExperienceRouter = new Router({
  prefix: "/api",
});
prefixedTAExperienceRouter.use(taExperienceRouter.routes());
prefixedTAExperienceRouter.use(taExperienceRouter.allowedMethods());

app.use(prefixedTAExperienceRouter.routes());
app.use(prefixedTAExperienceRouter.allowedMethods());

// Register Notification routes with /api prefix
const prefixedNotificationRouter = new Router({
  prefix: "/api",
});
prefixedNotificationRouter.use(notificationRouter.routes());
prefixedNotificationRouter.use(notificationRouter.allowedMethods());

app.use(prefixedNotificationRouter.routes());
app.use(prefixedNotificationRouter.allowedMethods());

// Register GTA Exam Availability routes with /api prefix
const prefixedGTAExamRouter = new Router({
  prefix: "/api",
});
prefixedGTAExamRouter.use(gtaExamAvailabilityRouter.routes());
prefixedGTAExamRouter.use(gtaExamAvailabilityRouter.allowedMethods());

app.use(prefixedGTAExamRouter.routes());
app.use(prefixedGTAExamRouter.allowedMethods());

// Register Recommendation routes with /api prefix
const prefixedRecommendationRouter = new Router({
  prefix: "/api",
});
prefixedRecommendationRouter.use(recommendationRouter.routes());
prefixedRecommendationRouter.use(recommendationRouter.allowedMethods());

app.use(prefixedRecommendationRouter.routes());
app.use(prefixedRecommendationRouter.allowedMethods());

// Register Archive routes with /api prefix
const prefixedArchiveRouter = new Router({
  prefix: "/api",
});
prefixedArchiveRouter.use(archiveRouter.routes());
prefixedArchiveRouter.use(archiveRouter.allowedMethods());

app.use(prefixedArchiveRouter.routes());
app.use(prefixedArchiveRouter.allowedMethods());

// Register Conflict routes with /api prefix
const prefixedConflictRouter = new Router({
  prefix: "/api",
});
prefixedConflictRouter.use(conflictRouter.routes());
prefixedConflictRouter.use(conflictRouter.allowedMethods());

app.use(prefixedConflictRouter.routes());
app.use(prefixedConflictRouter.allowedMethods());

app.use(profileRouter.routes());
app.use(profileRouter.allowedMethods());

// Audit log routes (admin only)
const prefixedAuditLogRouter = new Router({
  prefix: "/api",
});
prefixedAuditLogRouter.use(auditLogRouter.routes());
prefixedAuditLogRouter.use(auditLogRouter.allowedMethods());

app.use(prefixedAuditLogRouter.routes());
app.use(prefixedAuditLogRouter.allowedMethods());

// System settings routes with /api prefix
const prefixedSystemSettingsRouter = new Router({
  prefix: "/api",
});
prefixedSystemSettingsRouter.use(systemSettingsRouter.routes());
prefixedSystemSettingsRouter.use(systemSettingsRouter.allowedMethods());

app.use(prefixedSystemSettingsRouter.routes());
app.use(prefixedSystemSettingsRouter.allowedMethods());

// Register Bulk Upload routes with /api prefix
const prefixedBulkUploadRouter = new Router({
  prefix: "/api",
});
prefixedBulkUploadRouter.use(bulkUploadRouter.routes());
prefixedBulkUploadRouter.use(bulkUploadRouter.allowedMethods());

app.use(prefixedBulkUploadRouter.routes());
app.use(prefixedBulkUploadRouter.allowedMethods());

app.use(passwordResetRouter.routes());
app.use(passwordResetRouter.allowedMethods());

// 404 handler
app.use((ctx: Context) => {
  ctx.response.status = Status.NotFound;
  ctx.response.body = { error: "Route not found" };
});

console.log(`Server running on http://localhost:${PORT}`);
setTimeout(() => {
  console.log("\n" + "🎉".repeat(30));
  console.log("\n" + "=".repeat(60));
  console.log("🚀 SERVER IS FULLY INITIALIZED AND READY!");
  console.log("=".repeat(60));
  console.log(`📍 Backend API: http://localhost:${PORT}`);
  console.log(`📍 Frontend: http://localhost:3000`);
  console.log(`📍 Health Check: http://localhost:${PORT}/health`);
  console.log("=".repeat(60));
  console.log("✅ All systems operational!");
  console.log("💡 OTP codes will appear in this console");
  console.log("👀 Watching for file changes...");
  console.log("=".repeat(60));
  console.log("\n" + "🎉".repeat(30) + "\n");
}, 500);

await app.listen({ port: PORT });
