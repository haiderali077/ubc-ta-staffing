// deno-lint-ignore-file no-explicit-any
import { Context, Router, Status, z } from "../../../deps.ts";
import { ApplicationModel } from "../../database/models/application.ts";
import { AuditLogModel } from "../../database/models/auditLog.ts";
import { UserModel } from "../../database/models/user.ts";
import { createAuthMiddleware } from "../middleware/auth.ts";
import { AuthService } from "../services/auth.ts";

export const adminRouter = new Router();


let authService: AuthService;
let userModel: UserModel;
let applicationModel: ApplicationModel;
let auditLogModel: AuditLogModel;

export function setAdminAuthService(service: AuthService) {
  authService = service;
}

export function setAdminModels(user: UserModel, application: ApplicationModel, auditLog: AuditLogModel) {
  userModel = user;
  applicationModel = application;
  auditLogModel = auditLog;
}

export let adminOnly: any;

export function initializeAdminMiddleware(authService: AuthService) {
  adminOnly = createAuthMiddleware({
    authService,
    requiredRoles: ['admin']
  });
}


// User creation validation schema for admin
const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email format"),
  role: z.enum(['instructor', 'ta_coordinator'], { required_error: "Role is required" }),
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters"),
  departmentId: z.number().optional(),
  notes: z.string().optional()
});

adminRouter.post("/admin/users/create", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }
    const body = await ctx.request.body({ type: "json" }).value;
    
    // Validate input
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        error: "Invalid input",
        details: validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
      return;
    }

    const { firstName, lastName, email, role, temporaryPassword, departmentId, notes } = validation.data;

    // Check if user already exists
    const existingUser = await authService.getUserByEmail(email);
    if (existingUser) {
      ctx.response.status = Status.Conflict;
      ctx.response.body = { error: "Email already registered" };
      return;
    }

    // Create user account (admin-created accounts)
    const result = await authService.createUserByAdmin({
      firstName,
      lastName,
      email,
      role,
      temporaryPassword,
      departmentId,
      notes
    });

    if (!result.success) {
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: result.error };
      return;
    }

    ctx.response.status = Status.Created;
    ctx.response.body = {
      message: "User account created successfully",
      user: {
        id: result.user!.user_id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role
      },
      temporaryPassword: temporaryPassword // Send back for admin to share
    };
  } catch (error) {
    console.error("User creation error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Admin endpoint to list all users
adminRouter.get("/admin/users", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }
    const users = await authService.getAllUsers();
    
    ctx.response.status = Status.OK;
    ctx.response.body = {
      users: users.map(user => ({
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentNumber: user.student_number,
        isActive: user.is_active ?? true, // Default to true if not set
        createdAt: user.created_at
      }))
    };
  } catch (error) {
    console.error("Get users error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Admin endpoint to update user role
adminRouter.put("/admin/users/:userId/role", async (ctx: Context) => {
  try {
    // 🔐 CRITICAL: Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    const currentAdminId = tokenResult.user.user_id;
    const { userId } = ctx.request.url.searchParams.has("userId")
      ? { userId: ctx.request.url.searchParams.get("userId") }
      : (ctx as any).params || {};
    const parsedUserId = parseInt(userId!);
    const body = await ctx.request.body({ type: "json" }).value;
    
    // 🚨 SECURITY: Only allow non-admin roles for regular role changes
    const roleUpdateSchema = z.object({
      role: z.enum(['student', 'instructor', 'ta_coordinator'], {
        errorMap: () => ({ message: "Admin role assignment is restricted. Use admin creation endpoint." })
      })
    });
    
    const validation = roleUpdateSchema.safeParse(body);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { 
        error: "Invalid role",
        details: validation.error.errors.map(err => err.message)
      };
      return;
    }

    // Prevent admins from changing their own role (could lock them out)
    if (userId === currentAdminId) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Cannot change your own role" };
      return;
    }

    const result = await authService.updateUserRole(userId, validation.data.role, currentAdminId);
    
    if (!result.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: result.error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = {
      message: "User role updated successfully",
      user: result.user
    };
  } catch (error) {
    console.error("Update role error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Admin endpoint to deactivate user
adminRouter.delete("/admin/users/:userId", async (ctx: Context & { params: { userId: string } }) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    const currentAdminId = tokenResult.user.user_id;
    const userId = parseInt(ctx.params.userId!);

    // Prevent admins from deactivating themselves
    if (userId === currentAdminId) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Cannot deactivate your own account" };
      return;
    }
    
    const result = await authService.deactivateUser(userId);
    
    if (!result.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: result.error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = { message: "User deactivated successfully" };
  } catch (error) {
    console.error("Deactivate user error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Admin endpoint to activate user
adminRouter.put("/admin/users/:userId/activate", async (ctx: Context & { params: { userId: string } }) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    const userId = parseInt(ctx.params.userId!);
    
    const result = await authService.activateUser(userId);
    
    if (!result.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: result.error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = { message: "User activated successfully" };
  } catch (error) {
    console.error("Activate user error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});


// Admin endpoint to create terms
adminRouter.post("/admin/terms", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    // Forward to TA coordinator logic (reuse existing functionality)
    const body = await ctx.request.body({ type: "json" }).value;
    const { name, start_date, end_date} = body;

    // Validate required fields
    if (!name || !start_date || !end_date) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Name, start_date, and end_date are required" };
      return;
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to beginning of day for fair comparison
    
    if (startDate < today) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Start date cannot be in the past" };
      return;
    }
    
    if (startDate >= endDate) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Start date must be before end date" };
      return;
    }

    // Admin can create terms (same logic as TA coordinator)
    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Admin term creation - redirect to TA coordinator endpoint" };
  } catch (error) {
    console.error("Admin term creation error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Admin endpoint to get all terms
adminRouter.get("/admin/terms", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    // Admin can view all terms (same logic as TA coordinator)
    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Admin term listing - redirect to TA coordinator endpoint" };
  } catch (error) {
    console.error("Admin term listing error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Admin endpoint to create courses
adminRouter.post("/admin/courses", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    // Forward to TA coordinator logic (reuse existing functionality)
    const body = await ctx.request.body({ type: "json" }).value;
    const { code, title, term } = body;

    // Validate required fields
    if (!code || !title || !term) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Code, title, and term are required" };
      return;
    }

    // Admin can create courses (same logic as TA coordinator)
    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Admin course creation - redirect to TA coordinator endpoint" };
  } catch (error) {
    console.error("Admin course creation error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Admin endpoint to get all courses
adminRouter.get("/admin/courses", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    // Admin can view all courses (same logic as TA coordinator)
    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Admin course listing - redirect to TA coordinator endpoint" };
  } catch (error) {
    console.error("Admin course listing error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});


// Get admin dashboard statistics
adminRouter.get("/admin/dashboard/stats", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    // Get real stats from database
    const [usersResult, applicationsResult, alertsResult] = await Promise.all([
      // Total users count
      userModel.getAllUsers().then((users: any) => users.length),
      // Active applications count  
      applicationModel.getApplicationStats(),
      // System alerts - for now just return 0 (can be enhanced later)
      Promise.resolve(0)
    ]);

    const stats = {
      totalUsers: usersResult,
      activeApplications: applicationsResult.pending + applicationsResult.approved,
      pendingApprovals: applicationsResult.pending,
      systemAlerts: alertsResult
    };

    ctx.response.status = Status.OK;
    ctx.response.body = stats;
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Get recent system activity for admin dashboard
adminRouter.get("/admin/dashboard/recent-activity", async (ctx: Context) => {
  try {
    // Check if user is admin
    const accessToken = await ctx.cookies.get("access_token");
    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const tokenResult = await authService.verifyToken(accessToken);
    if (!tokenResult.success || tokenResult.user?.role !== 'admin') {
      ctx.response.status = Status.Forbidden;
      ctx.response.body = { error: "Admin access required" };
      return;
    }

    // Get recent audit logs (last 5 activities)
    const recentActivity = await auditLogModel.getLogs({}, 5, 0);

    ctx.response.status = Status.OK;
    ctx.response.body = {
      activities: recentActivity.logs
    };
  } catch (error) {
    console.error("Admin recent activity error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

export default adminRouter;