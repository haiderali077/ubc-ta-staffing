// app/src/backend/services/email.ts
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
// Note: If you continue to get InvalidContentType errors, try updating to a newer version:
// import { SMTPClient } from "https://deno.land/x/denomailer@1.7.0/mod.ts";

export interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  secure: boolean;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export class EmailService {
  private config: EmailConfig;

  constructor() {
    // Load configuration from environment variables
    this.config = {
      host: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
      port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
      username: Deno.env.get("SMTP_USERNAME") || "",
      password: Deno.env.get("SMTP_PASSWORD") || "",
      from: Deno.env.get("SMTP_FROM") || "",
      secure: Deno.env.get("SMTP_SECURE") === "true"
    };

    // Validate configuration
    if (!this.config.username || !this.config.password) {
      console.warn("⚠️ SMTP credentials not configured. Email sending will fail.");
    }
  }

  /**
   * Send an email using SMTP
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // Always attempt to send email regardless of environment
      if (!this.config.username || !this.config.password) {
        throw new Error("SMTP credentials not configured");
      }

      // Create a new client for each email to avoid connection issues
      const client = new SMTPClient({
        connection: {
          hostname: this.config.host,
          port: this.config.port,
          tls: this.config.port === 587 ? true : this.config.secure,
          auth: {
            username: this.config.username,
            password: this.config.password,
          },
        },
      });

      try {
        // Send the email with proper content handling
        // Fix for denomailer InvalidContentType error
        const emailData: any = {
          from: this.config.from,
          to: options.to,
          subject: options.subject,
        };

        // Add content based on what's provided
        if (options.html) {
          emailData.html = options.html;
          emailData.content = options.text || ""; // Fallback text content
        } else {
          emailData.content = options.text || "";
        }

        await client.send(emailData);

        console.log(`✅ Email sent successfully to ${options.to}`);
        return { success: true };
      } finally {
        // Always close the connection
        try {
          await client.close();
        } catch (closeError) {
          console.warn("Warning: Error closing SMTP connection:", closeError);
        }
      }
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      
      // Provide more specific error messages
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.message.includes("InvalidContentType")) {
          errorMessage = "Email content format error. Please check email configuration.";
        } else if (error.message.includes("auth")) {
          errorMessage = "SMTP authentication failed. Please check credentials.";
        } else {
          errorMessage = error.message;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Send OTP email for password reset
   */
  async sendPasswordResetOTP(
    email: string, 
    otpCode: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const displayName = userName || "User";
    
    // Create both HTML and plain text versions
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #002145;">Password Reset Request</h2>
        <p>Hi ${displayName},</p>
        <p>You have requested to reset your password for your AllocAid account.</p>
        <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your OTP code is:</p>
          <p style="font-size: 32px; font-weight: bold; color: #002145; margin: 10px 0; letter-spacing: 5px;">${otpCode}</p>
          <p style="margin: 0; font-size: 14px; color: #666;">This code will expire in 15 minutes.</p>
        </div>
        <p>If you did not request this password reset, please ignore this email.</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Best regards,<br>
          AllocAid TA Management System<br>
          University of British Columbia Okanagan
        </p>
      </div>
    `;

    const textContent = `
Password Reset Request

Hi ${displayName},

You have requested to reset your password for your AllocAid account.

Your OTP code is: ${otpCode}

This code will expire in 15 minutes.

If you did not request this password reset, please ignore this email.

Best regards,
AllocAid TA Management System
University of British Columbia Okanagan
    `.trim();

    return this.sendEmail({
      to: email,
      subject: "Password Reset Request - AllocAid",
      html: htmlContent,
      text: textContent,
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.username || !this.config.password) {
        return {
          success: false,
          error: "SMTP credentials not configured",
        };
      }

      // Try to create a client and connect
      const client = new SMTPClient({
        connection: {
          hostname: this.config.host,
          port: this.config.port,
          tls: this.config.port === 587 ? true : this.config.secure,
          auth: {
            username: this.config.username,
            password: this.config.password,
          },
        },
      });

      // Close immediately after successful connection
      await client.close();

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();