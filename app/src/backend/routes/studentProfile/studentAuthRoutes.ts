import { Router } from "../../../../deps.ts";
import { ProfileModel } from "../../../database/models/profile.ts";

export function setupStudentAuthRoutes(
  router: Router,
  database: any,
  authService?: any,
  auditLogger?: any
) {
  const profileModel = new ProfileModel(database);

  // Create/update student profile (auth required)
  router.post("/student", async (ctx: any) => {
    try {
      const body = await ctx.request.body().value;

      if (!body) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Request body is required" };
        return;
      }

      // Get user ID from auth context (you'll need to implement auth middleware)
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.response.status = 401;
        ctx.response.body = { error: "User not authenticated" };
        return;
      }

      // Transform data for storage
      const profileData = {
        user_id: userId,
        overall_gpa: body.gpa,
        year_of_study: body.year_of_study,
        expected_graduation: body.expected_graduation,
        personal_statement: body.personal_statement,
        teaching_experience: body.previous_ta_experience,
        relevant_coursework: body.relevant_coursework,
        technical_skills: body.technical_skills,
        preferred_course_types: body.preferred_course_types,
        specific_course_preferences: body.specific_course_preferences,
        weekly_availability:
          typeof body.weekly_availability === "object"
            ? JSON.stringify(body.weekly_availability)
            : body.weekly_availability,
        max_hours_per_week: body.max_hours_per_week,
        preferred_term: body.preferred_term,
        additional_notes: body.additional_notes,
      };

      const result = await profileModel.createOrUpdateStudentProfile(
        profileData
      );

      ctx.response.body = {
        message: "Student profile updated successfully",
        profile: result,
      };
    } catch (error) {
      console.error("Error updating student profile:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error" };
    }
  });

  // Get student profile (auth required)
  router.get("/student", async (ctx: any) => {
    try {
      // Get user ID from auth context
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.response.status = 401;
        ctx.response.body = { error: "User not authenticated" };
        return;
      }

      const profile = await profileModel.getStudentProfile(userId);

      if (!profile) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Profile not found" };
        return;
      }

      ctx.response.body = {
        profile: {
          ...profile,
          weekly_availability: profile.weekly_availability
            ? JSON.parse(profile.weekly_availability)
            : null,
        },
      };
    } catch (error) {
      console.error("Error fetching student profile:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error" };
    }
  });
}
