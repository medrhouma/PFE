/**
 * Attendance Summary API
 * 
 * GET /api/attendance/summary?year=2026&month=2&userId=xxx
 * 
 * Returns monthly attendance summary with late/early tracking,
 * leaves, holidays, and detailed daily breakdown.
 * userId is optional (defaults to current user).
 * RH/Admin can query any employee.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { calculateAttendance } from "@/lib/payroll/attendance-calculator";
import {
  MORNING_START_TIME,
  AFTERNOON_START_TIME,
  MORNING_END_TIME,
  AFTERNOON_END_TIME,
  LATE_TOLERANCE_MINUTES,
  EARLY_DEPARTURE_TOLERANCE_MINUTES,
  STANDARD_HOURS_PER_DAY,
} from "@/lib/payroll/constants";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const url = new URL(req.url);
      const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()));
      const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1));
      let targetUserId = url.searchParams.get('userId') || user.id;

      // Only RH/Admin can view other users
      if (targetUserId !== user.id && !['RH', 'SUPER_ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { error: "Accès non autorisé" },
          { status: 403 }
        );
      }

      // Validate month/year
      if (month < 1 || month > 12 || year < 2020 || year > 2100) {
        return NextResponse.json(
          { error: "Mois ou année invalide" },
          { status: 400 }
        );
      }

      const attendance = await calculateAttendance(targetUserId, year, month);

      // Calculate attendance rate
      const attendanceRate = attendance.expectedWorkDays > 0
        ? Math.round((attendance.totalWorkedDays / attendance.expectedWorkDays) * 10000) / 100
        : 0;

      // Calculate punctuality rate (days without late / total present days)
      const presentDays = attendance.fullDays + attendance.partialDays;
      const punctualityRate = presentDays > 0
        ? Math.round(((presentDays - attendance.lateDays) / presentDays) * 10000) / 100
        : 100;

      return NextResponse.json({
        userId: targetUserId,
        year,
        month,
        summary: {
          // Work metrics
          totalWorkedDays: attendance.totalWorkedDays,
          totalWorkedHours: attendance.totalWorkedHours,
          totalWorkedMinutes: attendance.totalWorkedMinutes,
          expectedWorkDays: attendance.expectedWorkDays,
          expectedWorkHours: attendance.expectedWorkHours,
          
          // Absence metrics
          absentDays: attendance.absentDays,
          absentHours: attendance.absentHours,
          partialDays: attendance.partialDays,
          fullDays: attendance.fullDays,
          
          // Overtime
          overtimeHours: attendance.overtimeHours,
          
          // Late/Early tracking
          totalLateMinutes: attendance.totalLateMinutes,
          totalEarlyDepartureMinutes: attendance.totalEarlyDepartureMinutes,
          lateDays: attendance.lateDays,
          earlyDepartureDays: attendance.earlyDepartureDays,
          
          // Leave breakdown
          paidLeaveDays: attendance.paidLeaveDays,
          unpaidLeaveDays: attendance.unpaidLeaveDays,
          sickLeaveDays: attendance.sickLeaveDays,
          holidayDays: attendance.holidayDays,
          rewardDays: attendance.rewardDays,
          
          // Rates
          attendanceRate,
          punctualityRate,
        },
        // Schedule rules (for frontend display)
        rules: {
          morningStart: `${MORNING_START_TIME.hour}:${String(MORNING_START_TIME.minute).padStart(2, '0')}`,
          morningEnd: `${MORNING_END_TIME.hour}:${String(MORNING_END_TIME.minute).padStart(2, '0')}`,
          afternoonStart: `${AFTERNOON_START_TIME.hour}:${String(AFTERNOON_START_TIME.minute).padStart(2, '0')}`,
          afternoonEnd: `${AFTERNOON_END_TIME.hour}:${String(AFTERNOON_END_TIME.minute).padStart(2, '0')}`,
          lateTolerance: LATE_TOLERANCE_MINUTES,
          earlyDepartureTolerance: EARLY_DEPARTURE_TOLERANCE_MINUTES,
          standardHoursPerDay: STANDARD_HOURS_PER_DAY,
        },
        dailyDetails: attendance.dailySummaries.map(d => ({
          date: d.dateStr,
          dayStatus: d.dayStatus,
          workedMinutes: d.workedMinutes,
          expectedMinutes: d.expectedMinutes,
          isWorkDay: d.isWorkDay,
          lateMinutes: d.lateMinutes,
          earlyDepartureMinutes: d.earlyDepartureMinutes,
          isLate: d.isLate,
          isEarlyDeparture: d.isEarlyDeparture,
          holidayName: d.holidayName,
          leaveType: d.leaveType,
          morning: d.morning ? {
            checkIn: d.morning.checkIn,
            checkOut: d.morning.checkOut,
            duration: d.morning.durationMinutes,
            status: d.morning.status,
          } : null,
          afternoon: d.afternoon ? {
            checkIn: d.afternoon.checkIn,
            checkOut: d.afternoon.checkOut,
            duration: d.afternoon.durationMinutes,
            status: d.afternoon.status,
          } : null,
        })),
      });
    } catch (error: unknown) {
      console.error("Attendance summary error:", error);
      return NextResponse.json(
        { error: "Erreur lors du calcul du résumé" },
        { status: 500 }
      );
    }
  },
  { requireActive: true }
);
