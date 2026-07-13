import { Context, Router, RouterContext, Status } from "../../../deps.ts";
import { CourseModel } from "../../database/models/course.ts";
import { TANeedModel } from "../../database/models/taNeed.ts";
import { requireRole } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

export const taNeedRouter = new Router();

// Initialize models (to be injected)
let taNeedModel: TANeedModel;
let courseModel: CourseModel;
let authService: AuthService; // Add authService

export function setTANeedModels(
    needModel: TANeedModel, 
    courseModelParam: CourseModel,
    authServiceParam: AuthService // Add this parameter
) {
    taNeedModel = needModel;
    courseModel = courseModelParam;
    authService = authServiceParam; // Initialize authService
}

// Create a new TA need
taNeedRouter.post('/courses/:courseId/needs',

    async (ctx: Context, next) => {
            // Dynamically check role at runtime after authService is set
            await requireRole(authService, 'instructor')(ctx, next);
    },
    
    async (ctx: RouterContext<"/courses/:courseId/needs">) => {
        const courseId = parseInt(ctx.params.courseId);
        const userId = ctx.state.user.id;

        // Verify the user is the instructor of this course
        const isInstructor = await courseModel.isInstructorOfCourse(courseId, userId);
        if (!isInstructor) {
            ctx.response.status = Status.Forbidden;
            ctx.response.body = { error: "You must be the course instructor" };
            return;
        }

        try {
            const body = await ctx.request.body({ type: "json" }).value;
            const { hours_required, notes, qualifications, lab_tutorial_skills, status } = body;

            // Validate course exists
            const course = await courseModel.getCourseById(courseId);
            if (!course) {
                ctx.response.status = Status.NotFound;
                ctx.response.body = { error: "Course not found" };
                return;
            }

            // Set reasonable upper limit for TA hours (instructors determine their needs)
            if (hours_required > 80) {
                ctx.response.status = Status.BadRequest;
                ctx.response.body = { 
                    error: "Cannot request more than 80 hours per course",
                    maxAllowed: 80
                };
                return;
            }

            const newNeed = await taNeedModel.createNeed({
                course_id: courseId,
                hours_required,
                notes,
                qualifications,
                lab_tutorial_skills,
                status: status || 'open'
            });

            ctx.response.status = Status.Created;
            ctx.response.body = newNeed;
        } catch (error) {
            console.error("Error creating TA need:", error);
            ctx.response.status = Status.InternalServerError;
            ctx.response.body = { error: "Failed to create TA need" };
        }
    }
);

// Get all TA needs for a course
taNeedRouter.get(
    '/courses/:courseId/needs',
    
    async (ctx: RouterContext<"/courses/:courseId/needs">) => {
        const courseId = parseInt(ctx.params.courseId);
        
        try {
            const needs = await taNeedModel.getNeedsByCourse(courseId);
            ctx.response.status = Status.OK;
            ctx.response.body = needs;
        } catch (error) {
            console.error("Error fetching TA needs:", error);
            ctx.response.status = Status.InternalServerError;
            ctx.response.body = { error: "Failed to fetch TA needs" };
        }
    }
);

// Update a TA need
taNeedRouter.put(
    '/needs/:needId',
    async (ctx: Context, next) => {
            await requireRole(authService, 'instructor')(ctx, next);
        },
    async (ctx: RouterContext<"/needs/:needId">) => {
        const needId = parseInt(ctx.params.needId);
        
        try {
            const existingNeed = await taNeedModel.getNeedById(needId);
            if (!existingNeed) {
                ctx.response.status = Status.NotFound;
                ctx.response.body = { error: "TA need not found" };
                return;
            }

            const isInstructor = await courseModel.isInstructorOfCourse(
                existingNeed.course_id, 
                ctx.state.user.id
            );
            if (!isInstructor) {
                ctx.response.status = Status.Forbidden;
                ctx.response.body = { error: "You must be the course instructor" };
                return;
            }

            const body = await ctx.request.body({ type: "json" }).value;
            const updates = {
                hours_required: body.hours_required,
                notes: body.notes,
                qualifications: body.qualifications,
                lab_tutorial_skills: body.lab_tutorial_skills,
                status: body.status
            };

            // Validate reasonable upper limit for TA hours
            if (updates.hours_required && updates.hours_required > 80) {
                ctx.response.status = Status.BadRequest;
                ctx.response.body = { 
                    error: "Cannot request more than 80 hours per course",
                    maxAllowed: 80
                };
                return;
            }

            const updatedNeed = await taNeedModel.updateNeed(needId, updates);
            ctx.response.status = Status.OK;
            ctx.response.body = updatedNeed;
        } catch (error) {
            console.error("Error updating TA need:", error);
            ctx.response.status = Status.InternalServerError;
            ctx.response.body = { error: "Failed to update TA need" };
        }
    }
);

// Delete a TA need
taNeedRouter.delete(
    '/needs/:needId',
    async (ctx: Context, next) => {
            await requireRole(authService, 'instructor')(ctx, next);
        },
    async (ctx: RouterContext<"/needs/:needId">) => {
        const needId = parseInt(ctx.params.needId);
        
        try {
            const existingNeed = await taNeedModel.getNeedById(needId);
            if (!existingNeed) {
                ctx.response.status = Status.NotFound;
                ctx.response.body = { error: "TA need not found" };
                return;
            }

            const isInstructor = await courseModel.isInstructorOfCourse(
                existingNeed.course_id, 
                ctx.state.user.id
            );
            if (!isInstructor) {
                ctx.response.status = Status.Forbidden;
                ctx.response.body = { error: "You must be the course instructor" };
                return;
            }

            const success = await taNeedModel.deleteNeed(needId);
            ctx.response.status = success ? Status.OK : Status.NotFound;
            ctx.response.body = { success };
        } catch (error) {
            console.error("Error deleting TA need:", error);
            ctx.response.status = Status.InternalServerError;
            ctx.response.body = { error: "Failed to delete TA need" };
        }
    }
);

// Test route for TA Coordinator role verification
taNeedRouter.get(
    '/ta-coordinator/test',
    async (ctx: Context, next) => {
        await requireRole(authService, 'ta_coordinator')(ctx, next);
    },
    async (ctx: Context) => {
        ctx.response.status = Status.OK;
        ctx.response.body = { 
            message: "TA Coordinator role authenticated successfully",
            user: ctx.state.user 
        };
    }
);