import { Context, Router, Status, z } from "../../../deps.ts";
import { sanitizeInput, validate } from "../../database/middleware/security.ts";
import { loginSchema } from "../../database/schema.ts";
import { AuthService } from "../services/auth.ts";

export const authRouter = new Router();

// Apply input sanitization to all endpoints  
authRouter.use(sanitizeInput);

// Note: Auth endpoints now rely on global rate limiting only
// Removed duplicate rate limiting for better user experience

// Helper function for cookie options with security headers
function getCookieOptions() {
  const isProduction = Deno.env.get("ENVIRONMENT") === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" as const : "lax" as const,
    path: "/",
    domain: isProduction ? Deno.env.get("DOMAIN") : "localhost",
    partitioned: isProduction,
  };
}

// Initialize auth service
let authService: AuthService;

export function setAuthService(service: AuthService) {
  authService = service;
}

// Login endpoint with security enhancements
authRouter.post("/auth/login", 
  validate(loginSchema), 
  async (ctx: Context) => {
    try {
      const { email, password } = ctx.state.validatedData;
      
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
      
      const result = await authService.login(email, password);

      if (!result.success) {
        ctx.response.status = Status.Unauthorized;
        ctx.response.body = { error: "Invalid credentials" };
        return;
      }

      const cookieOptions = getCookieOptions();

      // Set security headers
      ctx.response.headers.set(
        "Strict-Transport-Security", 
        "max-age=63072000; includeSubDomains; preload"
      );
      ctx.response.headers.set("X-Content-Type-Options", "nosniff");
      ctx.response.headers.set("X-Frame-Options", "DENY");
      ctx.response.headers.set("X-XSS-Protection", "1; mode=block");

      ctx.cookies.set("access_token", result.accessToken!, {
        ...cookieOptions,
        maxAge: 60 * 60, // 1 hour
      });

      ctx.cookies.set("refresh_token", result.refreshToken!, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      ctx.response.status = Status.OK;
      ctx.response.body = {
        message: "Login successful",
        user: result.user,
      };
    } catch (error) {
      console.error("Login error:", error);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Internal server error" };
    }
  }
);

// Enhanced refresh token endpoint
authRouter.post("/auth/refresh", async (ctx: Context) => {
  try {
    const refreshToken = await ctx.cookies.get("refresh_token");

    if (!refreshToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No refresh token provided" };
      return;
    }

    // Validate token format before processing
    if (typeof refreshToken !== "string" || !refreshToken.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Invalid token format" };
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    if (!result.success) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: result.error };
      return;
    }

    const cookieOptions = getCookieOptions();

    ctx.cookies.set("access_token", result.accessToken!, {
      ...cookieOptions,
      maxAge: 60 * 60,
    });

    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Token refreshed successfully" };
  } catch (error) {
    console.error("Refresh token error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Update forgot-password endpoint to pass IP and user agent
authRouter.post("/auth/forgot-password", async (ctx: Context) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    
    // Validate input
    const forgotPasswordSchema = z.object({
      email: z.string().email("Invalid email format"),
    });

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        error: "Invalid input",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return;
    }

    const { email } = validation.data;

    // Get IP address and user agent for security logging
    const ipAddress = ctx.request.ip;
    const userAgent = ctx.request.headers.get("user-agent") || undefined;

    // Add delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 500));

    // Request password reset with OTP
    const result = await authService.requestPasswordReset(
      email.toLowerCase(), 
      ipAddress, 
      userAgent
    );

    // Always return success to prevent email enumeration
    ctx.response.status = Status.OK;
    ctx.response.body = { 
      message: "If the email exists in our system, a password reset code has been sent.",
      // In development, you might want to return the OTP for testing
      ...(globalThis.Deno?.env.get("DENO_ENV") === "development" && result.success 
        ? { dev_message: "Check console for OTP code" } 
        : {})
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Update reset-password endpoint to handle OTP
authRouter.post("/auth/reset-password", async (ctx: Context) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;

    // Validate input with OTP support
    const resetPasswordSchema = z.object({
      token: z.string().optional(), // Keep for backward compatibility
      otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits").optional(),
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
    }).refine((data) => data.token || data.otp, {
      message: "Either token or OTP is required",
      path: ["otp"],
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        error: "Invalid input",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return;
    }

    const { token, otp, password } = validation.data;

    // Use OTP if provided, otherwise fall back to token (for backward compatibility)
    const resetCode = otp || token || "";

    // Reset password
    const result = await authService.resetPassword(resetCode, password);

    if (!result.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: result.error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = { 
      message: "Password has been reset successfully. You can now log in with your new password." 
    };
  } catch (error) {
    console.error("Reset password error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Add endpoint to clean up expired OTPs (can be called by a cron job)
authRouter.delete("/auth/cleanup-otps-cron", async (ctx: Context) => {
  try {
    // Check for a secret header (for cron job authentication)
    const cronSecret = ctx.request.headers.get("X-Cron-Secret");
    const expectedSecret = globalThis.Deno?.env.get("CRON_SECRET");
    
    if (!expectedSecret || cronSecret !== expectedSecret) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }
    
    // Perform cleanup
    const count = await authService.userModel.clearExpiredOTPs();
    
    console.log(`[CRON] Cleaned up ${count} expired OTPs at ${new Date().toISOString()}`);
    
    ctx.response.status = Status.OK;
    ctx.response.body = { 
      success: true,
      message: `Cleaned up ${count} expired OTPs`,
      count: count,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("OTP cleanup cron error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { 
      success: false,
      error: "Cleanup failed" 
    };
  }
});

// Logout endpoint
authRouter.post("/auth/logout", async (ctx: Context) => {
  try {
    const refreshToken = await ctx.cookies.get("refresh_token");
    const accessToken = await ctx.cookies.get("access_token");
    
    // Get user info from access token for audit logging
    let user_id: number | undefined;
    let user_email: string | undefined;
    
    if (accessToken) {
      try {
        const tokenResult = await authService.verifyToken(accessToken);
        if (tokenResult.success && tokenResult.user) {
          user_id = tokenResult.user.user_id;
          user_email = tokenResult.user.email;
        }
      } catch (error) {
        // Token might be expired, that's okay for logout
        console.log("Could not verify token during logout (might be expired):", error);
      }
    }
    
    if (refreshToken) {
      await authService.logout(refreshToken, user_id, user_email);
    }

    // Clear cookies with maxAge: 0 (Oak.js converts this to expires= automatically)
    const cookieOptions = getCookieOptions();
    
    ctx.cookies.set("access_token", "", {
      ...cookieOptions,
      maxAge: 0,
    });
    
    ctx.cookies.set("refresh_token", "", {
      ...cookieOptions,
      maxAge: 0,
    });

    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Logged out successfully" };
  } catch (error) {
    console.error("Logout error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Refresh token endpoint
authRouter.post("/auth/refresh", async (ctx: Context) => {
  try {
    const refreshToken = await ctx.cookies.get("refresh_token");

    if (!refreshToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No refresh token provided" };
      return;
    }

    // Validate token format before processing
    if (typeof refreshToken !== "string" || !refreshToken.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: "Invalid token format" };
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    if (!result.success) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: result.error };
      return;
    }

    const cookieOptions = getCookieOptions();

    ctx.cookies.set("access_token", result.accessToken!, {
      ...cookieOptions,
      maxAge: 60 * 60, // 1 hour
    });

    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Token refreshed successfully" };
  } catch (error) {
    console.error("Refresh token error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Get current user endpoint
authRouter.get("/auth/me", async (ctx: Context) => {
  try {
    const accessToken = await ctx.cookies.get("access_token");

    if (!accessToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "No access token provided" };
      return;
    }

    const result = await authService.verifyToken(accessToken);

    if (!result.success) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: result.error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = {
      user: {
        user_id: result.user!.user_id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
      },
    };
  } catch (error) {
    console.error("Get user error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Registration validation schema
const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Invalid email format"),
    userType: z.enum(["student", "instructor"], {
      required_error: "User type is required",
    }),
    studentNumber: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      // If user type is student, student number is required
      if (data.userType === "student") {
        return data.studentNumber && data.studentNumber.trim().length > 0;
      }
      return true;
    },
    {
      message: "Student number is required for students",
      path: ["studentNumber"],
    }
  );

// Student registration endpoint (students only)
authRouter.post("/auth/register", async (ctx: Context) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;

    // Force userType to 'student' for public registration
    const registrationData = { ...body, userType: "student" };

    // Validate input
    const validation = registerSchema.safeParse(registrationData);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        error: "Invalid input",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return;
    }

    const { firstName, lastName, email, studentNumber, password } =
      validation.data;

    // Check if user already exists
    const existingUser = await authService.getUserByEmail(email);
    if (existingUser) {
      ctx.response.status = Status.Conflict;
      ctx.response.body = { error: "Email already registered" };
      return;
    }

    // Create student user
    const result = await authService.register({
      firstName,
      lastName,
      email,
      userType: "student", // Always student for public registration
      studentNumber,
      password,
    });

    if (!result.success) {
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: result.error };
      return;
    }

    const cookieOptions = getCookieOptions();

    // Set access token cookie (1 hour)
    ctx.cookies.set("access_token", result.accessToken!, {
      ...cookieOptions,
      maxAge: 60 * 60, // 1 hour
    });

    // Set refresh token cookie (7 days)
    ctx.cookies.set("refresh_token", result.refreshToken!, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    ctx.response.status = Status.Created;
    ctx.response.body = {
      message: "Registration successful",
      user: {
        user_id: result.user!.user_id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
      },
    };
  } catch (error) {
    console.error("Registration error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Forgot password endpoint
authRouter.post("/auth/forgot-password", async (ctx: Context) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;

    // Validate input
    const forgotPasswordSchema = z.object({
      email: z.string().email("Invalid email format"),
    });

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        error: "Invalid input",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return;
    }

    const { email } = validation.data;

    // Request password reset
    const result = await authService.requestPasswordReset(email);

    if (!result.success) {
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: result.error };
      return;
    }

    // Always return success to prevent email enumeration
    ctx.response.status = Status.OK;
    ctx.response.body = { 
      message: "If the email exists in our system, a password reset link has been sent." 
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Reset password endpoint
authRouter.post("/auth/reset-password", async (ctx: Context) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;

    // Validate input
    const resetPasswordSchema = z.object({
      token: z.string().min(1, "Reset token is required"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        error: "Invalid input",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return;
    }

    const { token, password } = validation.data;

    // Reset password
    const result = await authService.resetPassword(token, password);

    if (!result.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: result.error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = { 
      message: "Password has been reset successfully. You can now log in with your new password." 
    };
  } catch (error) {
    console.error("Reset password error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

authRouter.get("/auth/test-logging", async (ctx: Context) => {
  console.log("🔍 TEST: Console logging is working!");
  console.log("📊 Current time:", new Date().toISOString());
  console.log("🌍 Environment:", Deno.env.get("DENO_ENV"));
  console.log("🔧 All env vars:", {
    DENO_ENV: Deno.env.get("DENO_ENV"),
    ENVIRONMENT: Deno.env.get("ENVIRONMENT"),
    EMAIL_SERVICE_URL: Deno.env.get("EMAIL_SERVICE_URL") ? "Set" : "Not set",
    EMAIL_API_KEY: Deno.env.get("EMAIL_API_KEY") ? "Set" : "Not set",
  });
  
  ctx.response.status = Status.OK;
  ctx.response.body = { 
    message: "Logging test complete - check your console!",
    timestamp: new Date().toISOString(),
    environment: Deno.env.get("DENO_ENV") || "not set"
  };
});