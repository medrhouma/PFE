export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/mysql-direct";
import { notificationService } from "@/lib/services/notification-service";

// Minimum time between pointage attempts (30 seconds)
const MIN_POINTAGE_INTERVAL_MS = 30 * 1000;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est actif
    if (session.user.status !== "ACTIVE" && !["RH", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Profil non actif" }, { status: 403 });
    }

    const {
      deviceFingerprint,
      geolocation,
      capturedPhoto,
      faceVerified,
      verificationScore,
    } = await req.json();

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ========== HARD RULE 1: Check if already checked in today without checkout ==========
    try {
      const existingCheckIns: any[] = await query(
        `SELECT id, timestamp FROM pointages 
         WHERE user_id = ? AND type = 'IN' 
         AND timestamp >= ? AND timestamp < ?
         ORDER BY timestamp DESC
         LIMIT 1`,
        [session.user.id, today.toISOString(), tomorrow.toISOString()]
      );

      if (existingCheckIns && existingCheckIns.length > 0) {
        // Check if there's a corresponding checkout
        const checkOuts: any[] = await query(
          `SELECT COUNT(*) as count FROM pointages 
           WHERE user_id = ? AND type = 'OUT' 
           AND timestamp >= ? AND timestamp < ?`,
          [session.user.id, today.toISOString(), tomorrow.toISOString()]
        );

        if (!checkOuts[0]?.count || checkOuts[0].count === 0) {
          return NextResponse.json({ 
            error: "Vous êtes déjà pointé comme présent. Veuillez d'abord faire votre check-out.",
            code: "ALREADY_CHECKED_IN"
          }, { status: 400 });
        }
      }
    } catch (checkError) {
      console.error("Error checking existing check-in:", checkError);
      // Continue if table doesn't exist yet
    }

    // ========== HARD RULE 2: Minimum 30 seconds between pointage attempts ==========
    try {
      const recentPointages: any[] = await query(
        `SELECT timestamp FROM pointages 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [session.user.id]
      );

      if (recentPointages && recentPointages.length > 0) {
        const lastPointageTime = new Date(recentPointages[0].timestamp).getTime();
        const timeDiff = now.getTime() - lastPointageTime;
        
        if (timeDiff < MIN_POINTAGE_INTERVAL_MS) {
          const remainingSeconds = Math.ceil((MIN_POINTAGE_INTERVAL_MS - timeDiff) / 1000);
          return NextResponse.json({ 
            error: `Veuillez attendre ${remainingSeconds} secondes avant de réessayer.`,
            code: "TOO_FREQUENT",
            remainingSeconds
          }, { status: 429 });
        }
      }
    } catch (rateError) {
      console.error("Error checking rate limit:", rateError);
    }

    // Générer un ID unique pour le pointage
    const pointageId = `ptg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Obtenir l'IP depuis les headers
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                      req.headers.get("x-real-ip") || 
                      "unknown";

    let anomalyDetected = false;
    let anomalyReason = null;

    // Check for anomalies (face verification failure, etc.)
    if (!faceVerified && capturedPhoto) {
      anomalyDetected = true;
      anomalyReason = "Vérification faciale échouée";
    }

    // Insérer le pointage avec mysql-direct
    try {
      await execute(
        `INSERT INTO pointages (id, user_id, type, timestamp, status, ip_address, geolocation, captured_photo, face_verified, verification_score, anomaly_detected, anomaly_reason, created_at)
         VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          pointageId,
          session.user.id,
          now,
          anomalyDetected ? 'PENDING_REVIEW' : 'VALID',
          ipAddress,
          geolocation ? JSON.stringify(geolocation) : null,
          capturedPhoto || null,
          faceVerified ? 1 : 0,
          verificationScore || null,
          anomalyDetected ? 1 : 0,
          anomalyReason
        ]
      );
    } catch (insertError) {
      console.error("Error inserting pointage:", insertError);
      throw insertError;
    }

    // Send notifications
    try {
      // Notify user of successful check-in
      if (!anomalyDetected) {
        await notificationService.notifyPointageSuccess(session.user.id, "pointage d'entrée");
      } else {
        await notificationService.notifyPointageAnomaly(
          session.user.id,
          "CHECK_IN_DUPLICATE",
          anomalyReason || "Anomalie détectée lors du pointage"
        );
      }

      // Notify RH and SUPER_ADMIN for all pointages (success or anomaly)
      const rhUsers: any[] = await query(
        `SELECT id FROM User WHERE role IN ('RH', 'SUPER_ADMIN') AND status = 'ACTIVE'`,
        []
      );

      if (rhUsers && rhUsers.length > 0) {
        const rhUserIds = rhUsers.map(rh => rh.id);
        const userName = session.user.name || session.user.email || "Utilisateur";

        if (anomalyDetected) {
          await notificationService.notifyRHPointageAnomaly(
            rhUserIds,
            userName,
            "CHECK_IN_ANOMALY",
            anomalyReason || "Anomalie détectée lors du pointage"
          );
        } else {
          // Note: Uncomment below to notify RH of successful pointages
          // This can generate many notifications. Only enable if needed.
          await notificationService.notifyRHPointageSuccess(
            rhUserIds,
            userName,
            "check-in",
            now.toISOString()
          );
        }
      }
    } catch (notifError) {
      console.error("Error sending notification:", notifError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: anomalyDetected
        ? "Check-in enregistré avec anomalie détectée"
        : "Check-in enregistré avec succès",
      pointage: {
        id: pointageId,
        timestamp: now.toISOString(),
        status: anomalyDetected ? "ANOMALY" : "VALID",
        anomalyDetected,
        anomalyReason,
      },
    });
  } catch (error: any) {
    console.error("Error creating check-in:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du check-in", details: error.message },
      { status: 500 }
    );
  }
}
