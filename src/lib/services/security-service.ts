/**
 * Security Service
 * Enterprise-grade security features for HR platform
 */

import { query, execute } from "@/lib/mysql-direct";
import { auditLogger } from "./audit-logger";
import { notificationService } from "./notification-service";
import crypto from "crypto";

export interface DeviceFingerprintData {
  userAgent: string;
  platform?: string;
  browser?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  plugins?: string[];
  canvas?: string;
  webgl?: string;
}

export interface SecurityCheckResult {
  isAllowed: boolean;
  reason?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresReview?: boolean;
}

class SecurityService {
  /**
   * Generate device fingerprint hash
   */
  generateFingerprint(data: DeviceFingerprintData): string {
    const fingerprintString = JSON.stringify({
      userAgent: data.userAgent,
      platform: data.platform,
      browser: data.browser,
      screenResolution: data.screenResolution,
      timezone: data.timezone,
      language: data.language,
      plugins: data.plugins?.sort(),
      canvas: data.canvas,
      webgl: data.webgl,
    });
    
    return crypto
      .createHash("sha256")
      .update(fingerprintString)
      .digest("hex");
  }

  /**
   * Register or update device fingerprint
   */
  async registerDevice(
    userId: string,
    fingerprintData: DeviceFingerprintData,
    ipAddress?: string
  ): Promise<{ deviceId: string; isNew: boolean; isTrusted: boolean }> {
    const fingerprintHash = this.generateFingerprint(fingerprintData);
    const fingerprintJson = JSON.stringify(fingerprintData);

    // Check if device already exists
    const existingDevices = await query(
      `SELECT id, isTrusted FROM DeviceFingerprint WHERE userId = ? AND fingerprint = ? LIMIT 1`,
      [userId, fingerprintJson]
    ) as any[];
    const existingDevice = existingDevices[0];

    if (existingDevice) {
      // Update last seen
      await execute(
        `UPDATE DeviceFingerprint SET lastSeen = NOW() WHERE id = ?`,
        [existingDevice.id]
      );

      return {
        deviceId: existingDevice.id,
        isNew: false,
        isTrusted: existingDevice.isTrusted === 1 || existingDevice.isTrusted === true,
      };
    }

    // Create new device
    const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await execute(
      `INSERT INTO DeviceFingerprint (id, userId, fingerprint, userAgent, platform, browser, screenResolution, timezone, language, isTrusted, firstSeen, lastSeen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        deviceId,
        userId,
        fingerprintJson,
        fingerprintData.userAgent,
        fingerprintData.platform || null,
        fingerprintData.browser || null,
        fingerprintData.screenResolution || null,
        fingerprintData.timezone || null,
        fingerprintData.language || null,
      ]
    );

    // Log new device
    await auditLogger.log({
      action: "NEW_DEVICE_REGISTERED",
      userId,
      entityType: "DEVICE",
      entityId: deviceId,
      metadata: JSON.stringify({
        fingerprintHash,
        ipAddress,
        platform: fingerprintData.platform,
        browser: fingerprintData.browser,
      }),
      severity: "INFO",
    });

    // Notify user of new device
    await notificationService.create({
      userId,
      type: "SYSTEM_ALERT",
      title: "Nouveau périphérique détecté",
      message: `Un nouveau périphérique a été détecté lors de votre connexion. Si ce n'est pas vous, veuillez contacter le support.`,
      priority: "HIGH",
      metadata: {
        deviceId,
        platform: fingerprintData.platform,
        browser: fingerprintData.browser,
      },
    });

    // Notify admins
    const adminIds = await notificationService.getAdminUsers();
    await notificationService.notifyAdminSystemEvent(
      adminIds,
      "Nouveau périphérique enregistré",
      `Utilisateur ${userId} s'est connecté depuis un nouveau périphérique`,
      "NORMAL"
    );

    return {
      deviceId,
      isNew: true,
      isTrusted: false,
    };
  }

  /**
   * Trust a device
   */
  async trustDevice(deviceId: string, userId: string): Promise<void> {
    await execute(
      `UPDATE DeviceFingerprint SET isTrusted = 1 WHERE id = ? AND userId = ?`,
      [deviceId, userId]
    );

    await auditLogger.log({
      action: "DEVICE_TRUSTED",
      userId,
      entityType: "DEVICE",
      entityId: deviceId,
      severity: "INFO",
    });
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(deviceId: string, userId: string): Promise<boolean> {
    const devices = await query(
      `SELECT isTrusted FROM DeviceFingerprint WHERE id = ? AND userId = ? LIMIT 1`,
      [deviceId, userId]
    ) as any[];

    return devices[0]?.isTrusted === 1 || devices[0]?.isTrusted === true;
  }

  /**
   * Detect unusual activity
   */
  async detectUnusualActivity(
    userId: string,
    activityType: string,
    metadata: any
  ): Promise<SecurityCheckResult> {
    const checks: SecurityCheckResult[] = [];

    // Check 1: Multiple devices in short time
    if (activityType === "LOGIN" || activityType === "POINTAGE") {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentDevices = await query(
        `SELECT COUNT(*) as count FROM DeviceFingerprint WHERE userId = ? AND lastSeen >= ?`,
        [userId, fiveMinutesAgo]
      ) as any[];

      if (recentDevices[0]?.count > 2) {
        checks.push({
          isAllowed: true,
          reason: "Multiple devices detected in short time",
          severity: "MEDIUM",
          requiresReview: true,
        });
      }
    }

    // Check 2: Unusual hours
    if (activityType === "POINTAGE") {
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        checks.push({
          isAllowed: true,
          reason: "Pointage outside normal hours",
          severity: "LOW",
          requiresReview: true,
        });
      }
    }

    // Check 3: Rapid successive actions
    if (activityType === "POINTAGE") {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentPointages = await query(
        `SELECT COUNT(*) as count FROM Pointage WHERE user_id = ? AND timestamp >= ?`,
        [userId, twoMinutesAgo]
      ) as any[];

      if (recentPointages[0]?.count > 1) {
        checks.push({
          isAllowed: false,
          reason: "Duplicate pointage in short time",
          severity: "HIGH",
          requiresReview: true,
        });
      }
    }

    // Return most severe check
    const severeCheck = checks.find((c) => c.severity === "CRITICAL") ||
      checks.find((c) => c.severity === "HIGH") ||
      checks.find((c) => c.severity === "MEDIUM") ||
      checks.find((c) => c.severity === "LOW");

    return severeCheck || { isAllowed: true };
  }

  /**
   * Verify IP address consistency
   */
  async verifyIPConsistency(
    userId: string,
    currentIP: string
  ): Promise<boolean> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = await query(
      `SELECT DISTINCT ip_address FROM audit_logs WHERE user_id = ? AND created_at >= ? LIMIT 10`,
      [userId, sevenDaysAgo]
    ) as any[];

    // If no history, allow
    if (recentLogs.length === 0) return true;

    // Check if current IP is in recent history
    return recentLogs.some((log: any) => log.ip_address === currentIP);
  }

  /**
   * Create anomaly record
   */
  async createAnomaly(
    type: string,
    severity: string,
    entityType: string,
    entityId: string,
    description: string,
    metadata?: any
  ): Promise<string> {
    const anomalyId = `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await execute(
      `INSERT INTO Anomaly (id, type, severity, entityType, entityId, description, metadata, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())`,
      [anomalyId, type, severity, entityType, entityId, description, metadata ? JSON.stringify(metadata) : null]
    );

    // Log anomaly
    await auditLogger.log({
      action: "ANOMALY_DETECTED",
      entityType,
      entityId,
      metadata: JSON.stringify({ anomalyId, type, severity }),
      severity: severity as any,
    });

    // Notify RH and admins for HIGH and CRITICAL anomalies
    if (severity === "HIGH" || severity === "CRITICAL") {
      const rhIds = await notificationService.getRHUsers();
      await notificationService.notifyAdminSystemEvent(
        rhIds,
        `Anomalie ${severity} détectée`,
        description,
        severity === "CRITICAL" ? "URGENT" : "HIGH"
      );
    }

    return anomalyId;
  }

  /**
   * Get user's trusted devices
   */
  async getUserDevices(userId: string) {
    return await query(
      `SELECT id, platform, browser, isTrusted, firstSeen, lastSeen, userAgent
       FROM DeviceFingerprint WHERE userId = ? ORDER BY lastSeen DESC`,
      [userId]
    ) as any[];
  }

  /**
   * Revoke device trust
   */
  async revokeDeviceTrust(deviceId: string, userId: string): Promise<void> {
    await execute(
      `UPDATE DeviceFingerprint SET isTrusted = 0 WHERE id = ? AND userId = ?`,
      [deviceId, userId]
    );

    await auditLogger.log({
      action: "DEVICE_TRUST_REVOKED",
      userId,
      entityType: "DEVICE",
      entityId: deviceId,
      severity: "INFO",
    });
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId: string, userId: string): Promise<void> {
    await execute(
      `DELETE FROM DeviceFingerprint WHERE id = ? AND userId = ?`,
      [deviceId, userId]
    );

    await auditLogger.log({
      action: "DEVICE_DELETED",
      userId,
      entityType: "DEVICE",
      entityId: deviceId,
      severity: "INFO",
    });
  }

  /**
   * Validate session integrity
   */
  async validateSession(userId: string, sessionToken: string): Promise<boolean> {
    const sessions = await query(
      `SELECT id FROM Session WHERE userId = ? AND sessionToken = ? AND expires > NOW() LIMIT 1`,
      [userId, sessionToken]
    ) as any[];

    return sessions.length > 0;
  }

  /**
   * Get IP address from request
   */
  getIPAddress(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const real = req.headers.get("x-real-ip");
    
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    
    if (real) {
      return real;
    }
    
    return "unknown";
  }
}

export const securityService = new SecurityService();
