/**
 * Pointage Service
 * Manages employee attendance with security and anomaly detection
 */

import { query, execute } from "@/lib/mysql-direct";
import { auditLogger } from "./audit-logger";
import { notificationService } from "./notification-service";

interface CreatePointageParams {
  userId: string;
  type: "IN" | "OUT";
  deviceFingerprint?: string;
  ipAddress?: string;
  geolocation?: { lat: number; lng: number; accuracy: number };
  capturedPhoto?: string;
  faceVerified?: boolean;
  verificationScore?: number;
}

interface AnomalyCheck {
  hasAnomaly: boolean;
  anomalyType?: string;
  reason?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

class PointageService {
  /**
   * Create a new pointage
   */
  async createPointage(params: CreatePointageParams) {
    try {
      // Check for anomalies
      const anomalyCheck = await this.checkForAnomalies(params);
      
      // Get or create device fingerprint
      let deviceFingerprintId: string | undefined;
      if (params.deviceFingerprint) {
        const deviceFP = await this.getOrCreateDeviceFingerprint(
          params.userId,
          params.deviceFingerprint,
          params.ipAddress || "unknown"
        );
        deviceFingerprintId = deviceFP.id;
      }
      
      // Create pointage
      const pointageId = `ptg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const status = anomalyCheck.hasAnomaly ? "PENDING_REVIEW" : "VALID";
      
      await execute(
        `INSERT INTO Pointage (id, user_id, type, deviceFingerprintId, ip_address, geolocation, capturedPhoto, face_verified, verificationScore, anomaly_detected, anomaly_reason, status, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          pointageId,
          params.userId,
          params.type,
          deviceFingerprintId || null,
          params.ipAddress || null,
          params.geolocation ? JSON.stringify(params.geolocation) : null,
          params.capturedPhoto || null,
          params.faceVerified ? 1 : 0,
          params.verificationScore || null,
          anomalyCheck.hasAnomaly ? 1 : 0,
          anomalyCheck.reason || null,
          status
        ]
      );
      
      const pointage = {
        id: pointageId,
        userId: params.userId,
        type: params.type,
        status,
        anomalyDetected: anomalyCheck.hasAnomaly,
      };
      
      // Create anomaly record if detected
      if (anomalyCheck.hasAnomaly) {
        await this.createAnomaly({
          type: anomalyCheck.anomalyType!,
          severity: anomalyCheck.severity!,
          entityType: "pointage",
          entityId: pointageId,
          pointageId: pointageId,
          description: anomalyCheck.reason!,
          metadata: {
            userId: params.userId,
            pointageType: params.type,
            faceVerified: params.faceVerified,
            verificationScore: params.verificationScore,
          },
        });
        
        // Notify user of anomaly
        await notificationService.notifyPointageAnomaly(
          params.userId,
          anomalyCheck.anomalyType!,
          anomalyCheck.reason!
        );
      }
      
      // Log the action
      await auditLogger.log({
        userId: params.userId,
        action: `POINTAGE_${params.type}`,
        entityType: "Pointage",
        entityId: pointageId,
        metadata: {
          anomalyDetected: anomalyCheck.hasAnomaly,
          faceVerified: params.faceVerified,
        },
        ipAddress: params.ipAddress,
        severity: anomalyCheck.hasAnomaly ? "WARNING" : "INFO",
      });
      
      return pointage;
    } catch (error) {
      console.error("Failed to create pointage:", error);
      throw error;
    }
  }

  /**
   * Check for anomalies before creating pointage
   */
  private async checkForAnomalies(params: CreatePointageParams): Promise<AnomalyCheck> {
    // Check 1: Face verification failed
    if (params.faceVerified === false || (params.verificationScore && params.verificationScore < 70)) {
      return {
        hasAnomaly: true,
        anomalyType: "FACE_VERIFICATION_FAIL",
        reason: "La vérification faciale a échoué. Score: " + (params.verificationScore || 0),
        severity: "HIGH",
      };
    }
    
    // Check 2: Unusual hours (before 6 AM or after 10 PM)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      return {
        hasAnomaly: true,
        anomalyType: "UNUSUAL_HOURS",
        reason: `Pointage en dehors des heures normales (${hour}h)`,
        severity: "MEDIUM",
      };
    }
    
    // Check 3: Duplicate pointage (same type within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentPointages = await query(
      `SELECT id FROM Pointage WHERE user_id = ? AND type = ? AND timestamp >= ? LIMIT 1`,
      [params.userId, params.type, fiveMinutesAgo]
    ) as any[];
    
    if (recentPointages.length > 0) {
      return {
        hasAnomaly: true,
        anomalyType: "DUPLICATE_POINTAGE",
        reason: "Pointage dupliqué détecté dans les 5 dernières minutes",
        severity: "MEDIUM",
      };
    }
    
    // Check 4: Missing check-out (if checking IN but last was also IN)
    if (params.type === "IN") {
      const lastPointages = await query(
        `SELECT id, type FROM Pointage WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1`,
        [params.userId]
      ) as any[];
      
      if (lastPointages.length > 0 && lastPointages[0].type === "IN") {
        return {
          hasAnomaly: true,
          anomalyType: "MISSING_CHECKOUT",
          reason: "Check-in sans check-out précédent",
          severity: "LOW",
        };
      }
    }
    
    // Check 5: Multiple devices (more than 3 different devices in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deviceCountResult = await query(
      `SELECT COUNT(*) as count FROM DeviceFingerprint WHERE userId = ? AND lastSeen >= ?`,
      [params.userId, sevenDaysAgo]
    ) as any[];
    
    if (deviceCountResult[0]?.count > 3) {
      return {
        hasAnomaly: true,
        anomalyType: "MULTIPLE_DEVICES",
        reason: `Utilisation de ${deviceCountResult[0].count} appareils différents en 7 jours`,
        severity: "MEDIUM",
      };
    }
    
    return { hasAnomaly: false };
  }

  /**
   * Get or create device fingerprint
   */
  private async getOrCreateDeviceFingerprint(
    userId: string,
    fingerprint: string,
    userAgent: string
  ) {
    const fpData = JSON.parse(fingerprint);
    
    // Try to find existing fingerprint
    const existing = await query(
      `SELECT id FROM DeviceFingerprint WHERE userId = ? AND fingerprint = ? LIMIT 1`,
      [userId, fingerprint]
    ) as any[];
    
    if (existing.length > 0) {
      // Update last seen
      await execute(
        `UPDATE DeviceFingerprint SET lastSeen = NOW() WHERE id = ?`,
        [existing[0].id]
      );
      return { id: existing[0].id };
    }
    
    // Create new fingerprint
    const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await execute(
      `INSERT INTO DeviceFingerprint (id, userId, fingerprint, userAgent, platform, browser, screenResolution, timezone, language, isTrusted, firstSeen, lastSeen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        deviceId,
        userId,
        fingerprint,
        userAgent,
        fpData.platform || null,
        fpData.browser || null,
        fpData.screenResolution || null,
        fpData.timezone || null,
        fpData.language || null,
      ]
    );
    
    return { id: deviceId };
  }

  /**
   * Create anomaly record
   */
  private async createAnomaly(params: {
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    entityType: string;
    entityId: string;
    pointageId?: string;
    description: string;
    metadata?: any;
  }) {
    const anomalyId = `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await execute(
      `INSERT INTO Anomaly (id, type, severity, entityType, entityId, pointageId, description, metadata, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())`,
      [
        anomalyId,
        params.type,
        params.severity,
        params.entityType,
        params.entityId,
        params.pointageId || null,
        params.description,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
    return { id: anomalyId };
  }

  /**
   * Get user pointages
   */
  async getUserPointages(userId: string, startDate?: Date, endDate?: Date) {
    let sql = `SELECT p.*, df.* FROM Pointage p
               LEFT JOIN DeviceFingerprint df ON p.deviceFingerprintId = df.id
               WHERE p.user_id = ?`;
    const params: any[] = [userId];
    
    if (startDate) {
      sql += ` AND p.timestamp >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND p.timestamp <= ?`;
      params.push(endDate);
    }
    
    sql += ` ORDER BY p.timestamp DESC`;
    
    const pointages = await query(sql, params) as any[];
    
    // Get anomalies for each pointage
    for (const p of pointages) {
      const anomalies = await query(
        `SELECT * FROM Anomaly WHERE pointageId = ?`,
        [p.id]
      ) as any[];
      p.anomalies = anomalies;
    }
    
    return pointages;
  }

  /**
   * Get pointage statistics for user
   */
  async getUserStats(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth();
    const targetYear = year ?? now.getFullYear();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    
    const pointages = await query(
      `SELECT * FROM Pointage WHERE user_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC`,
      [userId, startDate, endDate]
    ) as any[];
    
    // Calculate worked hours
    let totalHours = 0;
    let currentCheckIn: Date | null = null;
    
    for (const p of pointages) {
      if (p.type === "IN") {
        currentCheckIn = new Date(p.timestamp);
      } else if (p.type === "OUT" && currentCheckIn) {
        const diff = new Date(p.timestamp).getTime() - currentCheckIn.getTime();
        totalHours += diff / (1000 * 60 * 60);
        currentCheckIn = null;
      }
    }
    
    return {
      month: targetMonth,
      year: targetYear,
      totalPointages: pointages.length,
      totalCheckIns: pointages.filter((p: any) => p.type === "IN").length,
      totalCheckOuts: pointages.filter((p: any) => p.type === "OUT").length,
      totalHours: Math.round(totalHours * 100) / 100,
      anomalies: pointages.filter((p: any) => p.anomaly_detected).length,
    };
  }

  /**
   * Get all anomalies (for RH/Admin)
   */
  async getAnomalies(status?: string, severity?: string) {
    let sql = `SELECT a.*, p.*, u.id as userId, u.name as userName, u.last_name as userLastName, u.email as userEmail
               FROM Anomaly a
               LEFT JOIN Pointage p ON a.pointageId = p.id
               LEFT JOIN User u ON p.user_id = u.id
               WHERE 1=1`;
    const params: any[] = [];
    
    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (severity) {
      sql += ` AND a.severity = ?`;
      params.push(severity);
    }
    
    sql += ` ORDER BY a.createdAt DESC`;
    
    return await query(sql, params) as any[];
  }

  /**
   * Resolve anomaly
   */
  async resolveAnomaly(
    anomalyId: string,
    resolvedBy: string,
    status: "RESOLVED" | "FALSE_POSITIVE" | "IGNORED",
    resolution: string
  ) {
    await execute(
      `UPDATE Anomaly SET status = ?, resolvedBy = ?, resolvedAt = NOW(), resolution = ? WHERE id = ?`,
      [status, resolvedBy, resolution, anomalyId]
    );
    
    return { id: anomalyId, status, resolvedBy, resolution };
  }
}

export const pointageService = new PointageService();
