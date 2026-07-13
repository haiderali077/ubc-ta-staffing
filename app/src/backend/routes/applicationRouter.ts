import { Context, Router, RouterContext, Status } from "../../../deps.ts";
import { ApplicationModel } from "../../database/models/application.ts";
import { AuditLogModel } from "../../database/models/auditLog.ts";
import { CourseModel } from "../../database/models/course.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import { TermModel } from "../../database/models/term.ts";
import { requireAuth } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

// Add these imports at the top
import { NotificationService } from "../services/notification.ts";

export const applicationRouter = new Router();

// Initialize models (to be injected)
let applicationModel: ApplicationModel;
let courseModel: CourseModel;
let systemSettingsModel: SystemSettingsModel;
let authService: AuthService;
let termModel: TermModel;
let auditLogModel: AuditLogModel;

// model initialization for notifications
let notificationService: NotificationService;

// Updating the setApplicationModels function to include notification services
export function setApplicationModels(
  appModel: ApplicationModel,
  courseModelParam: CourseModel,
  settingsModelParam: SystemSettingsModel,
  authServiceParam: AuthService,
  notificationServiceParam: NotificationService, // Added this parameter
  termModelParam: TermModel,
  auditLogModelParam: AuditLogModel
) {
  applicationModel = appModel;
  courseModel = courseModelParam;
  systemSettingsModel = settingsModelParam;
  authService = authServiceParam;

  notificationService = notificationServiceParam; // Added this line

  termModel = termModelParam;
  auditLogModel = auditLogModelParam;
}

// UR4.3: Submit TA Application with COMPLETE requirements
applicationRouter.post(
  "/applications",
  async (ctx: Context, next: any) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const body = await ctx.request.body({ type: "json" }).value;

      // Debug: Log the received data
      console.log(
        "Received application submission data:",
        JSON.stringify(body, null, 2)
      );
      console.log("Application type received:", body.applicationType);
      console.log("🔍 User ID from auth:", userId);

      // Check TA application deadline
      console.log("🕒 Checking application deadline...");
      const isDeadlinePassed = await systemSettingsModel.isDeadlinePassed(
        "ta_application_deadline"
      );
      console.log("📅 Deadline passed?", isDeadlinePassed);

      if (isDeadlinePassed) {
        const deadlineDate = await systemSettingsModel.getDeadlineDate(
          "ta_application_deadline"
        );
        const deadlineFormatted = deadlineDate
          ? deadlineDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })
          : "Unknown";

        console.error("❌ Application deadline has passed:", deadlineFormatted);
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: `The TA application deadline has passed. The deadline was ${deadlineFormatted}. You cannot submit new applications at this time. Please contact your TA coordinator if you believe this is an error.`,
          type: "deadline_error",
          deadline: deadlineDate?.toISOString(),
          deadlineFormatted: deadlineFormatted,
        };
        return;
      }

      const {
        technical_skills,
        relevant_coursework,
        overall_gpa,
        expected_graduation,
        weekly_availability,
        teaching_experience,
      } = body;

      const existingApplication = await applicationModel.getApplicationByUserId(
        userId
      );
      console.log("📋 Existing application found?", !!existingApplication);

      if (!existingApplication) {
        console.log("📝 Creating new application - running validation...");
        // Collect all validation errors
        const validationErrors: { [key: string]: string } = {};

        // Validate course preferences - now flexible (0-3 courses)
        if (body.coursePreferences && Array.isArray(body.coursePreferences)) {
          if (body.coursePreferences.length > 3) {
            validationErrors.coursePreferences =
              "Please select at most 3 course preferences.";
          } else if (body.coursePreferences.length > 0) {
            // Check for duplicate courses or invalid rankings
            const courseIds = body.coursePreferences.map(
              (p: any) => p.course_id
            );
            const ranks = body.coursePreferences.map((p: any) => p.rank);

            // Filter out any zero/null course IDs
            const validCourseIds = courseIds.filter(
              (id: number) => id && id !== 0
            );
            const validRanks = ranks.filter(
              (rank: number, index: number) =>
                courseIds[index] && courseIds[index] !== 0
            );

            if (validCourseIds.length !== new Set(validCourseIds).size) {
              validationErrors.coursePreferences =
                "Please select different courses. Duplicate selections are not allowed.";
            } else if (
              validRanks.length > 0 &&
              !validRanks.every((rank: number) => [1, 2, 3].includes(rank))
            ) {
              validationErrors.coursePreferences =
                "Each course must be ranked 1, 2, or 3.";
            }
          }
          // If no course preferences are provided, that's okay - they're now optional
        } else if (
          body.coursePreferences &&
          !Array.isArray(body.coursePreferences)
        ) {
          validationErrors.coursePreferences =
            "Course preferences must be an array.";
        }

        // Validate domain areas - now flexible (0-5 areas)
        if (body.domainAreas && Array.isArray(body.domainAreas)) {
          if (body.domainAreas.length > 5) {
            validationErrors.domainAreas =
              "Please select at most 5 domain areas.";
          } else if (
            body.domainAreas.some(
              (area: string) =>
                typeof area !== "string" || !area.trim() || area.length > 50
            )
          ) {
            validationErrors.domainAreas =
              "Each domain area must be a non-empty string with at most 50 characters.";
          } else if (
            new Set(body.domainAreas).size !== body.domainAreas.length
          ) {
            validationErrors.domainAreas =
              "Please select different domain areas. Duplicate selections are not allowed.";
          }
          // Domain areas are now optional - no minimum requirement
        } else if (body.domainAreas && !Array.isArray(body.domainAreas)) {
          validationErrors.domainAreas = "Domain areas must be an array.";
        }

        // Validate application type (required for COMPLETE UR4.3)
        if (!body.applicationType) {
          validationErrors.applicationType =
            "Application type could not be determined. Please complete your academic profile with your year of study.";
        } else if (
          !["Undergraduate", "Graduate", "PhD"].includes(body.applicationType)
        ) {
          validationErrors.applicationType =
            "Invalid application type. Must be 'Undergraduate', 'Graduate', or 'PhD'.";
        }

        // If there are validation errors, return them in a structured format
        if (Object.keys(validationErrors).length > 0) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = {
            error: "Please fix the following issues with your application:",
            validationErrors: validationErrors,
            fields: Object.keys(validationErrors),
          };
          return;
        }
      }

      if (existingApplication) {
        if (!existingApplication.application_id) {
          ctx.response.status = Status.InternalServerError;
          ctx.response.body = { error: "Application ID is undefined" };
          return;
        }
        // Update existing application
        const updatedApplication = await applicationModel.updateApplication(
          existingApplication.application_id!,
          {
            notes: body.notes || "",
            domain_areas: body.domainAreas,
            application_type: body.applicationType,
            status: "pending",
          }
        );
        // Update course rankings - handle empty array gracefully
        await applicationModel.deleteCourseRankings(
          existingApplication.application_id!
        );
        // Only add valid course preferences (skip if empty array or invalid course_ids)
        if (body.coursePreferences && Array.isArray(body.coursePreferences)) {
          for (const pref of body.coursePreferences) {
            if (pref && pref.course_id && pref.course_id !== 0) {
              try {
                await applicationModel.addCourseRanking({
                  application_id: existingApplication.application_id,
                  course_id: pref.course_id,
                  rank: pref.rank,
                });
              } catch (error) {
                console.error("Error adding course ranking:", error);
                // Continue with next preference
              }
            }
          }
        }

        // Send notification for application update
        try {
          console.log(
            "🔔 DEBUG: Attempting to send application update notification",
            {
              userId,
              applicationId: existingApplication.application_id,
              hasUserId: !!userId,
              hasApplicationId: !!existingApplication.application_id,
            }
          );

          if (userId && existingApplication.application_id) {
            await notificationService.notifyApplicationUpdated(
              userId,
              existingApplication.application_id
            );
            console.log(
              "✅ DEBUG: Application update notification sent successfully"
            );
          } else {
            console.log(
              "❌ DEBUG: Missing userId or applicationId for notification"
            );
          }
        } catch (notificationError) {
          console.error(
            "Failed to send application update notification:",
            notificationError
          );
          // Don't fail the application update if notification fails
        }

        // Add audit logging for application update
        try {
          const user = ctx.state.user;
          if (userId && existingApplication.application_id) {
            await auditLogModel.createLog({
              user_id: userId,
              user_email: user?.email || "unknown",
              action: "APPLICATION_UPDATE",
              resource: "ta_applications",
              resource_id: existingApplication.application_id.toString(),
              details: `Student updated their TA application. Course preferences: ${body.coursePreferences
                .map((p: any) => `${p.course_id}(rank:${p.rank})`)
                .join(", ")}. Application type: ${body.applicationType}`,
              severity: "low",
              success: true,
              ip_address:
                ctx.request.headers.get("x-forwarded-for") || ctx.request.ip,
              user_agent: ctx.request.headers.get("user-agent") || "Unknown",
            });
          }
        } catch (auditError) {
          console.error(
            "Failed to create audit log entry for application update:",
            auditError
          );
          // Don't fail the application update if audit logging fails
        }

        ctx.response.status = Status.OK;
        ctx.response.body = {
          message: "Application updated successfully",
          application_id: existingApplication.application_id,
        };
        return;
      }

      // Create the application with ALL required fields
      const application = await applicationModel.createApplication({
        user_id: userId,
        status: "pending",
        notes: body.notes || "",
        domain_areas: body.domainAreas,
        application_type: body.applicationType,
      });

      //Adding the notification logic for application submission
      try {
        // Send application submission notification
        await notificationService.notifyApplicationSubmitted(
          userId,
          application.application_id!
        );
      } catch (notificationError) {
        console.error(
          "Failed to send application submission notification:",
          notificationError
        );
        // Don't fail the application submission if notification fails
      }
      // Added the notification logic for application submission

      // Add audit logging for application submission
      try {
        const user = ctx.state.user;
        if (userId && application.application_id) {
          await auditLogModel.createLog({
            user_id: userId,
            user_email: user?.email || "unknown",
            action: "APPLICATION_SUBMIT",
            resource: "ta_applications",
            resource_id: application.application_id.toString(),
            details: `Student submitted new TA application. Course preferences: ${body.coursePreferences
              .map((p: any) => `${p.course_id}(rank:${p.rank})`)
              .join(", ")}. Application type: ${body.applicationType}`,
            severity: "low",
            success: true,
            ip_address:
              ctx.request.headers.get("x-forwarded-for") || ctx.request.ip,
            user_agent: ctx.request.headers.get("user-agent") || "Unknown",
          });
        }
      } catch (auditError) {
        console.error(
          "Failed to create audit log entry for application submission:",
          auditError
        );
        // Don't fail the application submission if audit logging fails
      }

      // Add course rankings - handle empty course preferences gracefully
      try {
        if (body.coursePreferences && Array.isArray(body.coursePreferences)) {
          for (const pref of body.coursePreferences) {
            if (pref && pref.course_id && pref.course_id !== 0) {
              try {
                await applicationModel.addCourseRanking({
                  application_id: application.application_id!,
                  course_id: pref.course_id,
                  rank: pref.rank,
                });
              } catch (error) {
                console.error("Error adding course ranking:", error);
                // Continue with next preference
              }
            }
          }
        }
      } catch (error) {
        console.error("Error setting course rankings:", error);
      }
      ctx.response.status = Status.Created;
      ctx.response.body = {
        message: "Application submitted successfully",
        application_id: application.application_id,
      };
    } catch (error) {
      console.error("Error submitting application:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to submit application" };
    }
  }
);

// UR4.5: Get user's applications and their status (COMPLETE) - FIXED RESPONSE FORMAT
applicationRouter.get(
  "/applications/my",
  async (ctx: Context, next: any) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const userId = ctx.state.user.id;
      const applications = await applicationModel.getApplicationsByUser(userId);

      ctx.response.status = Status.OK;
      ctx.response.body = applications;
    } catch (error) {
      console.error("Error fetching user applications:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch applications" };
    }
  }
);

// NEW: Get available domain areas - FIXED RESPONSE FORMAT
applicationRouter.get(
  "/domain-areas",
  async (ctx: Context, next: any) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const domainAreas = await applicationModel.getDomainAreas();

      ctx.response.status = Status.OK;
      ctx.response.body = {
        domainAreas: domainAreas, // Wrap in domainAreas key that tests expect
      };
    } catch (error) {
      console.error("Error fetching domain areas:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch domain areas" };
    }
  }
);

// Check TA application deadline status
applicationRouter.get(
  "/deadline-status",
  async (ctx: Context, next: any) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: Context) => {
    try {
      const isDeadlinePassed = await systemSettingsModel.isDeadlinePassed(
        "ta_application_deadline"
      );
      const deadlineDate = await systemSettingsModel.getDeadlineDate(
        "ta_application_deadline"
      );

      const deadlineFormatted = deadlineDate
        ? deadlineDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })
        : null;

      ctx.response.status = Status.OK;
      ctx.response.body = {
        isPassed: isDeadlinePassed,
        deadline: deadlineDate?.toISOString() || null,
        deadlineFormatted: deadlineFormatted,
        message: isDeadlinePassed
          ? `The TA application deadline has passed. The deadline was ${deadlineFormatted}. You cannot submit new applications at this time. Please contact your TA coordinator if you believe this is an error.`
          : deadlineFormatted
          ? `TA applications are open until ${deadlineFormatted}`
          : "TA application deadline is not configured",
      };
    } catch (error) {
      console.error("Error checking deadline status:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to check deadline status" };
    }
  }
);

// Get available courses for application
applicationRouter.get(
  "/courses-available",

  async (ctx: Context) => {
    try {
      // Get current term courses that need TAs
      const courses = await courseModel.getCoursesWithTANeeds();

      console.log("🔍 DEBUG: All courses with TA needs:", courses.length);
      courses.forEach((course) => {
        console.log(
          `  - ${course.code}: status=${course.need_status}, required=${course.hours_required}`
        );
      });

      // Filter only courses with approved (filled) TA needs
      // Status "filled" means the TA coordinator has approved the instructor's TA request
      const availableCourses = courses.filter(
        (course) => course.need_status === "filled" && course.hours_required > 0
      );

      console.log(
        "✅ DEBUG: Available courses after filtering (approved only):",
        availableCourses.length
      );
      availableCourses.forEach((course) => {
        console.log(`  - ${course.code}: ${course.title}`);
      });

      ctx.response.status = Status.OK;
      ctx.response.body = availableCourses;
    } catch (error) {
      console.error("Error fetching available courses:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to fetch available courses" };
    }
  }
);

// Get available terms for student profile
applicationRouter.get("/terms-available", async (ctx: Context) => {
  try {
    // Get all terms that students can see for their profile
    // This is a public endpoint so students can select their preferred term
    // Since all terms are now 'upcoming', return all terms
    const terms = await termModel.getAllTerms();

    ctx.response.status = Status.OK;
    ctx.response.body = terms;
  } catch (error) {
    console.error("Error fetching available terms:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Failed to fetch available terms" };
  }
});

// Update application status (for admin/coordinator use)
applicationRouter.patch(
  "/applications/:applicationId/status",
  async (ctx: Context, next: any) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: RouterContext<"/applications/:applicationId/status">) => {
    try {
      const applicationId = parseInt(ctx.params.applicationId);
      const { status } = await ctx.request.body({ type: "json" }).value;

      // Validate status
      const validStatuses = ["pending", "approved", "rejected", "allocated"];
      if (!validStatuses.includes(status)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid status" };
        return;
      }

      const updatedApplication = await applicationModel.updateApplication(
        applicationId,
        { status }
      );

      if (!updatedApplication) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Application not found" };
        return;
      }

      //Adding the notification logic for status update
      try {
        // Send status update notification
        if (status === "approved") {
          await notificationService.notifyApplicationAccepted(
            updatedApplication.user_id!,
            applicationId
          );
        } else if (status === "rejected") {
          await notificationService.notifyApplicationRejected(
            updatedApplication.user_id!,
            applicationId
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send application status notification:",
          notificationError
        );
        // Don't fail the status update if notification fails
      }
      //Added notification logic for status update

      ctx.response.status = Status.OK;
      ctx.response.body = updatedApplication;
    } catch (error) {
      console.error("Error updating application status:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to update application status" };
    }
  }
);

// Override application type (admin only)
applicationRouter.post(
  "/applications/:applicationId/override-type",
  async (ctx: Context, next: () => Promise<unknown>) => {
    await requireAuth(authService)(ctx, next);
  },
  async (ctx: RouterContext<"/applications/:applicationId/override-type">) => {
    try {
      const applicationId = parseInt(ctx.params.applicationId);
      const { application_type, override_reason } = await ctx.request.body({
        type: "json",
      }).value;

      // Validate application type
      const validTypes = ["Undergraduate", "Graduate", "PhD"];
      if (!validTypes.includes(application_type)) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { error: "Invalid application type" };
        return;
      }

      // Validate override reason
      if (!override_reason || override_reason.trim().length < 10) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          error: "Override reason must be at least 10 characters long",
        };
        return;
      }

      // Get the current user (admin/coordinator)
      const user = ctx.state.user;
      if (!user || (user.role !== "admin" && user.role !== "coordinator")) {
        ctx.response.status = Status.Forbidden;
        ctx.response.body = { error: "Insufficient permissions" };
        return;
      }

      const updatedApplication = await applicationModel.updateApplication(
        applicationId,
        { application_type }
      );

      if (!updatedApplication) {
        ctx.response.status = Status.NotFound;
        ctx.response.body = { error: "Application not found" };
        return;
      }

      // Add audit logging for application type override
      try {
        await auditLogModel.createLog({
          user_id: user.user_id,
          user_email: user.email,
          action: "APPLICATION_TYPE_OVERRIDE",
          resource: "ta_applications",
          resource_id: applicationId.toString(),
          details: `Application type changed from ${
            updatedApplication.application_type || "Not Set"
          } to ${application_type}. Reason: ${override_reason}`,
          severity: "medium",
          success: true,
          ip_address:
            ctx.request.headers.get("x-forwarded-for") || ctx.request.ip,
          user_agent: ctx.request.headers.get("user-agent") || "Unknown",
        });
      } catch (auditError) {
        console.error("Failed to create audit log entry:", auditError);
        // Don't fail the override if audit logging fails
      }

      ctx.response.status = Status.OK;
      ctx.response.body = updatedApplication;
    } catch (error) {
      console.error("Error overriding application type:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Failed to override application type" };
    }
  }
);
