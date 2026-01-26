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

    // Calculer les stats du mois en cours
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const statsData: any = await query(
      `SELECT 
        COUNT(CASE WHEN type = 'IN' THEN 1 END) as totalCheckIns,
        COUNT(CASE WHEN type = 'OUT' THEN 1 END) as totalCheckOuts,
        SUM(CASE WHEN type = 'OUT' THEN hours_worked ELSE 0 END) as totalHours,
        COUNT(CASE WHEN anomaly_detected = 1 THEN 1 END) as anomalies
       FROM Pointage 
       WHERE user_id = ? 
       AND timestamp >= ? 
       AND timestamp <= ?`,
      [session.user.id, firstDay, lastDay]
    );

    const stats = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalHours: parseFloat(statsData[0]?.totalHours || 0),
      totalCheckIns: parseInt(statsData[0]?.totalCheckIns || 0),
      totalCheckOuts: parseInt(statsData[0]?.totalCheckOuts || 0),
      anomalies: parseInt(statsData[0]?.anomalies || 0)
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { stats: { totalHours: 0, totalCheckIns: 0, totalCheckOuts: 0, anomalies: 0 } },
      { status: 500 }
    );
  }
}
