import {
  compareHash,
  createJWT,
  hashPassword,
  verifyJWT,
} from "../../../deps.ts";
import { Database } from "../../database/config.ts";
import { ProfileModel } from "../../database/models/profile.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import {
  User,
  UserModel,
  UserWithoutPassword,
} from "../../database/models/user.ts";
import { AuditLogger } from './auditLogger.ts';
import { emailService } from "./email.ts";

export interface LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: UserWithoutPassword;
  error?: string;
}

export interface TokenVerificationResult {
  success: boolean;
  user?: UserWithoutPassword;
  error?: string;
}

export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  [key: string]: any;
}

export interface RegisterResult {
  success: boolean;
  user?: UserWithoutPassword;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export class AuthService {
  userModel: UserModel;
  private jwtSecret: string;
  private refreshSecret: string;
  private jwtKey: Promise<CryptoKey>;
  private refreshKey: Promise<CryptoKey>;
  private profileModel: ProfileModel;
  private auditLogger: AuditLogger;
  private systemSettingsModel: SystemSettingsModel;

  constructor(database: Database, systemSettingsModel?: SystemSettingsModel) {
    this.userModel = new UserModel(database);
    this.profileModel = new ProfileModel(database);
    this.auditLogger = new AuditLogger(database);
    this.systemSettingsModel = systemSettingsModel || new SystemSettingsModel(database);

    // Get JWT secrets from environment variables
    this.jwtSecret = globalThis.Deno.env.get("JWT_SECRET") || "your-secret-key-change-in-production";
    this.refreshSecret = globalThis.Deno.env.get("REFRESH_SECRET") || "your-refresh-secret-change-in-production";

    if (this.jwtSecret === "your-secret-key-change-in-production") {
      console.warn(
        "⚠️  WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!"
      );
    }

    // Pre-create CryptoKey objects for consistent usage
    this.jwtKey = this.createCryptoKey(this.jwtSecret);
    this.refreshKey = this.createCryptoKey(this.refreshSecret);
  }

  private generateOTP(): string { // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async createCryptoKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    try {
      return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );
    } catch (error) {
      console.error("Error creating crypto key:", error);
      throw error;
    }
  }


  async login(email: string, password: string): Promise<LoginResult> {
  try {
    const user = await this.userModel.getUserByEmail(email);
    if (!user) {
      // Log failed login attempt
      await this.auditLogger.logAuth(
        'LOGIN_FAILED',
        null,
        email,
        false,
        'Invalid credentials',
        `Failed login attempt for ${email}`
      );
      return { success: false, error: "Invalid credentials" };
    }

      // Check if user is active
      if (user.is_active === false) {
        // Log failed login attempt for inactive account
        await this.auditLogger.logAuth(
          'LOGIN_FAILED',
          user.user_id!,
          user.email,
          false,
          'Account deactivated',
          `Login attempt for deactivated account: ${user.email}`
        );
        return { success: false, error: "Account has been deactivated. Please contact an administrator." };
      }

    const passwordValid = await compareHash(password, user.password_hash);
    if (!passwordValid) {
      // Log failed login attempt
      await this.auditLogger.logAuth(
        'LOGIN_FAILED',
        user.user_id!,
        user.email,
        false,
        'Invalid credentials',
        `Failed login attempt for ${user.email}`
      );
      return { success: false, error: "Invalid credentials" };
    }

    // Generate tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Store refresh token
    await this.userModel.storeRefreshToken(user.user_id!, refreshToken);

    // Log successful login
    await this.auditLogger.logAuth(
      'LOGIN',
      user.user_id!,
      user.email,
      true,
      undefined,
      `Successful login for ${user.role}: ${user.email}`
    );

    const { password_hash, ...userWithoutPassword } = user;
    return {
      success: true,
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

  async logout(refreshToken: string, user_id?: number, user_email?: string): Promise<void> {
    try {
      // Remove refresh token from database
      await this.userModel.removeRefreshToken(refreshToken);
      
      // Log successful logout
      if (user_id && user_email) {
        await this.auditLogger.logAuth(
          'LOGOUT',
          user_id,
          user_email,
          true,
          undefined,
          `User logged out: ${user_email}`
        );
      }
    } catch (error) {
      console.error("Logout service error:", error);
      // Don't throw error, just log it
    }
  }

  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      // Verify JWT token using CryptoKey
      const key = await this.jwtKey;
      const payload = (await verifyJWT(token, key)) as JWTPayload;

    // Get user from database to ensure they still exist and are active
    const user = await this.userModel.getUserById(parseInt(payload.sub));
    if (!user) {
      return { success: false, error: "User not found" };
    }

      // Check if user is active
      if (user.is_active === false) {
        return { success: false, error: "Account has been deactivated" };
      }

    // Return user data (without password hash)
    const { password_hash, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error("Token verification error:", error);
      return { success: false, error: "Invalid or expired token" };
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    try {
      // Verify refresh token using CryptoKey
      const key = await this.refreshKey;
      const payload = (await verifyJWT(refreshToken, key)) as JWTPayload;

      // Check if refresh token exists in database
      const isValidRefreshToken = await this.userModel.isValidRefreshToken(
        refreshToken
      );
      if (!isValidRefreshToken) {
        return { success: false, error: "Invalid refresh token" };
      }

      // Get user from database
      const user = await this.userModel.getUserById(parseInt(payload.sub));
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Generate new access token
      const accessToken = await this.generateAccessToken(user);

      return {
        success: true,
        accessToken,
      };
    } catch (error) {
      console.error("Refresh token error:", error);
      return { success: false, error: "Invalid or expired refresh token" };
    }
  }

  public async generateAccessToken(user: User): Promise<string> {
  if (!user.user_id) {
    throw new Error("Cannot generate token - user_id is missing");
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Get session timeout from system settings, default to 30 minutes if not found
  let sessionTimeoutMinutes = 30;
  try {
    const timeoutSetting = await this.systemSettingsModel.getSettingByKey('session_timeout_minutes');
    if (timeoutSetting && timeoutSetting.value) {
      const parsedTimeout = parseInt(timeoutSetting.value);
      if (!isNaN(parsedTimeout) && parsedTimeout > 0) {
        sessionTimeoutMinutes = parsedTimeout;
      }
    }
  } catch (error) {
    console.warn('Failed to get session timeout setting, using default 30 minutes:', error);
  }
  
  const exp = now + (sessionTimeoutMinutes * 60); // Convert minutes to seconds

    const payload: JWTPayload = {
      sub: user.user_id.toString(),
      email: user.email,
      role: user.role,
      iat: now,
      exp: exp,
    };

  try {
    const key = await this.jwtKey;
    return await createJWT({ alg: "HS256" }, payload, key);
  } catch (error) {
    console.error("Token generation error:", error);
    throw new Error("Failed to generate access token");
  }
}

  private async generateRefreshToken(user: User): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 7 * 24 * 60 * 60; // 7 days

    // Check if user_id exists and is not undefined
    if (user.user_id === undefined) {
      throw new Error("User ID is undefined when generating refresh token");
    }

    const payload: JWTPayload = {
      sub: user.user_id.toString(),
      email: user.email,
      role: user.role,
      iat: now,
      exp: exp,
    };

    // Use CryptoKey for JWT creation
    const key = await this.refreshKey;
    return await createJWT({ alg: "HS256" }, payload, key);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userModel.getUserByEmail(email);
  }

  async removeRefreshToken(refreshToken: string): Promise<void> {
    await this.userModel.removeRefreshToken(refreshToken);
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    userType: "student" | "instructor";
    studentNumber?: string;
    password: string;
  }): Promise<RegisterResult> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.getUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: "Email already registered" };
      }

      // Hash password
      const passwordHash = await hashPassword(userData.password);

      // Create user
      const user = await this.userModel.createUser({
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        password_hash: passwordHash,
        role: userData.userType,
        student_number: userData.studentNumber,
        major: undefined, // Can be updated later
        prev_roles: undefined,
      });

      if (!user.user_id) {
        throw new Error("User ID missing after user creation");
      }

      // If student, create minimal student profile
      if (userData.userType === "student") {
        await this.profileModel.createOrUpdateStudentProfile({
          user_id: user.user_id,
        });
      }

      // Return user data without password
      const { password_hash, ...userWithoutPassword } = user;

      // Generate tokens
      const accessToken = await this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);

      // Store refresh token in database
      await this.userModel.storeRefreshToken(user.user_id, refreshToken);

      return {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error("Registration service error:", error);
      return { success: false, error: "Registration failed" };
    }
  }

  async updateUserRole(userId: number, newRole: 'student' | 'instructor' | 'ta_coordinator', adminId?: number): Promise<{success: boolean, user?: UserWithoutPassword, error?: string}> {
    try {
      // Get the user being updated to check current role
      const targetUser = await this.userModel.getUserById(userId);
      if (!targetUser) {
        return { success: false, error: "User not found" };
      }

      // Prevent changing admin roles through this method for security
      if (targetUser.role === 'admin') {
        return { success: false, error: "Cannot change admin role through this method." };
      }

      // Log the role change for audit purposes
      if (adminId) {
        const admin = await this.userModel.getUserById(adminId);
        await this.auditLogger.logUserManagement(
          'ROLE_CHANGE',
          adminId,
          admin?.email || 'unknown',
          userId,
          targetUser.email,
          `Changed user role from ${targetUser.role} to ${newRole}`
        );
      }

      const updatedUser = await this.userModel.updateUser(userId, { role: newRole });
      if (!updatedUser) {
        return { success: false, error: "User update failed" };
      }

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = updatedUser;
      
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("Update user role error:", error);
      return { success: false, error: "Role update failed" };
    }
  }

  async deactivateUser(userId: number): Promise<{success: boolean, error?: string}> {
    try {
      // First, check if user exists
      const user = await this.userModel.getUserById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Deactivate user in database (set is_active = false)
      const deactivated = await this.userModel.deactivateUser(userId);
      if (!deactivated) {
        return { success: false, error: "Failed to deactivate user" };
      }

      // Remove all refresh tokens for this user (logs them out)
      await this.userModel.removeAllRefreshTokensForUser(userId);
      
      // Log user deactivation
      await this.auditLogger.logUserManagement(
        'DEACTIVATE',
        userId, // We'll update this when we have admin context
        user.email,
        userId,
        user.email,
        'User account deactivated and logged out'
      );
      
      return { success: true };
    } catch (error) {
      console.error("Deactivate user error:", error);
      return { success: false, error: "User deactivation failed" };
    }
  }

  async activateUser(userId: number): Promise<{success: boolean, error?: string}> {
    try {
      // First, check if user exists
      const user = await this.userModel.getUserById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Activate user in database (set is_active = true)
      const activated = await this.userModel.activateUser(userId);
      if (!activated) {
        return { success: false, error: "Failed to activate user" };
      }
      
      // Log user activation
      await this.auditLogger.logUserManagement(
        'ACTIVATE',
        userId, // We'll update this when we have admin context
        user.email,
        userId,
        user.email,
        'User account activated'
      );
      
      return { success: true };
    } catch (error) {
      console.error("Activate user error:", error);
      return { success: false, error: "User activation failed" };
    }
  }

  async getAllUsers(): Promise<UserWithoutPassword[]> {
    try {
      const users = await this.userModel.getAllUsers();
      // Remove password hash from all users
      return users.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    } catch (error) {
      console.error("Get all users error:", error);
      throw new Error("Failed to fetch users");
    }
  }

  async createUserByAdmin(userData: {
    firstName: string;
    lastName: string;
    email: string;
    role: 'instructor' | 'ta_coordinator';
    temporaryPassword: string;
    departmentId?: number;
    notes?: string;
  }): Promise<{success: boolean, user?: UserWithoutPassword, error?: string}> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.getUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: "Email already registered" };
      }

      // Hash the temporary password
      const passwordHash = await hashPassword(userData.temporaryPassword);

      // Create user
      const user = await this.userModel.createUser({
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        password_hash: passwordHash,
        role: userData.role,
        major: undefined, // Can be updated later
        prev_roles: undefined
      });

      if (!user.user_id) {
        throw new Error("User ID missing after user creation");
      }

      // Return user data without password
      const { password_hash, ...userWithoutPassword } = user;

      // Log user creation
      await this.auditLogger.logUserManagement(
        'CREATE',
        0, // We'll update this when we have admin context
        'admin',
        user.user_id,
        userData.email,
        `Created ${userData.role} user account`
      );

      return {
        success: true,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error("Create user by admin error:", error);
      return { success: false, error: "User creation failed" };
    }
  }

  // Password reset functionality
  async _requestPasswordReset(email: string): Promise<{success: boolean, error?: string}> {
    try {
      // Find user by email
      const user = await this.userModel.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return { success: true };
      }

      // Only allow password reset for students and instructors
      if (user.role !== 'student' && user.role !== 'instructor') {
        return { success: true }; // Don't reveal the user exists but isn't allowed
      }

      // Generate secure reset token
      const resetToken = crypto.randomUUID();

      // Store token in database
      await this.userModel.createPasswordResetToken(user.user_id!, resetToken);

      // Send reset email
      await this.sendPasswordResetEmail(user.email, user.name, resetToken);

      // Log password reset request
      await this.auditLogger.logAuth(
        'PASSWORD_RESET_REQUEST',
        user.user_id!,
        user.email,
        true,
        undefined,
        `Password reset requested for ${user.role}`
      );

      return { success: true };
    } catch (error) {
      console.error("Password reset request error:", error);
      return { success: false, error: "Password reset request failed" };
    }
  }

  async _resetPassword(resetToken: string, newPassword: string): Promise<{success: boolean, error?: string}> {
    try {
      // Validate the reset token
      const tokenData = await this.userModel.getValidPasswordResetToken(resetToken);
      if (!tokenData) {
        return { success: false, error: "Invalid or expired reset token" };
      }

      // Get user to verify role again
      const user = await this.userModel.getUserById(tokenData.user_id);
      if (!user || (user.role !== 'student' && user.role !== 'instructor')) {
        return { success: false, error: "Invalid reset token" };
      }

      // Hash the new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await this.userModel.updatePassword(tokenData.user_id, newPasswordHash);

      // Mark token as used
      await this.userModel.markPasswordResetTokenAsUsed(resetToken);

      // Clear all refresh tokens for security (logout everywhere)
      await this.userModel.removeAllRefreshTokensForUser(tokenData.user_id);

      // Log password reset completion
      await this.auditLogger.logAuth(
        'PASSWORD_RESET_COMPLETE',
        user.user_id!,
        user.email,
        true,
        undefined,
        `Password reset completed for ${user.role}`
      );

      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: "Password reset failed" };
    }
  }

  private async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    try {
      // Determine the frontend URL based on environment
      const frontendUrl = globalThis.Deno?.env.get("FRONTEND_URL") || "http://localhost:5173";
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      // Check if we have email service configured
      const emailServiceUrl = globalThis.Deno?.env.get("EMAIL_SERVICE_URL");
      const emailApiKey = globalThis.Deno?.env.get("EMAIL_API_KEY");

      if (emailServiceUrl && emailApiKey) {
        // Determine email service type and format accordingly
        let emailPayload;
        let headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (emailServiceUrl.includes('sendgrid.com')) {
          // SendGrid format
          headers['Authorization'] = `Bearer ${emailApiKey}`;
          emailPayload = {
            personalizations: [{
              to: [{ email: email, name: name }],
              subject: "Password Reset Request - AllocAid"
            }],
            from: {
              email: "noreply@allocaid.ubc.ca",
              name: "AllocAid TA Management"
            },
            content: [{
              type: "text/html",
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #002145;">Password Reset Request</h2>
                  <p>Hi ${name},</p>
                  <p>You have requested to reset your password for your AllocAid account. Click the button below to reset your password:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #002145; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
                  </div>
                  <p>This link will expire in 1 hour for security purposes.</p>
                  <p>If you did not request this password reset, please ignore this email.</p>
                  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 12px;">
                    AllocAid TA Management System<br>
                    University of British Columbia Okanagan
                  </p>
                </div>
              `
            }, {
              type: "text/plain",
              value: `
                Password Reset Request
                
                Hi ${name},
                
                You have requested to reset your password for your AllocAid account.
                
                Please visit this link to reset your password:
                ${resetUrl}
                
                This link will expire in 1 hour for security purposes.
                
                If you did not request this password reset, please ignore this email.
                
                AllocAid TA Management System
                University of British Columbia Okanagan
              `
            }]
          };
        } else if (emailServiceUrl.includes('mailgun.net')) {
          // Mailgun format
          headers['Authorization'] = `Basic ${btoa(`api:${emailApiKey}`)}`;
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          
          const formData = new URLSearchParams();
          formData.append('from', 'AllocAid TA Management <noreply@allocaid.ubc.ca>');
          formData.append('to', `${name} <${email}>`);
          formData.append('subject', 'Password Reset Request - AllocAid');
          formData.append('html', `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #002145;">Password Reset Request</h2>
              <p>Hi ${name},</p>
              <p>You have requested to reset your password for your AllocAid account. Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #002145; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
              </div>
              <p>This link will expire in 1 hour for security purposes.</p>
              <p>If you did not request this password reset, please ignore this email.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                AllocAid TA Management System<br>
                University of British Columbia Okanagan
              </p>
            </div>
          `);
          formData.append('text', `
            Password Reset Request
            
            Hi ${name},
            
            You have requested to reset your password for your AllocAid account.
            
            Please visit this link to reset your password:
            ${resetUrl}
            
            This link will expire in 1 hour for security purposes.
            
            If you did not request this password reset, please ignore this email.
            
            AllocAid TA Management System
            University of British Columbia Okanagan
          `);
          
          emailPayload = formData.toString();
        } else {
          // Generic format for other services
          headers['Authorization'] = `Bearer ${emailApiKey}`;
          emailPayload = {
            to: email,
            subject: "Password Reset Request - AllocAid",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #002145;">Password Reset Request</h2>
                <p>Hi ${name},</p>
                <p>You have requested to reset your password for your AllocAid account. Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background-color: #002145; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
                </div>
                <p>This link will expire in 1 hour for security purposes.</p>
                <p>If you did not request this password reset, please ignore this email.</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                  AllocAid TA Management System<br>
                  University of British Columbia Okanagan
                </p>
              </div>
            `,
            text: `
              Password Reset Request
              
              Hi ${name},
              
              You have requested to reset your password for your AllocAid account.
              
              Please visit this link to reset your password:
              ${resetUrl}
              
              This link will expire in 1 hour for security purposes.
              
              If you did not request this password reset, please ignore this email.
              
              AllocAid TA Management System
              University of British Columbia Okanagan
            `
          };
        }

        // Send the email
        const response = await fetch(emailServiceUrl, {
          method: 'POST',
          headers,
          body: typeof emailPayload === 'string' ? emailPayload : JSON.stringify(emailPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Email service error: ${response.status} - ${errorText}`);
        }

        console.log(`✅ Password reset email sent successfully to ${email}`);
      } else {
        // Development mode - log email content
        console.log("📧 EMAIL (Development Mode):");
        console.log(`To: ${email}`);
        console.log(`Subject: Password Reset Request - AllocAid`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log("📧 Email would be sent in production with proper email service configuration");
      }
    } catch (error) {
      console.error("Email sending error:", error);
      // Don't throw error to prevent password reset flow from failing due to email issues
    }
  }

  // Permission check method implementation
  async hasPermission(userId: number, permission: string): Promise<boolean> {
      // Example permission mapping
      const rolePermissions: Record<string, string[]> = {
          admin: ["manage_users", "view_reports", "edit_courses"],
          ta_coordinator: ["view_reports", "edit_courses"],
          instructor: ["edit_courses"],
          student: []
      };
      const user = await this.userModel.getUserById(userId);
      const role = user?.role ?? "student"; // Default to student if user not found
      return rolePermissions[role]?.includes(permission) ?? false;
  }
  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string): Promise<{success: boolean, error?: string}> {
    try {
      // Find user by email
      const user = await this.userModel.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return { success: true };
      }

      // RATE LIMIT CHECK REMOVED
      // const withinRateLimit = await this.userModel.checkOTPRateLimit(user.user_id!);
      // if (!withinRateLimit) {
      //   return { success: false, error: "Too many password reset attempts. Please try again later." };
      // }

      // Generate 6-digit OTP
      const otpCode = this.generateOTP();

      // Store OTP in database with 15-minute expiration
      await this.userModel.createPasswordResetOTP(
        user.user_id!, 
        otpCode, 
        ipAddress, 
        userAgent
      );

      // Send OTP via email
      await this.sendPasswordResetOTP(user.email, user.name, otpCode);

      // Log password reset request
      await this.auditLogger.logAuth(
        'PASSWORD_RESET_OTP_SENT',
        user.user_id!,
        user.email,
        true,
        `Password reset OTP sent to ${user.role}`
      );

      return { success: true };
    } catch (error) {
      console.error("Password reset OTP request error:", error);
      return { success: false, error: "Password reset request failed" };
    }
  }

// New method: Reset password with OTP
async resetPasswordWithOTP(otpCode: string, newPassword: string): Promise<{success: boolean, error?: string}> {
  try {
    // Validate OTP format
    if (!/^\d{6}$/.test(otpCode)) {
      return { success: false, error: "Invalid OTP format" };
    }

    // Get valid OTP from database
    const otpData = await this.userModel.getValidOTP(otpCode);
    if (!otpData) {
      // Increment attempts for any OTP (even expired ones)
      await this.userModel.incrementOTPAttempts(otpCode);
      return { success: false, error: "Invalid or expired OTP" };
    }

    // Check if max attempts reached
    if (otpData.attempts >= 3) {
      return { success: false, error: "Maximum attempts exceeded. Please request a new OTP." };
    }

    // Get user to verify role again
    const user = await this.userModel.getUserById(otpData.user_id);
    if (!user || (user.role !== 'student' && user.role !== 'instructor')) {
      return { success: false, error: "Invalid OTP" };
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await this.userModel.updatePassword(otpData.user_id, newPasswordHash);

    // Mark OTP as used
    await this.userModel.markOTPAsUsed(otpCode);

    // Clear all refresh tokens for security (logout everywhere)
    await this.userModel.removeAllRefreshTokensForUser(otpData.user_id);

    // Log password reset completion
    await this.auditLogger.logAuth(
      'PASSWORD_RESET_COMPLETE',
      user.user_id!,
      user.email,
      true,
      `Password reset completed with OTP for ${user.role}`
    );

    return { success: true };
  } catch (error) {
    console.error("Password reset with OTP error:", error);
    return { success: false, error: "Password reset failed" };
  }
}

async sendPasswordResetOTP(email: string, name: string, otpCode: string): Promise<void> {
  try {
    // Always attempt to send email via SMTP regardless of environment
    console.log("Email service check: Sending password reset OTP");
    console.log("Sending email to:", email);
    
    const result = await emailService.sendPasswordResetOTP(email, otpCode, name);
    
    if (!result.success) {
      throw new Error(`SMTP email failed: ${result.error}`);
    }
    
    // Log success
    console.log(`✅ Email sent successfully to ${email}`);
    console.log("Email service response status:", 200);
    console.log("Email service response: Email sent successfully via SMTP");
    console.log(`✅ Password reset OTP sent successfully to ${email}`);
    
    // ALWAYS DISPLAY THE OTP IN THE CONSOLE FOR MONITORING
    console.log("\n");
    console.log("=" .repeat(60));
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`📧 Sent to: ${email}`);
    console.log(`👤 User: ${name}`);
    console.log(`⏰ Valid for: 15 minutes`);
    console.log("=" .repeat(60));
    console.log("\n");
    
  } catch (error) {
    console.error("Email sending error:", error);
    // Still log the OTP in case of email failure for debugging
    console.log("\n");
    console.log("⚠️ EMAIL FAILED - HERE'S YOUR OTP FOR DEBUGGING");
    console.log("=".repeat(40));
    console.log(`🔢 OTP Code: ${otpCode}`);
    console.log(`📧 Email: ${email}`);
    console.log("=".repeat(40));
    console.log("\n");
    // Don't throw error to prevent password reset flow from failing due to email issues
  }
}

// Keep the old resetPassword method for backward compatibility
  async resetPassword(token: string, newPassword: string): Promise<{success: boolean, error?: string}> {
    // Redirect to OTP method if token looks like an OTP
    if (/^\d{6}$/.test(token)) {
      return this.resetPasswordWithOTP(token, newPassword);
    }
    
    // Legacy token support (can be removed later)
    return { success: false, error: "Invalid reset token. Please request a new password reset." };
  }
}