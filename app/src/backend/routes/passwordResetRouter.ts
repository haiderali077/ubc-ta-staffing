import { Context, Router, Status, z } from "../../../deps.ts";
import { UserModel } from "../../database/models/user.ts";
import { AuditLogger } from "../services/auditLogger.ts";
import { emailService } from "../services/email.ts";

const passwordResetRouter = new Router();

// Dependencies
let userModel: UserModel;
let auditLogger: AuditLogger;

export function setPasswordResetDependencies(
  userModelInstance: UserModel,
  auditLoggerInstance: AuditLogger
) {
  userModel = userModelInstance;
  auditLogger = auditLoggerInstance;
}

// Validation schemas - CHANGED TO 6 DIGITS
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be 6 digits"), // Changed from 5 to 6
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be 6 digits"), // Changed from 5 to 6
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Generate a random 6-digit OTP code - CHANGED TO 6 DIGITS
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits now
}

/**
 * POST /auth/forgot-password
 * Initiates password reset by sending OTP to email
 */
passwordResetRouter.post("/auth/forgot-password", async (ctx: Context) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    
    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = {
        error: "Invalid input",
        details: validation.error.errors,
      };
      return;
    }

    const { email } = validation.data;
    const ipAddress = ctx.request.ip;
    const userAgent = ctx.request.headers.get("user-agent") || undefined;

    console.log(`🔑 Password reset requested for: ${email}`);

    // Check if user exists
    const user = await userModel.getUserByEmail(email);
    
    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate OTP
      const otpCode = generateOTP();
      
      // Store OTP in database
      await userModel.createPasswordResetOTP(
        user.user_id!,
        otpCode,
        ipAddress,
        userAgent
      );

      // Send OTP via email (regardless of development mode)
      const emailResult = await emailService.sendPasswordResetOTP(
        user.email,
        otpCode,
        user.name
      );

      if (emailResult.success) {
        console.log(`✅ OTP sent successfully to ${email}`);
        
        // ALWAYS DISPLAY THE OTP IN THE CONSOLE
        console.log("\n");
        console.log("=".repeat(60));
        console.log(`🔑 OTP CODE GENERATED`);
        console.log("=".repeat(60));
        console.log(`💡 OTP: ${otpCode}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 User: ${user.name}`);
        console.log(`🆔 User ID: ${user.user_id}`);
        console.log(`⏱️ Expires: 15 minutes`);
        console.log(`📅 Created: ${new Date().toISOString()}`);
        console.log("=".repeat(60));
        console.log("\n");
        
        // Log successful OTP send
        await auditLogger.logAuth(
          'PASSWORD_RESET_OTP_SENT',
          user.user_id ?? null,
          user.email,
          true,
          undefined,
          `OTP sent to ${email}`
        );
      } else {
        console.error(`❌ Failed to send OTP email: ${emailResult.error}`);
        
        // Still log the OTP for debugging
        console.log("\n");
        console.log("⚠️ EMAIL FAILED - HERE'S YOUR OTP FOR DEBUGGING");
        console.log("=".repeat(40));
        console.log(`🔢 OTP Code: ${otpCode}`);
        console.log(`📧 Email: ${email}`);
        console.log("=".repeat(40));
        console.log("\n");
        
        // Log failed OTP send
        await auditLogger.logAuth(
          'PASSWORD_RESET_REQUEST',
          user.user_id ?? null,
          user.email,
          false,
          emailResult.error,
          'Failed to send OTP email'
        );
      }
    }

    // Always return success to prevent email enumeration
    ctx.response.status = Status.OK;
    ctx.response.body = {
      message: "If that email is registered, a reset code has been sent.",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = { error: "Internal server error" };
  }
});

export { passwordResetRouter };
