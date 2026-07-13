import { Router, RouterContext } from "../../../../deps.ts";
import { ProfileModel } from "../../../database/models/profile.ts";
import { UserModel } from "../../../database/models/user.ts";

export function setupApiUserProfileRoutes(
  router: Router,
  database: any,
  authService?: any,
  auditLogger?: any
) {
  const profileModel = new ProfileModel(database);
  const userModel = new UserModel(database);

  // Patch/update student profile (PATCH for partial updates)
  router.patch(
    "/api/users/:id/profile",
    async (ctx: RouterContext<"/api/users/:id/profile">) => {
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
          ctx.response.body = { error: "Request body is required" };
          return;
        }

        // Handle weekly_availability transformation
        if (body.weekly_availability) {
          if (typeof body.weekly_availability === "object") {
            body.weekly_availability = JSON.stringify(body.weekly_availability);
          }
        }

        // Handle course preferences if present
        if (body.preferred_course_types) {
          if (typeof body.preferred_course_types === "object") {
            const coursePreferences = {
              preferred: body.preferred_course_types.preferred || [],
              avoid: body.preferred_course_types.avoid || [],
            };
            body.preferred_course_types = coursePreferences;
          }
        }

        const profileData = { user_id: userId, ...body };
        const result = await profileModel.createOrUpdateStudentProfile(
          profileData
        );

        if (result) {
          ctx.response.body = {
            message: "Profile updated successfully",
            profile: result,
          };
        } else {
          ctx.response.status = 404;
          ctx.response.body = { error: "Profile not found" };
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );

  // Save profile draft
  router.post(
    "/api/users/:id/profile/draft",
    async (ctx: RouterContext<"/api/users/:id/profile/draft">) => {
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
          ctx.response.body = { error: "Request body is required" };
          return;
        }

        // Handle course preferences if present
        if (body.preferred_course_types) {
          if (typeof body.preferred_course_types === "object") {
            const coursePreferences = {
              preferred: body.preferred_course_types.preferred || [],
              avoid: body.preferred_course_types.avoid || [],
            };
            body.preferred_course_types = coursePreferences;
          }
        }

        // Save as draft (implementation depends on your ProfileModel)
        const profileData = { user_id: userId, ...body };
        const result = await profileModel.createOrUpdateStudentProfile(
          profileData
        );

        ctx.response.body = {
          message: "Profile draft saved successfully",
          profile: result,
        };
      } catch (error) {
        console.error("Error saving profile draft:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );

  // Get profile preview
  router.get(
    "/api/users/:id/profile/preview",
    async (ctx: RouterContext<"/api/users/:id/profile/preview">) => {
      try {
        const userId = parseInt(ctx.params.id);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        const profile = await profileModel.getStudentProfile(userId);

        if (!profile) {
          ctx.response.status = 404;
          ctx.response.body = { error: "Profile not found" };
          return;
        }

        // Format for preview
        ctx.response.body = {
          preview: {
            basic: {
              userId: profile.user_id,
              gpa: profile.overall_gpa,
              degreeProgram: "Unknown", // This field might not exist in current schema
              yearOfStudy: profile.year_of_study,
            },
            preferences: {
              courseTypes: profile.preferred_course_types,
              specificCourses: profile.specific_course_preferences,
            },
            availability: {
              weekly: profile.weekly_availability
                ? JSON.parse(profile.weekly_availability)
                : null,
              maxHours: profile.max_hours_per_week,
            },
            experience: {
              previousTa: profile.teaching_experience,
              relevantCourses: profile.relevant_coursework,
            },
          },
        };
      } catch (error) {
        console.error("Error fetching profile preview:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );
}
