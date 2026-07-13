import { Router, RouterContext } from "../../../../deps.ts";
import { Database } from "../../../database/config.ts";
import { requireAuth } from "../../middleware/auth.ts";
import { AuthService } from "../../services/auth.ts";

export function setupAssignmentRoutes(
  router: Router,
  database: Database,
  authService?: AuthService
) {
  // Get student assignments for authenticated user
  router.get(
    "/api/users/:userId/assignments",
    authService ? requireAuth(authService) : (ctx: any, next: any) => next(),
    async (ctx: RouterContext<"/api/users/:userId/assignments">) => {
      try {
        const requestedUserId = parseInt(ctx.params.userId);
        const authenticatedUser = ctx.state.user;

        if (isNaN(requestedUserId)) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Invalid user ID" };
          return;
        }

        // Only allow users to access their own assignments (or admins)
        if (
          authenticatedUser.id !== requestedUserId &&
          authenticatedUser.role !== "admin"
        ) {
          ctx.response.status = 403;
          ctx.response.body = { error: "Access denied" };
          return;
        }

        // We need to import AllocationModel here
        const { AllocationModel } = await import(
          "../../../database/models/allocation.ts"
        );
        const allocationModel = new AllocationModel(database);

        const assignments = await allocationModel.getStudentAssignments(
          requestedUserId
        );

        ctx.response.status = 200;
        ctx.response.body = {
          assignments: assignments.map((assignment: any) => ({
            allocation_id: assignment.allocation_id,
            lab_section_id: assignment.lab_section_id,
            section_name: assignment.section_name,
            lab_days: assignment.lab_days,
            lab_start_time: assignment.lab_start_time,
            lab_end_time: assignment.lab_end_time,
            course_code: assignment.course_code,
            course_title: assignment.course_title,
            term: assignment.term,
            allocated_at: assignment.allocated_at,
            status: assignment.status,
            notes: assignment.notes,
            allocated_by_name: assignment.allocated_by_name,
            is_marker: assignment.is_marker,
          })),
        };
      } catch (error) {
        console.error("Error fetching student assignments:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to fetch student assignments" };
      }
    }
  );
}
