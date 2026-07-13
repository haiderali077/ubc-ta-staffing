import { z } from "https://deno.land/x/zod@v3.16.1/mod.ts";
import { Router } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { AllocationModel } from "../../database/models/allocation.ts";
import { AuditLogger } from "../services/auditLogger.ts";
import { AuthService } from "../services/auth.ts";
import { AssignmentRequest, ConflictService } from "../services/conflictService.ts";
import { NotificationService } from "../services/notification.ts";

export const conflictRouter = new Router();

// Dependencies that will be injected
let conflictService: ConflictService;
let authService: AuthService;
let allocationModel: AllocationModel;
let auditLogger: AuditLogger;
let notificationService: NotificationService;

/**
 * Set dependencies for conflict router
 */
export function setConflictDependencies(
  database: Database,
  auth: AuthService,
  allocation: AllocationModel,
  audit: AuditLogger,
  notification: NotificationService
) {
  conflictService = new ConflictService(database);
  authService = auth;
  allocationModel = allocation;
  auditLogger = audit;
  notificationService = notification;
}

/**
 * Middleware to require admin or TA coordinator role
 */
async function requireAdminOrTACoordinator(ctx: any, next: () => Promise<void>) {
  try {
    await authService.requireAuth(ctx, async () => {
      const user = ctx.state.user;
      if (user.role !== 'admin' && user.role !== 'ta_coordinator') {
        ctx.response.status = 403;
        ctx.response.body = { error: "Access denied. Admin or TA Coordinator role required." };
        return;
      }
      await next();
    });
  } catch (error) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Authentication required" };
  }
}

/**
 * GET /api/conflicts/assignments
 * Get all conflicts for current assignments
 * UR 2.7 - Must be able to view conflicts when scheduling students
 */
conflictRouter.get("/conflicts/assignments", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const conflictResults = await conflictService.getAllAssignmentConflicts();
      
      const response = {
        totalAssignments: conflictResults.length,
        conflictSummary: {
          assignmentsWithConflicts: conflictResults.filter(r => r.hasConflicts).length,
          totalConflicts: conflictResults.reduce((sum, r) => sum + r.summary.totalConflicts, 0),
          criticalConflicts: conflictResults.reduce((sum, r) => sum + r.summary.criticalConflicts, 0)
        },
        conflicts: conflictResults
      };

      ctx.response.status = 200;
      ctx.response.body = response;

      // Log audit event
      await auditLogger.logAction(
        ctx.state.user.user_id,
        'conflict_check',
        'assignments',
        null,
        `Viewed conflicts for ${conflictResults.length} assignments`,
        ctx.state.user.email
      );

    } catch (error) {
      console.error("Error fetching assignment conflicts:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        error: "Failed to fetch assignment conflicts",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
});

/**
 * POST /api/conflicts/check
 * Check conflicts for a specific potential assignment
 * UR 2.7 - Must be able to view conflicts when scheduling students
 */
conflictRouter.post("/conflicts/check", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const requestBody = await ctx.request.body({ type: "json" }).value;
      
      // Validate request body
      const schema = z.object({
        userId: z.number({ required_error: "User ID is required" }),
        labSectionId: z.number({ required_error: "Lab Section ID is required" }),
        courseId: z.number().optional(),
        isMarker: z.boolean().optional(),
        notes: z.string().optional()
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Validation failed",
          details: validation.error.errors
        };
        return;
      }

      const assignmentRequest: AssignmentRequest = validation.data;
      
      // Check for conflicts
      const conflictResult = await conflictService.checkAssignmentConflicts(assignmentRequest);

      // Enhance response with assignment details
      const enhancedResponse = {
        ...conflictResult,
        assignmentDetails: {
          userId: assignmentRequest.userId,
          labSectionId: assignmentRequest.labSectionId,
          isMarker: assignmentRequest.isMarker || false
        },
        recommendations: generateAssignmentRecommendations(conflictResult)
      };

      ctx.response.status = 200;
      ctx.response.body = enhancedResponse;

      // Log audit event
      await auditLogger.logAction(
        ctx.state.user.user_id,
        'conflict_check',
        'assignment_preview',
        assignmentRequest.labSectionId,
        `Checked conflicts for user ${assignmentRequest.userId} to lab section ${assignmentRequest.labSectionId}`,
        ctx.state.user.email
      );

    } catch (error) {
      console.error("Error checking assignment conflicts:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        error: "Failed to check assignment conflicts",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
});

/**
 * POST /api/allocations/assign-with-conflicts
 * Assign student to lab section with conflict handling
 * UR 2.7 - Enhanced assignment endpoint that handles conflicts
 */
conflictRouter.post("/allocations/assign-with-conflicts", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const requestBody = await ctx.request.body({ type: "json" }).value;
      
      // Validate request body
      const schema = z.object({
        userId: z.number({ required_error: "User ID is required" }),
        labSectionId: z.number({ required_error: "Lab Section ID is required" }),
        notes: z.string().optional(),
        isMarker: z.boolean().optional(),
        overrideConflicts: z.boolean().default(false),
        acknowledgedConflicts: z.array(z.string()).optional(),
        conflictResolutions: z.record(z.string()).optional()
      });

      const validation = schema.safeParse(requestBody);
      if (!validation.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Validation failed",
          details: validation.error.errors
        };
        return;
      }

      const {
        userId,
        labSectionId,
        notes,
        isMarker,
        overrideConflicts,
        acknowledgedConflicts,
        conflictResolutions
      } = validation.data;

      // Check for conflicts first
      const conflictResult = await conflictService.checkAssignmentConflicts({
        userId,
        labSectionId,
        isMarker,
        notes
      });

      // If there are conflicts and no override, return conflict information
      if (conflictResult.hasConflicts && !overrideConflicts) {
        ctx.response.status = 409; // Conflict status
        ctx.response.body = {
          error: "Assignment conflicts detected",
          conflicts: conflictResult,
          requiresOverride: true,
          message: "Review conflicts and set overrideConflicts to true to proceed"
        };
        return;
      }

      // If there are critical conflicts that cannot be overridden
      const criticalConflicts = conflictResult.conflicts.filter(c => !c.canOverride);
      if (criticalConflicts.length > 0 && overrideConflicts) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Critical conflicts cannot be overridden",
          criticalConflicts,
          message: "Resolve critical conflicts before proceeding with assignment"
        };
        return;
      }

      // Get the current user (TA coordinator) ID from the authenticated session
      const currentUser = ctx.state.user;
      const allocatedBy = currentUser?.user_id;

      if (!allocatedBy) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Unable to identify the allocating user" };
        return;
      }

      // Proceed with assignment
      const allocation = await allocationModel.assignStudentToLabSection(
        userId,
        labSectionId,
        allocatedBy,
        notes,
        currentUser?.email,
        undefined,
        undefined,
        isMarker
      );

      // Log conflict override if applicable
      if (conflictResult.hasConflicts && overrideConflicts) {
        const conflictDetails = {
          conflicts: conflictResult.conflicts.map(c => ({
            type: c.type,
            severity: c.severity,
            message: c.message
          })),
          acknowledgedConflicts,
          conflictResolutions,
          overriddenBy: currentUser.email,
          overriddenAt: new Date().toISOString()
        };

        await auditLogger.logAction(
          allocatedBy,
          'conflict_override',
          'assignment',
          allocation.allocation_id,
          `Overrode ${conflictResult.conflicts.length} conflicts for assignment`,
          currentUser.email,
          conflictDetails
        );
      }

      // Send notification to student about allocation
      try {
        await notificationService.notifyAllocationConfirmed(userId, labSectionId);
      } catch (notificationError) {
        console.error("Failed to send allocation notification:", notificationError);
        // Continue even if notification fails
      }

      const response = {
        success: true,
        allocation,
        conflictInfo: conflictResult.hasConflicts ? {
          conflictsDetected: conflictResult.conflicts.length,
          conflictsOverridden: overrideConflicts,
          summary: conflictResult.summary
        } : null,
        message: conflictResult.hasConflicts 
          ? `Assignment completed with ${conflictResult.conflicts.length} conflicts overridden`
          : "Assignment completed successfully with no conflicts"
      };

      ctx.response.status = 201;
      ctx.response.body = response;

    } catch (error) {
      console.error("Error assigning with conflict handling:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        error: "Failed to complete assignment",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
});

/**
 * GET /api/conflicts/student/:userId
 * Get potential conflicts for a specific student across all possible assignments
 */
conflictRouter.get("/conflicts/student/:userId", async (ctx) => {
  await requireAdminOrTACoordinator(ctx, async () => {
    try {
      const userId = parseInt(ctx.params.userId);
      if (isNaN(userId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid user ID" };
        return;
      }

      // Get all available lab sections
      const availableLabSections = await allocationModel.getLabSectionsWithSlots();
      
      // Check conflicts for each lab section
      const conflictChecks = await Promise.all(
        availableLabSections.map(async (labSection: any) => {
          const conflictResult = await conflictService.checkAssignmentConflicts({
            userId,
            labSectionId: labSection.lab_section_id
          });

          return {
            labSection: {
              id: labSection.lab_section_id,
              courseCode: labSection.course_code,
              sectionName: labSection.section_name,
              schedule: `${labSection.lab_days} ${labSection.lab_start_time}-${labSection.lab_end_time}`
            },
            conflicts: conflictResult
          };
        })
      );

      const response = {
        userId,
        totalLabSections: availableLabSections.length,
        sectionsWithConflicts: conflictChecks.filter(check => check.conflicts.hasConflicts).length,
        conflictAnalysis: conflictChecks
      };

      ctx.response.status = 200;
      ctx.response.body = response;

    } catch (error) {
      console.error("Error getting student conflicts:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        error: "Failed to get student conflicts",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
});

/**
 * Helper function to generate assignment recommendations based on conflicts
 */
function generateAssignmentRecommendations(conflictResult: any): string[] {
  const recommendations: string[] = [];

  if (!conflictResult.hasConflicts) {
    recommendations.push("✅ No conflicts detected - safe to proceed with assignment");
    return recommendations;
  }

  const { conflicts, summary } = conflictResult;

  if (summary.criticalConflicts > 0) {
    recommendations.push("🚫 Critical conflicts must be resolved before assignment");
  }

  if (conflicts.some((c: any) => c.type === 'time_conflict')) {
    recommendations.push("⏰ Review schedule conflicts with existing assignments");
  }

  if (conflicts.some((c: any) => c.type === 'availability_conflict')) {
    recommendations.push("📅 Verify student availability preferences");
  }

  if (conflicts.some((c: any) => c.type === 'hours_conflict')) {
    recommendations.push("🕐 Consider reducing hours or checking student hour limits");
  }

  if (conflicts.some((c: any) => c.type === 'course_capacity')) {
    recommendations.push("👥 Lab section may be at capacity - verify TA requirements");
  }

  if (summary.overridableConflicts > 0) {
    recommendations.push("⚠️ Some conflicts can be overridden if necessary");
  }

  return recommendations;
}