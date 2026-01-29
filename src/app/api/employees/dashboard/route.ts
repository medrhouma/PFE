/**
 * Employee Dashboard API
 * GET /api/employees/dashboard
 */

import {
  withActiveStatus,
  successResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { query } from "@/lib/mysql-direct";

export const GET = withActiveStatus(async (context) => {
  const { user } = context;

  try {
    // Get current month date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get current week date range
    const firstDayOfWeek = new Date(now);
    firstDayOfWeek.setDate(now.getDate() - now.getDay());
    firstDayOfWeek.setHours(0, 0, 0, 0);

    // Attendance this month (count check-ins)
    const attendanceThisMonthResult = await query(
      `SELECT COUNT(*) as count FROM Pointage 
       WHERE user_id = ? AND type = 'IN' AND timestamp >= ? AND timestamp <= ?`,
      [user.id, firstDayOfMonth, lastDayOfMonth]
    ) as any[];
    const attendanceThisMonth = attendanceThisMonthResult[0]?.count || 0;

    // Attendance this week
    const attendanceThisWeekResult = await query(
      `SELECT COUNT(*) as count FROM Pointage 
       WHERE user_id = ? AND type = 'IN' AND timestamp >= ?`,
      [user.id, firstDayOfWeek]
    ) as any[];
    const attendanceThisWeek = attendanceThisWeekResult[0]?.count || 0;

    // Leave requests stats
    const leavesStats = await query(
      `SELECT status, COUNT(*) as count FROM demande_conge WHERE userId = ? GROUP BY status`,
      [user.id]
    ) as any[];

    const leavesMap: Record<string, number> = {};
    leavesStats.forEach((s: any) => {
      leavesMap[s.status] = s.count;
    });

    const leaves = {
      pending: leavesMap['EN_ATTENTE'] || 0,
      approved: leavesMap['VALIDE'] || 0,
      rejected: leavesMap['REFUSE'] || 0,
      total: Object.values(leavesMap).reduce((acc, count) => acc + count, 0),
    };

    // Get recent anomalies
    const recentAnomalies = await query(
      `SELECT a.id, a.type, a.description, a.severity, a.createdAt
       FROM Anomaly a
       INNER JOIN Pointage p ON a.pointageId = p.id
       WHERE p.user_id = ? AND a.status IN ('PENDING', 'INVESTIGATING')
       ORDER BY a.createdAt DESC
       LIMIT 5`,
      [user.id]
    ) as any[];

    // Anomalies count
    const anomaliesCountResult = await query(
      `SELECT COUNT(*) as count FROM Anomaly a
       INNER JOIN Pointage p ON a.pointageId = p.id
       WHERE p.user_id = ? AND a.status IN ('PENDING', 'INVESTIGATING')`,
      [user.id]
    ) as any[];
    const anomaliesCount = anomaliesCountResult[0]?.count || 0;

    // Get last check-in/out
    const lastCheckInResult = await query(
      `SELECT timestamp FROM Pointage WHERE user_id = ? AND type = 'IN' ORDER BY timestamp DESC LIMIT 1`,
      [user.id]
    ) as any[];

    const lastCheckOutResult = await query(
      `SELECT timestamp FROM Pointage WHERE user_id = ? AND type = 'OUT' ORDER BY timestamp DESC LIMIT 1`,
      [user.id]
    ) as any[];

    return successResponse({
      attendance: {
        thisMonth: attendanceThisMonth,
        thisWeek: attendanceThisWeek,
        lastCheckIn: lastCheckInResult[0]?.timestamp || null,
        lastCheckOut: lastCheckOutResult[0]?.timestamp || null,
      },
      leaves,
      anomalies: {
        count: anomaliesCount,
        recent: recentAnomalies.map((a: any) => ({
          id: a.id,
          type: a.type,
          description: a.description,
          severity: a.severity,
          date: a.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Employee dashboard error:", error);
    return errorResponse(
      "Erreur lors du chargement du tableau de bord",
      500,
      error.message
    );
  }
});
