/**
 * Attendance Points API
 * 
 * GET /api/attendance/points
 * 
 * Calculates attendance score/points for the current month.
 * 
 * Scoring rules:
 * - Full day present (both sessions): +10 points
 * - Half day present: +5 points
 * - Absent day: -10 points (loses the day's points)
 * - Late arrival (anomaly): -2 points per occurrence
 * - On-time streak bonus: +1 point per consecutive on-time day
 * 
 * Query params:
 * - month (optional): 1-12
 * - year (optional): e.g. 2026
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

// ─── Points Constants ───────────────────────────────────────
const POINTS_FULL_DAY = 10;       // Both sessions complete
const POINTS_HALF_DAY = 5;        // One session only
const POINTS_ABSENT = -10;        // Full day absent
const POINTS_LATE = -2;           // Per late arrival (very low penalty)
const POINTS_STREAK_BONUS = 1;    // Per consecutive on-time day

interface DayRecord {
  date: string;
  morningCheckIn: string | null;
  morningCheckOut: string | null;
  afternoonCheckIn: string | null;
  afternoonCheckOut: string | null;
  morningAnomaly: boolean;
  afternoonAnomaly: boolean;
  morningDuration: number | null;
  afternoonDuration: number | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const url = new URL(req.url);
    const now = new Date();
    const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));
    const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));

    const userId = url.searchParams.get("userId") || session.user.id;

    // Only RH/SUPER_ADMIN can view other users' points
    if (userId !== session.user.id && !["RH", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Get the date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Don't count future days
    const effectiveEndDate = endDate > today ? today : endDate;

    // Get all attendance sessions for this month
    const sessions: any[] = await query(
      `SELECT 
        DATE_FORMAT(date, '%Y-%m-%d') as day_date,
        session_type,
        check_in_time,
        check_out_time,
        duration_minutes,
        anomaly_detected
       FROM attendance_sessions
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date ASC, session_type ASC`,
      [userId, startDate, effectiveEndDate]
    );

    // Get holidays for this period
    const holidays: any[] = await query(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') as holiday_date 
       FROM jour_ferie 
       WHERE annee = ?`,
      [year]
    );
    const holidaySet = new Set(holidays.map(h => h.holiday_date));

    // Build day-by-day data
    const dayMap: Record<string, DayRecord> = {};
    for (const s of sessions) {
      if (!dayMap[s.day_date]) {
        dayMap[s.day_date] = {
          date: s.day_date,
          morningCheckIn: null, morningCheckOut: null,
          afternoonCheckIn: null, afternoonCheckOut: null,
          morningAnomaly: false, afternoonAnomaly: false,
          morningDuration: null, afternoonDuration: null,
        };
      }
      const rec = dayMap[s.day_date];
      if (s.session_type === 'MORNING') {
        rec.morningCheckIn = s.check_in_time;
        rec.morningCheckOut = s.check_out_time;
        rec.morningAnomaly = !!s.anomaly_detected;
        rec.morningDuration = s.duration_minutes;
      } else {
        rec.afternoonCheckIn = s.check_in_time;
        rec.afternoonCheckOut = s.check_out_time;
        rec.afternoonAnomaly = !!s.anomaly_detected;
        rec.afternoonDuration = s.duration_minutes;
      }
    }

    // Calculate points day by day
    let totalPoints = 0;
    let presencePts = 0;
    let absencePts = 0;
    let latePts = 0;
    let streakBonusPts = 0;

    let currentStreak = 0;
    let bestStreak = 0;
    let daysPresent = 0;
    let daysAbsent = 0;
    let daysLate = 0;
    let totalWorkDays = 0;

    const dailyBreakdown: Array<{
      date: string;
      points: number;
      presence: string;
      lateCount: number;
      streakBonus: number;
    }> = [];

    // Iterate through each day
    const current = new Date(startDate);
    while (current <= effectiveEndDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();

      // Skip weekends and holidays
      if (dayOfWeek === 0 || dayOfWeek === 6 || holidaySet.has(dateStr)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      totalWorkDays++;
      const rec = dayMap[dateStr];

      let dayPoints = 0;
      let dayPresence = "absent";
      let dayLateCount = 0;
      let dayStreakBonus = 0;

      if (rec) {
        const hasMorning = !!(rec.morningCheckIn && rec.morningCheckOut);
        const hasAfternoon = !!(rec.afternoonCheckIn && rec.afternoonCheckOut);

        if (hasMorning && hasAfternoon) {
          // Full day
          dayPoints += POINTS_FULL_DAY;
          presencePts += POINTS_FULL_DAY;
          dayPresence = "full";
          daysPresent++;
        } else if (hasMorning || hasAfternoon) {
          // Half day
          dayPoints += POINTS_HALF_DAY;
          presencePts += POINTS_HALF_DAY;
          dayPresence = "half";
          daysPresent += 0.5;
        } else if (rec.morningCheckIn || rec.afternoonCheckIn) {
          // Checked in but didn't check out (in progress or incomplete)
          dayPoints += POINTS_HALF_DAY;
          presencePts += POINTS_HALF_DAY;
          dayPresence = "partial";
          daysPresent += 0.5;
        } else {
          // No data = absent
          dayPoints += POINTS_ABSENT;
          absencePts += POINTS_ABSENT;
          dayPresence = "absent";
          daysAbsent++;
        }

        // Late penalties
        if (rec.morningAnomaly) {
          dayPoints += POINTS_LATE;
          latePts += POINTS_LATE;
          dayLateCount++;
          daysLate++;
        }
        if (rec.afternoonAnomaly) {
          dayPoints += POINTS_LATE;
          latePts += POINTS_LATE;
          dayLateCount++;
          daysLate++;
        }

        // Streak: on time for both sessions (no anomaly) and full day
        if (hasMorning && hasAfternoon && !rec.morningAnomaly && !rec.afternoonAnomaly) {
          currentStreak++;
          dayStreakBonus = currentStreak * POINTS_STREAK_BONUS;
          streakBonusPts += dayStreakBonus;
          dayPoints += dayStreakBonus;
          if (currentStreak > bestStreak) bestStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      } else {
        // No session at all = absent
        dayPoints += POINTS_ABSENT;
        absencePts += POINTS_ABSENT;
        daysAbsent++;
        currentStreak = 0;
      }

      totalPoints += dayPoints;

      dailyBreakdown.push({
        date: dateStr,
        points: dayPoints,
        presence: dayPresence,
        lateCount: dayLateCount,
        streakBonus: dayStreakBonus,
      });

      current.setDate(current.getDate() + 1);
    }

    // Calculate max possible points (if perfect attendance, 0 lates, max streak)
    let maxPossible = 0;
    for (let i = 0; i < totalWorkDays; i++) {
      maxPossible += POINTS_FULL_DAY + (i + 1) * POINTS_STREAK_BONUS;
    }

    const scorePercent = maxPossible > 0 ? Math.round((totalPoints / maxPossible) * 100) : 0;

    // Determine level/rank based on score
    let level: string;
    let levelColor: string;
    if (scorePercent >= 90) { level = "Excellent"; levelColor = "emerald"; }
    else if (scorePercent >= 75) { level = "Très bien"; levelColor = "blue"; }
    else if (scorePercent >= 60) { level = "Bien"; levelColor = "amber"; }
    else if (scorePercent >= 40) { level = "Moyen"; levelColor = "orange"; }
    else { level = "À améliorer"; levelColor = "red"; }

    return NextResponse.json({
      month,
      year,
      totalPoints,
      maxPossible,
      scorePercent,
      level,
      levelColor,
      breakdown: {
        presencePoints: presencePts,
        absencePoints: absencePts,
        latePoints: latePts,
        streakBonusPoints: streakBonusPts,
      },
      stats: {
        totalWorkDays,
        daysPresent,
        daysAbsent,
        daysLate,
        currentStreak,
        bestStreak,
      },
      rules: {
        fullDay: POINTS_FULL_DAY,
        halfDay: POINTS_HALF_DAY,
        absent: POINTS_ABSENT,
        late: POINTS_LATE,
        streakBonus: POINTS_STREAK_BONUS,
      },
      dailyBreakdown,
    });
  } catch (error: any) {
    console.error("Error calculating attendance points:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des points", details: error.message },
      { status: 500 }
    );
  }
}
