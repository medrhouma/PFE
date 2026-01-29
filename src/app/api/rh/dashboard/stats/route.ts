/**
 * RH Dashboard Stats API
 * GET /api/rh/dashboard/stats
 */

import { withRole, successResponse, errorResponse } from "@/lib/api-helpers";
import { query } from "@/lib/mysql-direct";

export const GET = withRole(["RH", "SUPER_ADMIN"], async (context) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Employee stats
    const [totalResult, activeResult, pendingResult, suspendedResult] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM User`) as Promise<any[]>,
      query(`SELECT COUNT(*) as count FROM User WHERE status = 'ACTIVE'`) as Promise<any[]>,
      query(`SELECT COUNT(*) as count FROM User WHERE status = 'PENDING'`) as Promise<any[]>,
      query(`SELECT COUNT(*) as count FROM User WHERE status = 'SUSPENDED'`) as Promise<any[]>,
    ]);

    const totalEmployees = totalResult[0]?.count || 0;
    const activeEmployees = activeResult[0]?.count || 0;
    const pendingEmployees = pendingResult[0]?.count || 0;
    const suspendedEmployees = suspendedResult[0]?.count || 0;

    // Attendance today - count unique users who checked in
    const attendanceToday = await query(
      `SELECT COUNT(DISTINCT user_id) as count FROM Pointage 
       WHERE type = 'IN' AND timestamp >= ? AND timestamp < ?`,
      [today, tomorrow]
    ) as any[];

    // Leave requests stats
    const leavesStats = await query(
      `SELECT status, COUNT(*) as count FROM demande_conge GROUP BY status`
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

    // Anomalies count
    const anomaliesResult = await query(
      `SELECT COUNT(*) as count FROM Anomaly WHERE status IN ('PENDING', 'INVESTIGATING')`
    ) as any[];
    const anomaliesCount = anomaliesResult[0]?.count || 0;

    // Notifications count
    const notificationsResult = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [context.user.id]
    ) as any[];
    const notificationsCount = notificationsResult[0]?.count || 0;

    return successResponse({
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        pending: pendingEmployees,
        suspended: suspendedEmployees,
      },
      attendance: {
        today: {
          present: attendanceToday[0]?.count || 0,
          total: activeEmployees,
        },
        thisWeek: 0, // TODO: Calculate
        anomalies: anomaliesCount,
      },
      leaves,
      system: {
        anomalies: anomaliesCount,
        notifications: notificationsCount,
      },
    });
  } catch (error: any) {
    console.error("RH dashboard stats error:", error);
    return errorResponse(
      "Erreur lors du chargement des statistiques",
      500,
      error.message
    );
  }
});
