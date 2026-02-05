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

    // ========== HARD RULE 1: Must have a check-in first ==========
    const lastCheckIns: any[] = await query(
      `SELECT id, timestamp FROM pointages 
       WHERE user_id = ? AND type = 'IN' AND timestamp >= ?
       ORDER BY timestamp DESC LIMIT 1`,
      [session.user.id, today.toISOString()]
    );

    if (!lastCheckIns || lastCheckIns.length === 0) {
      return NextResponse.json(
        { error: "Vous devez d'abord faire votre check-in avant de pointer la sortie.", code: "NO_CHECK_IN" },
        { status: 400 }
      );
    }

    const lastCheckIn = lastCheckIns[0];
    const checkInTime = new Date(lastCheckIn.timestamp);

    // ========== HARD RULE 2: Already checked out ==========
    const existingCheckOuts: any[] = await query(
      `SELECT id FROM pointages 
       WHERE user_id = ? AND type = 'OUT' AND timestamp >= ?
       LIMIT 1`,
      [session.user.id, checkInTime.toISOString()]
    );

    if (existingCheckOuts && existingCheckOuts.length > 0) {
      return NextResponse.json(
        { error: "Vous avez déjà fait votre check-out aujourd'hui.", code: "ALREADY_CHECKED_OUT" },
        { status: 400 }
      );
    }

    // ========== HARD RULE 3: Minimum 30 seconds between pointage attempts ==========
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

    const checkInId = lastCheckIn.id;
    
    // Générer un ID unique pour le pointage
    const pointageId = `ptg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculer la durée en heures
    const durationMs = now.getTime() - checkInTime.getTime();
    const hoursWorked = durationMs / (1000 * 60 * 60);
    
    // Obtenir l'IP depuis les headers
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                      req.headers.get("x-real-ip") || 
                      "unknown";

    let anomalyDetected = false;
    let anomalyReason = null;

    // Détecter les anomalies
    if (hoursWorked < 0.5) {
      anomalyDetected = true;
      anomalyReason = "Durée de travail trop courte (moins de 30 minutes)";
    } else if (hoursWorked > 12) {
      anomalyDetected = true;
      anomalyReason = "Durée de travail excessive (plus de 12 heures)";
    }

    // Check face verification
    if (!faceVerified && capturedPhoto) {
      anomalyDetected = true;
      anomalyReason = anomalyReason ? `${anomalyReason}, Vérification faciale échouée` : "Vérification faciale échouée";
    }

    // Insérer le check-out avec mysql-direct
    await execute(
      `INSERT INTO pointages (id, user_id, type, timestamp, status, ip_address, geolocation, captured_photo, face_verified, verification_score, anomaly_detected, anomaly_reason, created_at)
       VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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

    // Send notifications
    try {
      // Notify user of successful check-out
      if (!anomalyDetected) {
        await notificationService.notifyPointageSuccess(
          session.user.id, 
          `pointage de sortie (${hoursWorked.toFixed(1)}h travaillées)`
        );
      } else {
        await notificationService.notifyPointageAnomaly(
          session.user.id,
          "CHECK_OUT_ANOMALY",
          anomalyReason || "Anomalie détectée lors du pointage de sortie"
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
            "CHECK_OUT_ANOMALY",
            anomalyReason || "Anomalie détectée lors du pointage"
          );
        } else {
          await notificationService.notifyRHPointageSuccess(
            rhUserIds,
            userName,
            "check-out",
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
        ? `Check-out enregistré avec anomalie (${hoursWorked.toFixed(2)}h)`
        : `Check-out enregistré avec succès (${hoursWorked.toFixed(2)}h)`,
      pointage: {
        id: pointageId,
        timestamp: now.toISOString(),
        status: anomalyDetected ? "ANOMALY" : "VALID",
        hoursWorked: hoursWorked.toFixed(2),
        anomalyDetected,
        anomalyReason,
      },
    });
  } catch (error: any) {
    console.error("Error creating check-out:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du check-out", details: error.message },
      { status: 500 }
    );
  }
}
