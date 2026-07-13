import { Router, RouterContext } from "../../../../deps.ts";
import { Database } from "../../../database/config.ts";
import {
  ProfileModel,
  StudentProfile,
} from "../../../database/models/profile.ts";
import { UserModel } from "../../../database/models/user.ts";

export function setupProfileStatusRoutes(router: Router, database: Database) {
  const profileModel = new ProfileModel(database);
  const userModel = new UserModel(database);

  // Get profile status and completion
  router.get(
    "/api/users/:id/profile/status",
    async (ctx: RouterContext<"/api/users/:id/profile/status">) => {
      try {
        const userId = parseInt(ctx.params.id);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        const profile = await profileModel.getStudentProfile(userId);
        const user = await userModel.getUserById(userId);

        // Calculate completion based on required fields
        const requiredFields = [
          profile?.personal_statement,
          profile?.preferred_course_types,
          profile?.preferred_term,
          profile?.max_hours_per_week,
          profile?.weekly_availability,
          profile?.technical_skills,
          profile?.teaching_experience,
          profile?.relevant_coursework,
          profile?.year_of_study,
          profile?.expected_graduation,
          user?.email,
          profile?.overall_gpa,
          user?.major,
          user?.student_number,
          user?.name,
        ];

        const completedFields = requiredFields.filter(
          (field) => field !== null && field !== undefined && field !== ""
        );
        const completionPercentage = Math.round(
          (completedFields.length / requiredFields.length) * 100
        );

        ctx.response.body = {
          status: completionPercentage === 100 ? "Complete" : "Incomplete",
          completionPercentage,
          lastUpdated: profile?.updated_at,
        };
      } catch (error) {
        console.error("Error getting profile status:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );

  // Submit profile
  router.post(
    "/api/users/:id/profile/submit",
    async (ctx: RouterContext<"/api/users/:id/profile/submit">) => {
      try {
        const userId = parseInt(ctx.params.id);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        // Validate that the profile exists and has required fields
        const profile = await profileModel.getStudentProfile(userId);
        if (!profile) {
          ctx.response.status = 404;
          ctx.response.body = { error: "Profile not found" };
          return;
        }

        // Validate required fields
        const requiredFields = [
          "personal_statement",
          "weekly_availability",
          "max_hours_per_week",
          "preferred_term",
          "preferred_course_types",
          "relevant_coursework",
          "teaching_experience",
          "technical_skills",
        ];

        const missingFields = requiredFields.filter(
          (field) => !profile[field as keyof StudentProfile]
        );

        if (missingFields.length > 0) {
          ctx.response.status = 400;
          ctx.response.body = {
            error: "Missing required fields",
            missing_fields: missingFields,
          };
          return;
        }

        // Update submission status
        const updatedProfile = await profileModel.updateProfileSubmissionStatus(
          userId,
          true
        );

        ctx.response.body = {
          success: true,
          profile: updatedProfile,
        };
      } catch (error) {
        console.error("Error submitting profile:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );

  // Validate profile
  router.post(
    "/api/users/:id/profile/validate",
    async (ctx: RouterContext<"/api/users/:id/profile/validate">) => {
      try {
        const userId = parseInt(ctx.params.id);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        const body = await ctx.request.body().value;

        if (!body) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Missing request body" };
          return;
        }

        // Validate required fields
        const requiredFields = [
          "personal_statement",
          "weekly_availability",
          "max_hours_per_week",
          "preferred_term",
          "preferred_course_types",
          "relevant_coursework",
          "teaching_experience",
          "technical_skills",
        ];

        const missingFields = requiredFields.filter((field) => !body[field]);

        type ValidationError = {
          type: "missing_fields" | "invalid_format";
          fields?: string[];
          field?: string;
          message?: string;
        };

        const validationErrors: ValidationError[] = [];

        if (missingFields.length > 0) {
          validationErrors.push({
            type: "missing_fields",
            fields: missingFields,
          });
        }

        // Validate field formats
        if (
          body.max_hours_per_week &&
          (isNaN(body.max_hours_per_week) || body.max_hours_per_week < 0)
        ) {
          validationErrors.push({
            type: "invalid_format",
            field: "max_hours_per_week",
            message: "Max hours must be a positive number",
          });
        }

        // Validate preferred_course_types structure
        if (body.preferred_course_types) {
          if (typeof body.preferred_course_types !== "object") {
            validationErrors.push({
              type: "invalid_format",
              field: "preferred_course_types",
              message: "Course types must be a valid object",
            });
          } else {
            // Check if it has preferred and avoid arrays
            if (
              !Array.isArray(body.preferred_course_types.preferred) ||
              !Array.isArray(body.preferred_course_types.avoid)
            ) {
              validationErrors.push({
                type: "invalid_format",
                field: "preferred_course_types",
                message:
                  'Course types must have "preferred" and "avoid" arrays',
              });
            }
          }
        }

        ctx.response.body = {
          isValid: validationErrors.length === 0,
          errors: validationErrors,
        };
      } catch (error) {
        console.error("Error validating profile:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );
}
