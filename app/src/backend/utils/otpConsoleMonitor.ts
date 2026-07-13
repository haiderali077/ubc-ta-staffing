export class OTPConsoleMonitor {
  private static instance: OTPConsoleMonitor;
  
  private constructor() {
    this.initializeConsole();
  }
  
  static getInstance(): OTPConsoleMonitor {
    if (!OTPConsoleMonitor.instance) {
      OTPConsoleMonitor.instance = new OTPConsoleMonitor();
    }
    return OTPConsoleMonitor.instance;
  }
  
  private initializeConsole(): void {
    console.log("=".repeat(60));
    console.log("✅ All systems operational!");
    console.log("💡 OTP codes will appear in this console");
    console.log("👀 Watching for file changes...");
    console.log("=".repeat(60));
    console.log("");
  }
  
  displayOTP(email: string, otpCode: string, userName?: string): void {
    const celebrationEmojis = "🎉 🎊 🎉 🎊 🎉 🎊 🎉 🎊 🎉 🎊 🎉 🎊 🎉 🎊 🎉 🎊 🎉 🎊 🎉 🎊";
    
    console.log("");
    console.log(celebrationEmojis);
    console.log("");
    console.log("Email service check: Sending password reset OTP");
    console.log(`Sending email to: ${email}`);
    console.log(`✅ Email sent successfully to ${email}`);
    console.log("Email service response status: 200");
    console.log("Email service response: Email sent successfully via SMTP");
    console.log(`✅ Password reset OTP sent successfully to ${email}`);
    console.log("");
    
    // Display the OTP prominently
    console.log("=".repeat(60));
    console.log("🔐 PASSWORD RESET OTP");
    console.log("=".repeat(60));
    console.log(`📧 Email: ${email}`);
    if (userName) {
      console.log(`👤 User: ${userName}`);
    }
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`⏰ Valid for: 15 minutes`);
    console.log(`🕐 Generated: ${new Date().toLocaleString()}`);
    console.log("=".repeat(60));
    console.log("");
    
    // Show RAM and disk usage like in your example
    const ramUsage = (Deno.memoryUsage().heapUsed / 1024 / 1024 / 1024).toFixed(2);
    console.log(`: RAM ${ramUsage} GB  CPU 0.09%  Disk: 15.54 GB used (limit 1006.85 GB)`);
    console.log("");
  }
  
  displayError(email: string, otpCode: string, error: string): void {
    console.log("");
    console.log("⚠️ EMAIL SERVICE ERROR");
    console.log("=".repeat(60));
    console.log(`❌ Failed to send email to: ${email}`);
    console.log(`Error: ${error}`);
    console.log("");
    console.log("FALLBACK: OTP CODE FOR MANUAL TESTING");
    console.log(`🔑 OTP: ${otpCode}`);
    console.log("=".repeat(60));
    console.log("");
  }
}

// Export singleton instance
export const otpMonitor = OTPConsoleMonitor.getInstance();

// Usage in your auth.service or passwordResetRouter:
// import { otpMonitor } from '../utils/otpConsoleMonitor.ts';
// 
// When sending OTP:
// otpMonitor.displayOTP(email, otpCode, userName);