import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import { notificationService } from "@/lib/services/notification-service";

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

    // Trouver le check-in le plus récent sans check-out
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCheckIn: any = await query(
      `SELECT id, timestamp FROM Pointage 
       WHERE user_id = ? 
       AND type = 'IN'
       AND timestamp >= ?
       AND id NOT IN (
         SELECT check_in_id FROM Pointage WHERE type = 'OUT' AND check_in_id IS NOT NULL
       )
       ORDER BY timestamp DESC
       LIMIT 1`,
      [session.user.id, today]
    );

    if (!lastCheckIn || lastCheckIn.length === 0) {
      return NextResponse.json(
        { error: "Aucun check-in trouvé pour aujourd'hui" },
        { status: 400 }
      );
    }

    const checkInId = lastCheckIn[0].id;
    const checkInTime = new Date(lastCheckIn[0].timestamp);
    
    // Générer un ID unique pour le pointage
    const pointageId = `ptg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Timestamp actuel
    const timestamp = new Date();
    
    // Calculer la durée en heures
    const durationMs = timestamp.getTime() - checkInTime.getTime();
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

    // Insérer le check-out
    await query(
      `INSERT INTO Pointage (
        id, user_id, type, timestamp, status, check_in_id,
        device_fingerprint, ip_address, geolocation,
        captured_photo, face_verified, verification_score,
        hours_worked, anomaly_detected, anomaly_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pointageId,
        session.user.id,
        "OUT",
        timestamp,
        anomalyDetected ? "ANOMALY" : "VALID",
        checkInId,
        deviceFingerprint ? JSON.stringify(deviceFingerprint) : null,
        ipAddress,
        geolocation ? JSON.stringify(geolocation) : null,
        capturedPhoto,
        faceVerified ? 1 : 0,
        verificationScore || null,
        hoursWorked,
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
        const rhUsers: any = await query(
          `SELECT id FROM User WHERE role IN ('RH', 'SUPER_ADMIN') AND status = 'ACTIVE'`
        );

        if (rhUsers && rhUsers.length > 0) {
          const rhUserIds = rhUsers.map((rh: any) => rh.id);
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
              timestamp.toISOString()
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
        timestamp: timestamp.toISOString(),
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
