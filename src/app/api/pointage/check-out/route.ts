/**
 * Pointage Check-Out API
 * Employee clock-out with biometric verification
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getClientInfo } from "@/lib/rbac";
import { pointageService } from "@/lib/services/pointage-service";
import { checkRateLimit, getClientIP } from "@/lib/security-middleware";
import { auditLogger } from "@/lib/services/audit-logger";

export const POST = withAuth(
  async (req: NextRequest, user: any) => {
    try {
      // Rate limiting
      const ip = getClientIP(req);
      const { allowed } = checkRateLimit(`pointage:${user.id}`, "api");
      
      if (!allowed) {
        return NextResponse.json(
          { error: "Trop de tentatives. Veuillez patienter." },
          { status: 429 }
        );
      }

      const {
        deviceFingerprint,
        geolocation,
        capturedPhoto,
        faceVerified,
        verificationScore,
      } = await req.json();
      
      const clientInfo = getClientInfo(req);
      
      const pointage = await pointageService.createPointage({
        userId: user.id,
        type: "OUT",
        deviceFingerprint: deviceFingerprint ? JSON.stringify(deviceFingerprint) : undefined,
        ipAddress: clientInfo.ipAddress,
        geolocation,
        capturedPhoto,
        faceVerified,
        verificationScore,
      });

      // Log the pointage action
      await auditLogger.logPointage(
        user.id,
        "sortie",
        clientInfo.ipAddress,
        req.headers.get("user-agent") || undefined,
        {
          pointageId: pointage.id,
          faceVerified,
          location: geolocation ? `${geolocation.latitude},${geolocation.longitude}` : undefined,
        }
      );
      
      return NextResponse.json({
        success: true,
        message: pointage.anomalyDetected
          ? "Check-out enregistré avec anomalie détectée"
          : "Check-out enregistré avec succès",
        pointage: {
          id: pointage.id,
          timestamp: pointage.timestamp,
          status: pointage.status,
          anomalyDetected: pointage.anomalyDetected,
          anomalyReason: pointage.anomalyReason,
        },
      });
    } catch (error: any) {
      console.error("Error creating check-out:", error);
      return NextResponse.json(
        { error: "Failed to create check-out" },
        { status: 500 }
      );
    }
  },
  { requireActive: true }
);
