/**
 * Today Status API
 * GET /api/pointage/today-status
 */

import { withActiveStatus, successResponse, errorResponse } from "@/lib/api-helpers";
import { query } from "@/lib/mysql-direct";

export const GET = withActiveStatus(async (context) => {
  try {
    const { user } = context;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check for today's check-in
    const checkIns = await query(
      `SELECT id, timestamp FROM Pointage 
       WHERE user_id = ? AND type = 'IN' AND timestamp >= ? AND timestamp < ?
       ORDER BY timestamp DESC LIMIT 1`,
      [user.id, today, tomorrow]
    ) as any[];
    const checkIn = checkIns[0] || null;

    // Check for today's check-out
    const checkOuts = await query(
      `SELECT id, timestamp FROM Pointage 
       WHERE user_id = ? AND type = 'OUT' AND timestamp >= ? AND timestamp < ?
       ORDER BY timestamp DESC LIMIT 1`,
      [user.id, today, tomorrow]
    ) as any[];
    const checkOut = checkOuts[0] || null;

    return successResponse({
      hasCheckedIn: !!checkIn,
      hasCheckedOut: !!checkOut,
      checkInTime: checkIn?.timestamp || null,
      checkOutTime: checkOut?.timestamp || null,
      checkInId: checkIn?.id || null,
      checkOutId: checkOut?.id || null,
    });
  } catch (error: any) {
    console.error("Error fetching today status:", error);
    return errorResponse(
      "Impossible de récupérer le statut du jour",
      500,
      { message: error.message }
    );
  }
});
