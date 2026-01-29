import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let formattedPointages: any[] = [];

    try {
      // Récupérer les 20 derniers pointages using raw SQL
      const pointages: any[] = await query(
        `SELECT id, type, timestamp, status, anomaly_detected, anomaly_reason
         FROM Pointage 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 20`,
        [session.user.id]
      );

      formattedPointages = pointages.map((p: any) => ({
        id: p.id,
        type: p.type,
        timestamp: p.timestamp,
        status: p.status,
        hoursWorked: null,
        anomalyDetected: p.anomaly_detected,
        anomalyReason: p.anomaly_reason
      }));
    } catch (dbError) {
      console.error("Error querying recent pointages:", dbError);
      // Return empty array if table doesn't exist
    }

    return NextResponse.json({ pointages: formattedPointages });
  } catch (error: any) {
    console.error("Error fetching recent pointages:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération", pointages: [] }
    );
  }
}
