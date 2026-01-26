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

    // Générer un ID unique pour le pointage
    const pointageId = `ptg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Timestamp actuel
    const timestamp = new Date();
    
    // Obtenir l'IP depuis les headers
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                      req.headers.get("x-real-ip") || 
                      "unknown";

    let anomalyDetected = false;
    let anomalyReason = null;

    // Vérifier s'il y a déjà un check-in aujourd'hui sans check-out
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingCheckIn: any = await query(
        `SELECT id FROM Pointage 
         WHERE user_id = ? 
         AND type = 'IN' 
         AND timestamp >= ? 
         AND timestamp < ?
         AND id NOT IN (
           SELECT check_in_id FROM Pointage WHERE type = 'OUT' AND check_in_id IS NOT NULL
         )
         LIMIT 1`,
        [session.user.id, today, tomorrow]
      );

      if (existingCheckIn && existingCheckIn.length > 0) {
        anomalyDetected = true;
        anomalyReason = "Check-in déjà effectué aujourd'hui sans check-out";
      }
    } catch (checkError) {
      console.error("Error checking existing check-in:", checkError);
      // Continue même si la vérification échoue
    }

    // Insérer le pointage
    await query(
      `INSERT INTO Pointage (
        id, user_id, type, timestamp, status, 
        device_fingerprint, ip_address, geolocation,
        captured_photo, face_verified, verification_score,
        anomaly_detected, anomaly_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pointageId,
        session.user.id,
        "IN",
        timestamp,
        anomalyDetected ? "ANOMALY" : "VALID",
        deviceFingerprint ? JSON.stringify(deviceFingerprint) : null,
        ipAddress,
        geolocation ? JSON.stringify(geolocation) : null,
        capturedPhoto,
        faceVerified ? 1 : 0,
        verificationScore || null,
        anomalyDetected ? 1 : 0,
        anomalyReason
      ]
    );

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
            "CHECK_IN_ANOMALY",
            anomalyReason || "Anomalie détectée lors du pointage"
          );
        } else {
          await notificationService.notifyRHPointageSuccess(
            rhUserIds,
            userName,
            "check-in",
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
        ? "Check-in enregistré avec anomalie détectée"
        : "Check-in enregistré avec succès",
      pointage: {
        id: pointageId,
        timestamp: timestamp.toISOString(),
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
