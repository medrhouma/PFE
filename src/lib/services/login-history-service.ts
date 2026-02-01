/**
 * Login History Service
 * Tracks user login attempts with device fingerprinting and suspicious activity detection
 */

import { query, execute } from "@/lib/mysql-direct";
import { notificationService } from "./notification-service";
import { emailService } from "./email-service";

interface LoginAttempt {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  loginMethod: "credentials" | "google" | "otp";
  success: boolean;
  failureReason?: string;
}

interface DeviceInfo {
  deviceType: string;
  browser: string;
  os: string;
}

class LoginHistoryService {
  /**
   * Parse user agent to extract device info
   */
  private parseUserAgent(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let deviceType = "desktop";
    if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
      deviceType = /tablet|ipad/i.test(ua) ? "tablet" : "mobile";
    }
    
    // Detect browser
    let browser = "Unknown";
    if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
      browser = "Chrome";
    } else if (/firefox/i.test(ua)) {
      browser = "Firefox";
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = "Safari";
    } else if (/edge|edg/i.test(ua)) {
      browser = "Edge";
    } else if (/opera|opr/i.test(ua)) {
      browser = "Opera";
    }
    
    // Detect OS
    let os = "Unknown";
    if (/windows/i.test(ua)) {
      os = "Windows";
    } else if (/mac os|macos/i.test(ua)) {
      os = "macOS";
    } else if (/linux/i.test(ua)) {
      os = "Linux";
    } else if (/android/i.test(ua)) {
      os = "Android";
    } else if (/ios|iphone|ipad/i.test(ua)) {
      os = "iOS";
    }
    
    return { deviceType, browser, os };
  }

  /**
   * Check if login is suspicious
   */
  private async checkSuspiciousActivity(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ isSuspicious: boolean; reason?: string }> {
    // Check 1: Multiple failed attempts in last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const failedAttempts = await query(
      `SELECT COUNT(*) as count FROM login_history 
       WHERE user_id = ? AND success = 0 AND created_at >= ?`,
      [userId, thirtyMinutesAgo]
    ) as any[];
    
    if (failedAttempts[0]?.count >= 5) {
      return {
        isSuspicious: true,
        reason: `Multiple failed login attempts (${failedAttempts[0].count}) in the last 30 minutes`
      };
    }
    
    // Check 2: New device or IP address
    const previousLogins = await query(
      `SELECT ip_address, user_agent FROM login_history 
       WHERE user_id = ? AND success = 1 
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    ) as any[];
    
    if (previousLogins.length > 0 && ipAddress) {
      const knownIPs = new Set(previousLogins.map((l: any) => l.ip_address));
      if (!knownIPs.has(ipAddress)) {
        return {
          isSuspicious: true,
          reason: `Login from new IP address: ${ipAddress}`
        };
      }
    }
    
    // Check 3: Unusual time (between midnight and 5 AM)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      return {
        isSuspicious: true,
        reason: `Login during unusual hours (${hour}:00)`
      };
    }
    
    // Check 4: Login from different country/location (would need IP geolocation service)
    // This is a placeholder for future implementation
    
    return { isSuspicious: false };
  }

  /**
   * Record a login attempt
   */
  async recordLogin(attempt: LoginAttempt): Promise<void> {
    try {
      const id = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const deviceInfo = attempt.userAgent 
        ? this.parseUserAgent(attempt.userAgent) 
        : { deviceType: null, browser: null, os: null };
      
      // Check for suspicious activity
      const suspiciousCheck = await this.checkSuspiciousActivity(
        attempt.userId,
        attempt.ipAddress,
        attempt.userAgent
      );
      
      await execute(
        `INSERT INTO login_history 
         (id, user_id, ip_address, user_agent, device_fingerprint, is_suspicious, 
          login_method, success, failure_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          attempt.userId,
          attempt.ipAddress || null,
          attempt.userAgent || null,
          null, // device_fingerprint
          suspiciousCheck.isSuspicious ? 1 : 0,
          attempt.loginMethod,
          attempt.success ? 1 : 0,
          attempt.failureReason || null
        ]
      );
      
      // If suspicious, notify user and RH
      if (suspiciousCheck.isSuspicious && attempt.success) {
        // Get user email
        const users = await query(
          `SELECT email, name FROM User WHERE id = ? LIMIT 1`,
          [attempt.userId]
        ) as any[];
        
        if (users[0]) {
          // Send email alert
          try {
            await emailService.sendSecurityAlertEmail(
              users[0].email,
              "Connexion suspecte détectée",
              suspiciousCheck.reason || "Activité inhabituelle",
              users[0].name
            );
          } catch (emailError) {
            console.error("Failed to send security alert email:", emailError);
          }
          
          // Create notification
          await notificationService.create({
            userId: attempt.userId,
            type: "SYSTEM_ALERT",
            title: "Connexion suspecte détectée",
            message: suspiciousCheck.reason || "Une activité inhabituelle a été détectée sur votre compte.",
            priority: "HIGH",
            metadata: {
              ipAddress: attempt.ipAddress,
              deviceType: deviceInfo.deviceType,
              browser: deviceInfo.browser
            }
          });
        }
        
        // Notify RH/Admins
        const rhUsers = await notificationService.getRHUsers();
        for (const rhUserId of rhUsers) {
          await notificationService.create({
            userId: rhUserId,
            type: "SYSTEM_ALERT",
            title: "Alerte de sécurité: Connexion suspecte",
            message: `Une connexion suspecte a été détectée pour l'utilisateur ${users[0]?.name || attempt.userId}. ${suspiciousCheck.reason}`,
            priority: "HIGH",
            targetRole: "RH",
            metadata: {
              targetUserId: attempt.userId,
              ipAddress: attempt.ipAddress,
              reason: suspiciousCheck.reason
            }
          });
        }
      }
      
      console.log(`✅ Login recorded for user ${attempt.userId}. Suspicious: ${suspiciousCheck.isSuspicious}`);
    } catch (error) {
      console.error("Failed to record login:", error);
    }
  }

  /**
   * Get login history for a user
   */
  async getUserLoginHistory(userId: string, limit: number = 20): Promise<any[]> {
    return await query(
      `SELECT * FROM login_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    ) as any[];
  }

  /**
   * Get all suspicious logins (for RH/Admin)
   */
  async getSuspiciousLogins(limit: number = 50): Promise<any[]> {
    return await query(
      `SELECT lh.*, u.name as userName, u.email as userEmail
       FROM login_history lh
       JOIN User u ON lh.user_id = u.id COLLATE utf8mb4_unicode_ci
       WHERE lh.is_suspicious = 1
       ORDER BY lh.created_at DESC
       LIMIT ?`,
      [limit]
    ) as any[];
  }

  /**
   * Get login statistics
   */
  async getLoginStats(days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const stats = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN is_suspicious = 1 THEN 1 ELSE 0 END) as suspicious,
         COUNT(DISTINCT user_id) as uniqueUsers
       FROM login_history
       WHERE created_at >= ?`,
      [startDate]
    ) as any[];
    
    return stats[0] || { total: 0, successful: 0, failed: 0, suspicious: 0, uniqueUsers: 0 };
  }
}

export const loginHistoryService = new LoginHistoryService();
