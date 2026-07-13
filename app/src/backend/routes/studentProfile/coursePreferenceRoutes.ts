import { Router, RouterContext } from "../../../../deps.ts";
import { Database } from "../../../database/config.ts";
import { ProfileModel } from "../../../database/models/profile.ts";

export function setupCoursePreferenceRoutes(
  router: Router,
  database: Database
) {
  const profileModel = new ProfileModel(database);

  // Update course preferences
  router.put(
    "/api/profile/:userId/course-preferences",
    async (ctx: RouterContext<"/api/profile/:userId/course-preferences">) => {
      try {
        const userId = parseInt(ctx.params.userId);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        // Fixed body parsing
        const body = await ctx.request.body().value;

        if (!body) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Missing request body" };
          return;
        }

        // Ensure we have the right structure
        const coursePreferences = {
          preferred: Array.isArray(body.preferred) ? body.preferred : [],
          avoid: Array.isArray(body.avoid) ? body.avoid : [],
        };

        await profileModel.updateCoursePreferences(userId, coursePreferences);

        ctx.response.body = {
          success: true,
          message: "Course preferences updated successfully",
          preferences: coursePreferences,
        };
      } catch (error) {
        console.error("Error updating course preferences:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );
}
