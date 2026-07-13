import { Router, RouterContext } from "../../../../deps.ts";
import { Database } from "../../../database/config.ts";
import { ProfileModel } from "../../../database/models/profile.ts";

export function setupUserInfoRoutes(router: Router, database: Database) {
  const profileModel = new ProfileModel(database);

  // Get user basic info
  router.get("/api/users/:id", async (ctx: RouterContext<"/api/users/:id">) => {
    try {
      const userId = parseInt(ctx.params.id);

      if (isNaN(userId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid user ID" };
        return;
      }

      const query = `
        SELECT user_id, name, email, role, major, created_at, updated_at 
        FROM users 
        WHERE user_id = $1
      `;

      const result = await database.query(query, [userId]);

      if (result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "User not found" };
        return;
      }

      ctx.response.body = result.rows[0];
    } catch (error) {
      console.error("Error fetching user:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error" };
    }
  });

  // Get complete user profile with basic info and student profile
  router.get(
    "/api/users/:id/complete-profile",
    async (ctx: RouterContext<"/api/users/:id/complete-profile">) => {
      try {
        const userId = parseInt(ctx.params.id);

        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        // Get user basic info
        const userQuery = `
        SELECT user_id, name, email, role, major, student_number, created_at, updated_at 
        FROM users 
        WHERE user_id = $1
      `;

        // Get student profile
        const profileQuery = `
        SELECT * FROM student_profiles 
        WHERE user_id = $1
      `;

        const [userResult, profileResult] = await Promise.all([
          database.query(userQuery, [userId]),
          database.query(profileQuery, [userId]),
        ]);

        if (userResult.rows.length === 0) {
          ctx.response.status = 404;
          ctx.response.body = { error: "User not found" };
          return;
        }

        // Parse preferred_course_types if it exists
        let profile = profileResult.rows[0] || null;
        if (
          profile &&
          profile.preferred_course_types &&
          typeof profile.preferred_course_types === "string"
        ) {
          try {
            profile.preferred_course_types = JSON.parse(
              profile.preferred_course_types
            );
          } catch (e) {
            console.error("Error parsing profile preferred_course_types:", e);
            profile.preferred_course_types = { preferred: [], avoid: [] };
          }
        }

        ctx.response.body = {
          user: userResult.rows[0],
          profile,
        };
      } catch (error) {
        console.error("Error fetching complete profile:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );

  // Update user basic info
  router.patch(
    "/api/users/:id",
    async (ctx: RouterContext<"/api/users/:id">) => {
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

        // Only allow updating specific fields
        const allowedFields = ["name", "major"];
        const updates = Object.keys(body)
          .filter((key) => allowedFields.includes(key))
          .map((key) => `${key} = $${allowedFields.indexOf(key) + 2}`)
          .join(", ");

        if (!updates) {
          ctx.response.status = 400;
          ctx.response.body = { error: "No valid fields to update" };
          return;
        }

        const query = `
        UPDATE users 
        SET ${updates}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id, name, email, role, major, created_at, updated_at
      `;

        const values = [userId, ...allowedFields.map((field) => body[field])];
        const result = await database.query(query, values);

        if (result.rows.length === 0) {
          ctx.response.status = 404;
          ctx.response.body = { error: "User not found" };
          return;
        }

        ctx.response.body = result.rows[0];
      } catch (error) {
        console.error("Error updating user:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );
}
