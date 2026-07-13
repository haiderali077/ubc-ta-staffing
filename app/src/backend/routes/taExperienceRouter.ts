import { Context, Router, RouterContext } from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { ProfileModel } from "../../database/models/profile.ts";
import { requireAuth } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

export const taExperienceRouter = new Router();

// Initialize dependencies (to be injected)
let profileModel: ProfileModel;
let authService: AuthService;

export function setTAExperienceModels(
    profileModelParam: ProfileModel,
    authServiceParam: AuthService
) {
    profileModel = profileModelParam;
    authService = authServiceParam;
}

// Alternative: Create models here if you prefer
export function setupTAExperienceRoutes(router: Router, database: Database, auth: AuthService) {
    const profile = new ProfileModel(database);
    authService = auth;
    profileModel = profile;
    
    setupRoutes(router);
}

function setupRoutes(router: Router) {
    // UR4.2: Get TA Experience and Skills
    router.get('/api/ta/users/:id/experience', 
        async (ctx: Context, next) => {
            await requireAuth(authService)(ctx, next);
        },
        async (ctx: RouterContext<"/api/ta/users/:id/experience">) => {
            try {
                const userId = parseInt(ctx.params.id);
                
                if (isNaN(userId)) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Invalid user ID" };
                    return;
                }
                
                // Authorization: Users can only access their own data
                if (ctx.state.user.id !== userId && ctx.state.user.role !== 'admin') {
                    ctx.response.status = 403;
                    ctx.response.body = { error: "Access denied" };
                    return;
                }
                
                // Get TA experience from profile
                const profile = await profileModel.getStudentProfile(userId);
                
                if (!profile) {
                    ctx.response.status = 404;
                    ctx.response.body = { error: "Profile not found" };
                    return;
                }
                
                ctx.response.body = {
                    teaching_experience: profile.teaching_experience,
                    technical_skills: profile.technical_skills,
                    relevant_coursework: profile.relevant_coursework,
                    // Note: prev_roles might be in users table, not student_profiles
                    previous_ta_roles: null // TODO: Get from users.prev_roles if needed
                };
            } catch (error) {
                console.error("Error fetching TA experience:", error);
                ctx.response.status = 500;
                ctx.response.body = { error: "Internal server error" };
            }
        }
    );

    // UR4.2: Update TA Experience
    router.put('/api/ta/users/:id/experience',
        async (ctx: Context, next) => {
            await requireAuth(authService)(ctx, next);
        },
        async (ctx: RouterContext<"/api/ta/users/:id/experience">) => {
            try {
                const userId = parseInt(ctx.params.id);
                
                if (isNaN(userId)) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Invalid user ID" };
                    return;
                }
                
                // Authorization: Users can only update their own data
                if (ctx.state.user.id !== userId) {
                    ctx.response.status = 403;
                    ctx.response.body = { error: "Access denied" };
                    return;
                }
                
                const body = await ctx.request.body().value;
                
                if (!body) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Missing request body" };
                    return;
                }
                
                // Update profile data
                const profileData = {
                    user_id: userId,
                    teaching_experience: body.teaching_experience,
                    technical_skills: body.technical_skills,
                    relevant_coursework: body.relevant_coursework
                };
                
                const updatedProfile = await profileModel.createOrUpdateStudentProfile(profileData);
                
                ctx.response.body = { 
                    success: true, 
                    message: "TA experience updated successfully",
                    experience: {
                        teaching_experience: updatedProfile.teaching_experience,
                        technical_skills: updatedProfile.technical_skills,
                        relevant_coursework: updatedProfile.relevant_coursework
                    }
                };
            } catch (error) {
                console.error("Error updating TA experience:", error);
                ctx.response.status = 500;
                ctx.response.body = { error: "Internal server error" };
            }
        }
    );

    // UR4.2: ADD MISSING PROFILE ROUTE THAT TESTS EXPECT
    router.put('/api/ta/users/:id/profile',
        async (ctx: Context, next) => {
            await requireAuth(authService)(ctx, next);
        },
        async (ctx: RouterContext<"/api/ta/users/:id/profile">) => {
            try {
                const userId = parseInt(ctx.params.id);
                
                if (isNaN(userId)) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Invalid user ID" };
                    return;
                }
                
                // Authorization: Users can only update their own data
                if (ctx.state.user.id !== userId) {
                    ctx.response.status = 403;
                    ctx.response.body = { error: "Access denied" };
                    return;
                }
                
                const body = await ctx.request.body().value;
                
                if (!body) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Missing request body" };
                    return;
                }
                
                // Update the profile using ProfileModel
                const profileData = {
                    user_id: userId,
                    teaching_experience: body.teaching_experience,
                    technical_skills: body.technical_skills,
                    relevant_coursework: body.relevant_coursework,
                    personal_statement: body.personal_statement,
                    overall_gpa: body.overall_gpa,
                    expected_graduation: body.expected_graduation
                };
                
                const updatedProfile = await profileModel.createOrUpdateStudentProfile(profileData);
                
                ctx.response.status = 200;
                ctx.response.body = { 
                    message: "Profile updated successfully",
                    profile_id: updatedProfile.profile_id 
                };
            } catch (error) {
                console.error("Error updating profile:", error);
                ctx.response.status = 500;
                ctx.response.body = { error: "Internal server error" };
            }
        }
    );

    // UR4.4: Get Weekly Availability
    router.get('/api/ta/users/:id/availability',
        async (ctx: Context, next) => {
            await requireAuth(authService)(ctx, next);
        },
        async (ctx: RouterContext<"/api/ta/users/:id/availability">) => {
            try {
                const userId = parseInt(ctx.params.id);
                
                if (isNaN(userId)) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Invalid user ID" };
                    return;
                }
                
                // Authorization: Users can only access their own data or admin can access all
                if (ctx.state.user.id !== userId && ctx.state.user.role !== 'admin') {
                    ctx.response.status = 403;
                    ctx.response.body = { error: "Access denied" };
                    return;
                }
                
                const profile = await profileModel.getStudentProfile(userId);
                
                if (!profile) {
                    ctx.response.status = 404;
                    ctx.response.body = { error: "Profile not found" };
                    return;
                }
                
                // Parse availability if it's stored as JSON string
                let availability = {};
                try {
                    availability = profile.weekly_availability ? 
                        JSON.parse(profile.weekly_availability) : {};
                } catch (e) {
                    availability = { raw: profile.weekly_availability };
                }
                
                ctx.response.body = {
                    weekly_availability: availability,
                    max_hours_per_week: profile.max_hours_per_week,
                    preferred_term: profile.preferred_term
                };
            } catch (error) {
                console.error("Error fetching availability:", error);
                ctx.response.status = 500;
                ctx.response.body = { error: "Internal server error" };
            }
        }
    );

    // UR4.4: Update Weekly Availability
    router.put('/api/ta/users/:id/availability',
        async (ctx: Context, next) => {
            await requireAuth(authService)(ctx, next);
        },
        async (ctx: RouterContext<"/api/ta/users/:id/availability">) => {
            try {
                const userId = parseInt(ctx.params.id);
                
                if (isNaN(userId)) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Invalid user ID" };
                    return;
                }
                
                // Authorization: Users can only update their own data
                if (ctx.state.user.id !== userId) {
                    ctx.response.status = 403;
                    ctx.response.body = { error: "Access denied" };
                    return;
                }
                
                const body = await ctx.request.body().value;
                
                if (!body) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Missing request body" };
                    return;
                }
                
                // Validate max_hours_per_week
                if (body.max_hours_per_week && (isNaN(body.max_hours_per_week) || body.max_hours_per_week < 0)) {
                    ctx.response.status = 400;
                    ctx.response.body = { error: "Invalid max hours per week" };
                    return;
                }
                
                const profileData = {
                    user_id: userId,
                    weekly_availability: typeof body.weekly_availability === 'string' ?
                        body.weekly_availability : JSON.stringify(body.weekly_availability),
                    max_hours_per_week: body.max_hours_per_week,
                    preferred_term: body.preferred_term
                };
                
                const updatedProfile = await profileModel.createOrUpdateStudentProfile(profileData);
                
                ctx.response.status = 200;
                ctx.response.body = { 
                    success: true, 
                    message: "Availability updated successfully",
                    max_hours_per_week: updatedProfile.max_hours_per_week,
                    weekly_availability: updatedProfile.weekly_availability,
                    preferred_term: updatedProfile.preferred_term
                };
            } catch (error) {
                console.error("Error updating availability:", error);
                ctx.response.status = 500;
                ctx.response.body = { error: "Internal server error" };
            }
        }
    );
}

// If using the injection pattern
export function initializeTARoutes() {
    setupRoutes(taExperienceRouter);
}