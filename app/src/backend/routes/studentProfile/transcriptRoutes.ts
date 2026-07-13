import { Router, RouterContext } from "../../../../deps.ts";
import { Database } from "../../../database/config.ts";
import { ProfileModel } from "../../../database/models/profile.ts";
import { handleFileUpload } from "../../utils/fileUpload.ts";

export function setupTranscriptRoutes(router: Router, database: Database) {
  const profileModel = new ProfileModel(database);

  // Upload unofficial transcript for student profile
  router.post(
    "/api/profile/:userId/transcript/upload",
    async (ctx: RouterContext<"/api/profile/:userId/transcript/upload">) => {
      try {
        const userId = parseInt(ctx.params.userId);
        if (isNaN(userId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }
        // Delete old transcript if it exists
        const profile = await profileModel.getStudentProfile(userId);
        if (profile && profile.transcript_url) {
          const oldPath = profile.transcript_url.startsWith("/")
            ? profile.transcript_url
            : `/${profile.transcript_url}`;
          try {
            await Deno.remove(oldPath);
            console.log("Deleted old transcript:", oldPath);
          } catch (err) {
            if (!(err instanceof Deno.errors.NotFound)) {
              console.error("Error deleting old transcript:", err);
            }
          }
        }
        // Use file upload utility
        const fileUrl = await handleFileUpload(ctx);
        if (!fileUrl) {
          ctx.response.status = 400;
          ctx.response.body = {
            error: "No file uploaded or invalid file type",
          };
          return;
        }
        // Update student profile with transcript_url
        const updatedProfile = await profileModel.createOrUpdateStudentProfile({
          user_id: userId,
          transcript_url: fileUrl,
        });
        ctx.response.body = {
          success: true,
          transcript_url: fileUrl,
          profile: updatedProfile,
        };
      } catch (error) {
        console.error("Transcript upload error:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    }
  );
}
