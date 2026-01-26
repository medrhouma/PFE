/**
 * Pointage Check-In API
 * Employee clock-in with biometric verification
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getClientInfo } from "@/lib/rbac";
import { pointageService } from "@/lib/services/pointage-service";

export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
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
        type: "IN",
        deviceFingerprint: deviceFingerprint ? JSON.stringify(deviceFingerprint) : undefined,
        ipAddress: clientInfo.ipAddress,
        geolocation,
        capturedPhoto,
        faceVerified,
        verificationScore,
      });
      
      return NextResponse.json({
        success: true,
        message: pointage.anomalyDetected
          ? "Check-in enregistré avec anomalie détectée"
          : "Check-in enregistré avec succès",
        pointage: {
          id: pointage.id,
          timestamp: pointage.timestamp,
          status: pointage.status,
          anomalyDetected: pointage.anomalyDetected,
          anomalyReason: pointage.anomalyReason,
        },
      });
    } catch (error: any) {
      console.error("Error creating check-in:", error);
      return NextResponse.json(
        { error: "Failed to create check-in" },
        { status: 500 }
      );
    }
  },
  { requireActive: true }
);
