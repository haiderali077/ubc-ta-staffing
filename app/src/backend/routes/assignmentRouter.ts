import { Router } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { requireAuth } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

export function setupAssignmentRoutes(router: Router, database: Database) {
  const authService = new AuthService(database);

  // Get assignment calendar/summary for a user
  router.get("/api/users/:id/assignments", 
    async (ctx, next) => {
      await requireAuth(authService)(ctx, next);
    },
    async (ctx) => {
      const userId = parseInt(ctx.params.id);
      if (isNaN(userId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid user ID" };
        return;
      }

      // Authorization check - users can only view their own assignments unless admin/coordinator
      if (ctx.state.user.id !== userId && 
          ctx.state.user.role !== 'admin' && 
          ctx.state.user.role !== 'ta_coordinator' &&
          ctx.state.user.role !== 'instructor') {
        ctx.response.status = 403;
        ctx.response.body = { error: "Access denied" };
        return;
      }

      // Mock data response
      ctx.response.body = [
        {
          id: 1,
          type: "Lab",
          course: "COSC 499",
          date: "2024-09-10",
          time: "10:00-12:00",
        },
        {
          id: 2,
          type: "Marking",
          course: "COSC 425",
          date: "2024-09-12",
          time: "14:00-16:00",
        },
        {
          id: 3,
          type: "Prep",
          course: "COSC 310",
          date: "2024-09-15",
          time: "09:00-11:00",
        },
        {
          id: 4,
          type: "Coordination",
          course: "COSC 320",
          date: "2024-09-18",
          time: "13:00-15:00",
        },
        {
          id: 5,
          type: "Final Exam",
          course: "COSC 304",
          date: "2024-12-10",
          time: "08:00-11:00",
        },
      ];
    }
  );

  // Get student availability for allocation conflict checking
  router.get("/api/allocations/student-availability/:userId",
    async (ctx, next) => {
      await requireAuth(authService)(ctx, next);
    },
    async (ctx) => {
      const userId = parseInt(ctx.params.userId);
      if (isNaN(userId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid user ID" };
        return;
      }

      // Authorization check - only coordinators and admins can access this
      if (ctx.state.user.role !== 'admin' && ctx.state.user.role !== 'ta_coordinator') {
        ctx.response.status = 403;
        ctx.response.body = { error: "Access denied" };
        return;
      }

      try {
        // Get student's availability from their profile
        const query = `
          SELECT weekly_availability 
          FROM student_profiles 
          WHERE user_id = $1
        `;
        
        const result = await database.query(query, [userId]);
        
        if (result.rows.length === 0) {
          ctx.response.status = 404;
          ctx.response.body = { error: "Student profile not found" };
          return;
        }

        const availability = result.rows[0].weekly_availability;
        
        ctx.response.status = 200;
        ctx.response.body = { 
          availability: availability || null 
        };
      } catch (error) {
        console.error("Error fetching student availability:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to fetch student availability" };
      }
    }
  );
}

