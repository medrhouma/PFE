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
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let stats = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalHours: 0,
      totalCheckIns: 0,
      totalCheckOuts: 0,
      anomalies: 0
    };

    try {
      // Get basic counts
      const statsData: any[] = await query(
        `SELECT 
          COUNT(CASE WHEN type = 'IN' THEN 1 END) as totalCheckIns,
          COUNT(CASE WHEN type = 'OUT' THEN 1 END) as totalCheckOuts,
          COUNT(CASE WHEN anomaly_detected = 1 THEN 1 END) as anomalies
         FROM Pointage 
         WHERE user_id = ? 
         AND timestamp >= ? 
         AND timestamp <= ?`,
        [session.user.id, firstDay.toISOString(), lastDay.toISOString()]
      );

      // Calculate actual hours from AttendanceSession durations
      let totalMinutes = 0;
      try {
        const durationData: any[] = await query(
          `SELECT COALESCE(SUM(durationMinutes), 0) as totalMinutes
           FROM AttendanceSession 
           WHERE userId = ? 
           AND date >= ? 
           AND date <= ?
           AND status = 'COMPLETED'`,
          [session.user.id, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
        );
        if (durationData.length > 0) {
          totalMinutes = parseInt(durationData[0]?.totalMinutes || 0);
        }
      } catch {
        // AttendanceSession table may not exist, fallback
      }

      if (statsData.length > 0) {
        const totalCheckIns = parseInt(statsData[0]?.totalCheckIns || 0);
        const totalCheckOuts = parseInt(statsData[0]?.totalCheckOuts || 0);
        const calculatedHours = totalMinutes > 0 
          ? Math.round(totalMinutes / 60 * 10) / 10 
          : Math.min(totalCheckIns, totalCheckOuts) * 7; // 7h/day fallback
        stats = {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          totalHours: calculatedHours,
          totalCheckIns: totalCheckIns,
          totalCheckOuts: totalCheckOuts,
          anomalies: parseInt(statsData[0]?.anomalies || 0)
        };
      }
    } catch (dbError) {
      console.error("Error querying stats:", dbError);
      // Return default stats if table doesn't exist
    }

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { stats: { totalHours: 0, totalCheckIns: 0, totalCheckOuts: 0, anomalies: 0 } }
    );
  }
}
