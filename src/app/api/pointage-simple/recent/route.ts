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

    // Récupérer les 20 derniers pointages
    const pointages: any = await query(
      `SELECT * FROM Pointage 
       WHERE user_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 20`,
      [session.user.id]
    );

    const formattedPointages = pointages.map((p: any) => ({
      id: p.id,
      type: p.type,
      timestamp: p.timestamp,
      status: p.status,
      hoursWorked: p.hours_worked,
      anomalyDetected: p.anomaly_detected,
      anomalyReason: p.anomaly_reason
    }));

    return NextResponse.json({ pointages: formattedPointages });
  } catch (error: any) {
    console.error("Error fetching recent pointages:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération", pointages: [] },
      { status: 500 }
    );
  }
}
