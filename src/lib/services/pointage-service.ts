/**
 * Pointage Service
 * Manages employee attendance with security and anomaly detection
 */

import { prisma } from "@/lib/prisma";
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
      const pointage = await prisma.pointage.create({
        data: {
          userId: params.userId,
          type: params.type,
          deviceFingerprintId,
          ipAddress: params.ipAddress,
          geolocation: params.geolocation ? JSON.stringify(params.geolocation) : null,
          capturedPhoto: params.capturedPhoto,
          faceVerified: params.faceVerified || false,
          verificationScore: params.verificationScore,
          anomalyDetected: anomalyCheck.hasAnomaly,
          anomalyReason: anomalyCheck.reason,
          status: anomalyCheck.hasAnomaly ? "PENDING_REVIEW" : "VALID",
        },
      });
      
      // Create anomaly record if detected
      if (anomalyCheck.hasAnomaly) {
        await this.createAnomaly({
          type: anomalyCheck.anomalyType!,
          severity: anomalyCheck.severity!,
          entityType: "pointage",
          entityId: pointage.id,
          pointageId: pointage.id,
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
        entityId: pointage.id,
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
    const recentPointage = await prisma.pointage.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        timestamp: { gte: fiveMinutesAgo },
      },
    });
    
    if (recentPointage) {
      return {
        hasAnomaly: true,
        anomalyType: "DUPLICATE_POINTAGE",
        reason: "Pointage dupliqué détecté dans les 5 dernières minutes",
        severity: "MEDIUM",
      };
    }
    
    // Check 4: Missing check-out (if checking IN but last was also IN)
    if (params.type === "IN") {
      const lastPointage = await prisma.pointage.findFirst({
        where: { userId: params.userId },
        orderBy: { timestamp: "desc" },
      });
      
      if (lastPointage && lastPointage.type === "IN") {
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
    const deviceCount = await prisma.deviceFingerprint.count({
      where: {
        userId: params.userId,
        lastSeen: { gte: sevenDaysAgo },
      },
    });
    
    if (deviceCount > 3) {
      return {
        hasAnomaly: true,
        anomalyType: "MULTIPLE_DEVICES",
        reason: `Utilisation de ${deviceCount} appareils différents en 7 jours`,
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
    const existing = await prisma.deviceFingerprint.findFirst({
      where: {
        userId,
        fingerprint,
      },
    });
    
    if (existing) {
      // Update last seen
      return await prisma.deviceFingerprint.update({
        where: { id: existing.id },
        data: { lastSeen: new Date() },
      });
    }
    
    // Create new fingerprint
    return await prisma.deviceFingerprint.create({
      data: {
        userId,
        fingerprint,
        userAgent,
        platform: fpData.platform,
        browser: fpData.browser,
        screenResolution: fpData.screenResolution,
        timezone: fpData.timezone,
        language: fpData.language,
        isTrusted: false, // RH must approve trusted devices
      },
    });
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
    return await prisma.anomaly.create({
      data: {
        type: params.type as any,
        severity: params.severity,
        entityType: params.entityType,
        entityId: params.entityId,
        pointageId: params.pointageId,
        description: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        status: "PENDING",
      },
    });
  }

  /**
   * Get user pointages
   */
  async getUserPointages(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { userId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }
    
    return await prisma.pointage.findMany({
      where,
      orderBy: { timestamp: "desc" },
      include: {
        deviceFingerprint: true,
        anomalies: true,
      },
    });
  }

  /**
   * Get pointage statistics for user
   */
  async getUserStats(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth();
    const targetYear = year || now.getFullYear();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    
    const pointages = await prisma.pointage.findMany({
      where: {
        userId,
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { timestamp: "asc" },
    });
    
    // Calculate worked hours
    let totalHours = 0;
    let currentCheckIn: Date | null = null;
    
    for (const p of pointages) {
      if (p.type === "IN") {
        currentCheckIn = p.timestamp;
      } else if (p.type === "OUT" && currentCheckIn) {
        const diff = p.timestamp.getTime() - currentCheckIn.getTime();
        totalHours += diff / (1000 * 60 * 60);
        currentCheckIn = null;
      }
    }
    
    return {
      month: targetMonth,
      year: targetYear,
      totalPointages: pointages.length,
      totalCheckIns: pointages.filter((p) => p.type === "IN").length,
      totalCheckOuts: pointages.filter((p) => p.type === "OUT").length,
      totalHours: Math.round(totalHours * 100) / 100,
      anomalies: pointages.filter((p) => p.anomalyDetected).length,
    };
  }

  /**
   * Get all anomalies (for RH/Admin)
   */
  async getAnomalies(status?: string, severity?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    
    return await prisma.anomaly.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        pointage: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
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
    return await prisma.anomaly.update({
      where: { id: anomalyId },
      data: {
        status,
        resolvedBy,
        resolvedAt: new Date(),
        resolution,
      },
    });
  }
}

export const pointageService = new PointageService();
