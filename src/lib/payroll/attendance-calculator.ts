/**
 * Attendance Calculator
 * 
 * Converts raw attendance session data into structured
 * attendance metrics for salary computation.
 * Includes late/early tracking, leave categorization, and holiday detection.
 */

import { attendanceSessionService } from '@/lib/services/attendance-session-service';
import {
  STANDARD_HOURS_PER_DAY,
  MORNING_SESSION_HOURS,
  AFTERNOON_SESSION_HOURS,
  countWorkDaysInMonth,
} from '@/lib/payroll/constants';
import type { AttendanceCalculation, DayAttendanceSummary } from '@/lib/payroll/types';

/**
 * Calculate attendance metrics for a given month
 */
export async function calculateAttendance(
  userId: string,
  year: number,
  month: number
): Promise<AttendanceCalculation> {
  // Get day-by-day summary from attendance service
  const dailySummaries = await attendanceSessionService.getMonthSummary(userId, year, month);

  const expectedWorkDays = countWorkDaysInMonth(year, month);
  const expectedWorkHours = expectedWorkDays * STANDARD_HOURS_PER_DAY;

  let totalWorkedMinutes = 0;
  let absentDays = 0;
  let fullDays = 0;
  let partialDays = 0;
  let overtimeMinutes = 0;
  let totalLateMinutes = 0;
  let totalEarlyDepartureMinutes = 0;
  let lateDays = 0;
  let earlyDepartureDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let sickLeaveDays = 0;
  let holidayDays = 0;
  let rewardDaysCount = 0;

  for (const day of dailySummaries) {
    // Count holidays
    if (day.dayStatus === 'HOLIDAY') {
      holidayDays++;
      continue;
    }
    if (day.dayStatus === 'WEEKEND') continue;
    if (!day.isWorkDay) continue;

    // Track late/early
    if (day.isLate) {
      lateDays++;
      totalLateMinutes += day.lateMinutes;
    }
    if (day.isEarlyDeparture) {
      earlyDepartureDays++;
      totalEarlyDepartureMinutes += day.earlyDepartureMinutes;
    }

    switch (day.dayStatus) {
      case 'FULL_DAY':
        fullDays++;
        totalWorkedMinutes += day.workedMinutes;
        // Check for overtime (worked more than standard)
        if (day.workedMinutes > day.expectedMinutes) {
          overtimeMinutes += day.workedMinutes - day.expectedMinutes;
        }
        break;

      case 'HALF_DAY_AM':
      case 'HALF_DAY_PM':
        partialDays++;
        totalWorkedMinutes += day.workedMinutes;
        break;

      case 'LEAVE_FULL':
        fullDays++;
        totalWorkedMinutes += day.expectedMinutes;
        // Categorize leave type
        if (day.leaveType === 'UNPAID') {
          unpaidLeaveDays++;
        } else if (day.leaveType === 'MALADIE') {
          sickLeaveDays++;
        } else {
          paidLeaveDays++;
        }
        break;

      case 'LEAVE_HALF_AM':
      case 'LEAVE_HALF_PM':
        fullDays += 0.5;
        partialDays += 0.5;
        totalWorkedMinutes += day.workedMinutes;
        // Half day leave counts as 0.5
        if (day.leaveType === 'UNPAID') {
          unpaidLeaveDays += 0.5;
        } else if (day.leaveType === 'MALADIE') {
          sickLeaveDays += 0.5;
        } else {
          paidLeaveDays += 0.5;
        }
        break;

      case 'REWARD':
        fullDays++;
        rewardDaysCount++;
        totalWorkedMinutes += day.expectedMinutes;
        break;

      case 'ABSENT':
        absentDays++;
        break;

      default:
        break;
    }
  }

  const totalWorkedHours = totalWorkedMinutes / 60;
  const totalWorkedDays = fullDays + (partialDays * 0.5);
  const absentHours = absentDays * STANDARD_HOURS_PER_DAY;
  const overtimeHours = overtimeMinutes / 60;

  return {
    totalWorkedDays,
    totalWorkedHours: round2(totalWorkedHours),
    totalWorkedMinutes,
    expectedWorkDays,
    expectedWorkHours,
    absentDays,
    absentHours: round2(absentHours),
    partialDays,
    fullDays,
    overtimeHours: round2(overtimeHours),
    totalLateMinutes,
    totalEarlyDepartureMinutes,
    lateDays,
    earlyDepartureDays,
    paidLeaveDays,
    unpaidLeaveDays,
    sickLeaveDays,
    holidayDays,
    rewardDays: rewardDaysCount,
    dailySummaries,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
