import { Router, RouterContext } from "../../../../deps.ts";
import { ProfileModel } from "../../../database/models/profile.ts";

export function setupApiProfileRoutes(
  router: Router,
  database: any,
  authService?: any,
  auditLogger?: any
) {
  const profileModel = new ProfileModel(database);

  // Get student profile
  router.get(
    "/api/profile/:userId",
    async (ctx: RouterContext<"/api/profile/:userId">) => {
      try {
        const userId = parseInt(ctx.params.userId);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        const profile = await profileModel.getStudentProfile(userId);

        ctx.response.body = {
          profile: {
            ...profile,
            weekly_availability: profile?.weekly_availability
              ? JSON.parse(profile.weekly_availability)
              : null,
          },
        };
      } catch (error) {
        console.error("Error fetching profile:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );

  // Update student profile (PUT for full updates)
  router.put(
    "/api/profile/:userId",
    async (ctx: RouterContext<"/api/profile/:userId">) => {
      try {
        const userId = parseInt(ctx.params.userId);
        console.log("PUT request received for user:", userId);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        const body = await ctx.request.body().value;
        console.log("Request body:", body);

        if (!body) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Request body is required" };
          return;
        }

        // Handle specific transformations
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

        console.log("Processed body for database:", body);

        const profileData = { user_id: userId, ...body };
        const result = await profileModel.createOrUpdateStudentProfile(
          profileData
        );
        console.log("Database update result:", result);

        if (result) {
          ctx.response.body = {
            success: true,
            profile: result,
          };
        } else {
          ctx.response.status = 404;
          ctx.response.body = { error: "Profile not found" };
        }
      } catch (error) {
        console.error("Error in PUT /api/profile/:userId:", error);
        ctx.response.status = 500;
        ctx.response.body = {
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  );
}
