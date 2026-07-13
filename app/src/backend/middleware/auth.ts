import { Context, Status } from "../../../deps.ts";
import { AuthService } from "../services/auth.ts";

export interface AuthMiddlewareOptions {
  authService: AuthService;
  requiredRoles?: string[];
  checkOwnership?: boolean; // New option to enable ownership check
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    try {
      // Get access token from cookie
      const accessToken = await ctx.cookies.get("access_token");
      
      if (!accessToken) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "No access token provided" };
        return;
      }

      // Verify token
      const result = await options.authService.verifyToken(accessToken);
      
      if (!result.success || !result.user) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: result.error || "Invalid token" };
        return;
      }

      // Check role if required
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        if (!options.requiredRoles.includes(result.user.role)) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = { error: "Insufficient permissions" };
          return;
        }
      }

      // Extract and format user ID
      const userId = result.user.user_id;
      if (!userId) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid user data in token" };
        return;
      }

      // Add user to context state with properly formatted user ID
      ctx.state.user = {
        id: typeof userId === 'string' ? parseInt(userId) : userId,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role
      };
      
      console.log("Auth middleware - User ID set to:", ctx.state.user.id);

      // Check ownership if enabled
      if (options.checkOwnership) {
        // Try to get userId from ctx.state (if router attaches params there), otherwise from query string
        const requestedUserId = ctx.state?.params?.userId
          ? parseInt(ctx.state.params.userId)
          : ctx.request.url.searchParams.get('userId')
            ? parseInt(ctx.request.url.searchParams.get('userId')!)
            : null;

        if (requestedUserId && requestedUserId !== ctx.state.user.id) {
          ctx.response.status = Status.Forbidden;
          ctx.response.body = { error: "Access to this resource is forbidden" };
          return;
        }
      }
      
      await next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Authentication error" };
    }
  };
}

// Updated helper to include ownership check option
export function requireOwnership(authService: AuthService) {
  return createAuthMiddleware({ 
    authService,
    checkOwnership: true
  });
}

export function requireRole(authService: AuthService, ...roles: string[]) {
  return createAuthMiddleware({
    authService,
    requiredRoles: roles
  });
}

export function requireAuth(authService: AuthService) {
  return createAuthMiddleware({ authService });
}