import { Router } from "../../../../deps.ts";
import { Database } from "../../../database/config.ts";
import { AuditLogger } from "../../services/auditLogger.ts";
import { AuthService } from "../../services/auth.ts";
import { setupApiProfileRoutes } from "./apiProfileRoutes.ts";
import { setupApiUserProfileRoutes } from "./apiUserProfileRoutes.ts";
import { setupAssignmentRoutes } from "./assignmentRoutes.ts";
import { setupCoursePreferenceRoutes } from "./coursePreferenceRoutes.ts";
import { setupProfileStatusRoutes } from "./profileStatusRoutes.ts";
import { setupStudentAuthRoutes } from "./studentAuthRoutes.ts";
import { setupTranscriptRoutes } from "./transcriptRoutes.ts";
import { setupUserInfoRoutes } from "./userInfoRoutes.ts";

export const profileRouter = new Router();

export function setupProfileRoutes(
  router: Router = profileRouter,
  database: Database,
  authService?: AuthService,
  auditLogger?: AuditLogger
) {
  // Setup all the modular route groups
  setupApiProfileRoutes(router, database, authService, auditLogger);
  setupApiUserProfileRoutes(router, database, authService, auditLogger);
  setupStudentAuthRoutes(router, database, authService, auditLogger);
  setupCoursePreferenceRoutes(router, database);
  setupProfileStatusRoutes(router, database);
  setupUserInfoRoutes(router, database);
  setupTranscriptRoutes(router, database);
  setupAssignmentRoutes(router, database, authService);
}
