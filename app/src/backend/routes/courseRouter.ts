import { Router, Context, Status, RouterContext } from "../../../deps.ts";
import { CourseModel } from "../../database/models/course.ts";
import { requireRole } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

export const courseRouter = new Router();

// Initialize models (to be injected)
let courseModel: CourseModel;
let authService: AuthService;

// Export functions to set dependencies
export function setCourseModel(model: CourseModel) {
    courseModel = model;
}

export function setCourseAuthService(service: AuthService) {
    authService = service;
}

// Get course by ID
courseRouter.get('/courses/:courseId', async (ctx: RouterContext<"/courses/:courseId">) => {
    const courseId = parseInt(ctx.params.courseId);
    
    try {
        const course = await courseModel.getCourseById(courseId);
        if (!course) {
            ctx.response.status = Status.NotFound;
            ctx.response.body = { error: "Course not found" };
            return;
        }
        
        ctx.response.status = Status.OK;
        ctx.response.body = course;
    } catch (error) {
        console.error("Error fetching course:", error);
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = { error: "Failed to fetch course" };
    }
});

// Update course (including max_tas)
courseRouter.patch(
    '/courses/:courseId',
    async (ctx: Context, next) => {
        await requireRole(authService, 'instructor')(ctx, next);
    },
    async (ctx: RouterContext<"/courses/:courseId">) => {
        const courseId = parseInt(ctx.params.courseId);
        const userId = ctx.state.user.id;

        // Verify instructor ownership
        const isInstructor = await courseModel.isInstructorOfCourse(courseId, userId);
        if (!isInstructor) {
            ctx.response.status = Status.Forbidden;
            ctx.response.body = { error: "You must be the course instructor" };
            return;
        }

        try {
            const updates = await ctx.request.body({ type: "json" }).value;
            
            // Validate max_tas if present
            if (updates.max_tas !== undefined && updates.max_tas <= 0) {
                ctx.response.status = Status.BadRequest;
                ctx.response.body = { error: "max_tas must be greater than 0" };
                return;
            }

            const updatedCourse = await courseModel.updateCourse(courseId, updates);
            ctx.response.status = Status.OK;
            ctx.response.body = updatedCourse;
        } catch (error) {
            console.error("Error updating course:", error);
            ctx.response.status = Status.InternalServerError;
            ctx.response.body = { error: "Failed to update course" };
        }
    }
);