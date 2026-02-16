/**
 * Attendance Session Service
 * 
 * Manages 2-session-per-day attendance (MORNING / AFTERNOON).
 * Handles check-in/check-out with all security validations.
 * 
 * Rules enforced:
 * 1. Cannot check-out without check-in
 * 2. Cannot check-in twice for the same session
 * 3. Max 2 sessions per day (morning + afternoon)
 * 4. Minimum delay between clicks
 * 5. Stores timestamps, photo, IP, device fingerprint
 */

import prisma from '@/lib/prisma';
import {
  MIN_CLICK_DELAY_MS,
  MIN_SESSION_MINUTES,
  FULL_SESSION_THRESHOLD_MINUTES,
  EARLIEST_CHECKIN_HOUR,
  LATEST_CHECKOUT_HOUR,
  isWorkDay,
  toDateString,
} from '@/lib/payroll/constants';
import type {
  SessionType,
  AttendanceStatus,
  AttendanceSessionRecord,
  SessionCheckRequest,
  SessionCheckResponse,
  DayAttendanceSummary,
  DayStatus,
} from '@/lib/payroll/types';

class AttendanceSessionService {
  // ─── CHECK IN ──────────────────────────────────────────────

  /**
   * Process a check-in for a session (MORNING or AFTERNOON)
   */
  async checkIn(params: SessionCheckRequest): Promise<SessionCheckResponse> {
    const now = new Date();
    // Use UTC midnight of the LOCAL date to avoid Prisma @db.Date timezone issues
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const { userId, sessionType } = params;

    // Validation 1: Check working hours
    const hour = now.getHours();
    if (hour < EARLIEST_CHECKIN_HOUR || hour > LATEST_CHECKOUT_HOUR) {
      return {
        success: false,
        session: null as unknown as AttendanceSessionRecord,
        message: `Check-in interdit en dehors des heures de travail (${EARLIEST_CHECKIN_HOUR}h - ${LATEST_CHECKOUT_HOUR}h)`,
      };
    }

    // Validation 2: Check for existing session (no duplicate check-in)
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const existing = await prisma.attendanceSession.findFirst({
      where: {
        userId,
        sessionType,
        date: { gte: today, lt: tomorrow },
      },
    });

    if (existing?.checkIn) {
      return {
        success: false,
        session: this.toRecord(existing),
        message: `Vous avez déjà pointé pour la session ${sessionType === 'MORNING' ? 'du matin' : "de l'après-midi"}`,
      };
    }

    // Validation 3: Minimum delay between clicks
    const lastAction = await prisma.attendanceSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (lastAction) {
      const timeSinceLastAction = now.getTime() - new Date(lastAction.updatedAt).getTime();
      if (timeSinceLastAction < MIN_CLICK_DELAY_MS) {
        const waitSeconds = Math.ceil((MIN_CLICK_DELAY_MS - timeSinceLastAction) / 1000);
        return {
          success: false,
          session: this.toRecord(lastAction),
          message: `Veuillez patienter ${waitSeconds} secondes avant de pointer à nouveau`,
        };
      }
    }

    // Anomaly detection
    let anomalyDetected = false;
    let anomalyReason: string | null = null;

    // Check if it's a non-work day
    if (!isWorkDay(today)) {
      anomalyDetected = true;
      anomalyReason = 'Pointage effectué un jour non ouvrable';
    }

    // Create or update session (use explicit create/update to avoid upsert race condition)
    const sessionData = {
      checkIn: now,
      status: 'PARTIAL' as const,
      checkInPhoto: params.photo || null,
      checkInIp: params.ipAddress || null,
      deviceFingerprint: params.deviceFingerprint || null,
      anomalyDetected,
      anomalyReason,
    };

    let session;
    if (existing) {
      // Record exists but checkIn is null — update it
      session = await prisma.attendanceSession.update({
        where: { id: existing.id },
        data: sessionData,
      });
    } else {
      // No record yet — create, with fallback on race condition
      try {
        session = await prisma.attendanceSession.create({
          data: {
            userId,
            date: today,
            sessionType,
            ...sessionData,
          },
        });
      } catch (err: unknown) {
        // P2002 = unique constraint violation (race condition / double-click)
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          // Use findFirst with date range to avoid timezone mismatch on @db.Date
          const startOfDay = new Date(today);
          const endOfDay = new Date(today);
          endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

          const found = await prisma.attendanceSession.findFirst({
            where: {
              userId,
              sessionType,
              date: { gte: startOfDay, lt: endOfDay },
            },
          });
          if (!found) {
            // Record exists in DB but we can't find it — return error
            return {
              success: false,
              session: null as unknown as AttendanceSessionRecord,
              message: `Erreur de synchronisation, veuillez réessayer`,
            };
          }
          if (found.checkIn) {
            return {
              success: false,
              session: this.toRecord(found),
              message: `Vous avez déjà pointé pour cette session`,
            };
          }
          session = await prisma.attendanceSession.update({
            where: { id: found.id },
            data: sessionData,
          });
        } else {
          throw err;
        }
      }
    }

    return {
      success: true,
      session: this.toRecord(session),
      message: `Check-in ${sessionType === 'MORNING' ? 'matin' : 'après-midi'} enregistré avec succès`,
      anomaly: anomalyDetected ? { detected: true, reason: anomalyReason! } : undefined,
    };
  }

  // ─── CHECK OUT ─────────────────────────────────────────────

  /**
   * Process a check-out for a session
   */
  async checkOut(params: SessionCheckRequest): Promise<SessionCheckResponse> {
    const now = new Date();
    // Use UTC midnight of the LOCAL date to avoid Prisma @db.Date timezone issues
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const { userId, sessionType } = params;

    // Validation 1: Must have checked in first
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const existing = await prisma.attendanceSession.findFirst({
      where: {
        userId,
        sessionType,
        date: { gte: today, lt: tomorrow },
      },
    });

    if (!existing || !existing.checkIn) {
      return {
        success: false,
        session: null as unknown as AttendanceSessionRecord,
        message: `Impossible de pointer la sortie sans avoir pointé l'entrée pour la session ${sessionType === 'MORNING' ? 'du matin' : "de l'après-midi"}`,
      };
    }

    // Validation 2: Already checked out
    if (existing.checkOut) {
      return {
        success: false,
        session: this.toRecord(existing),
        message: `Sortie déjà enregistrée pour cette session`,
      };
    }

    // Validation 3: Minimum delay
    const timeSinceCheckIn = now.getTime() - new Date(existing.checkIn).getTime();
    if (timeSinceCheckIn < MIN_CLICK_DELAY_MS) {
      const waitSeconds = Math.ceil((MIN_CLICK_DELAY_MS - timeSinceCheckIn) / 1000);
      return {
        success: false,
        session: this.toRecord(existing),
        message: `Veuillez patienter ${waitSeconds} secondes après le check-in`,
      };
    }

    // Calculate duration
    const durationMinutes = Math.round(timeSinceCheckIn / (1000 * 60));

    // Determine status based on duration
    let status: AttendanceStatus = 'PARTIAL';
    if (durationMinutes >= FULL_SESSION_THRESHOLD_MINUTES) {
      status = 'FULL';
    } else if (durationMinutes < MIN_SESSION_MINUTES) {
      status = 'PARTIAL';
    }

    // Anomaly: very short session
    let anomalyDetected = existing.anomalyDetected;
    let anomalyReason = existing.anomalyReason;
    if (durationMinutes < MIN_SESSION_MINUTES) {
      anomalyDetected = true;
      anomalyReason = (anomalyReason ? anomalyReason + '; ' : '') +
        `Session très courte (${durationMinutes} min)`;
    }

    // Update session
    const session = await prisma.attendanceSession.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        durationMinutes,
        status,
        checkOutPhoto: params.photo || null,
        checkOutIp: params.ipAddress || null,
        anomalyDetected,
        anomalyReason,
      },
    });

    return {
      success: true,
      session: this.toRecord(session),
      message: `Check-out ${sessionType === 'MORNING' ? 'matin' : 'après-midi'} enregistré (${Math.floor(durationMinutes / 60)}h${(durationMinutes % 60).toString().padStart(2, '0')})`,
      anomaly: anomalyDetected ? { detected: true, reason: anomalyReason! } : undefined,
    };
  }

  // ─── TODAY STATUS ──────────────────────────────────────────

  /**
   * Get today's attendance status for a user
   */
  async getTodayStatus(userId: string): Promise<{
    morning: AttendanceSessionRecord | null;
    afternoon: AttendanceSessionRecord | null;
    dayStatus: DayStatus;
  }> {
    const now = new Date();
    // Use UTC midnight of the LOCAL date to avoid Prisma @db.Date timezone issues
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const sessions = await prisma.attendanceSession.findMany({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    const morning = sessions.find(s => s.sessionType === 'MORNING') || null;
    const afternoon = sessions.find(s => s.sessionType === 'AFTERNOON') || null;

    const dayStatus = this.computeDayStatus(morning, afternoon, today);

    return {
      morning: morning ? this.toRecord(morning) : null,
      afternoon: afternoon ? this.toRecord(afternoon) : null,
      dayStatus,
    };
  }

  // ─── MONTH SUMMARY ────────────────────────────────────────

  /**
   * Get attendance summary for a full month
   */
  async getMonthSummary(
    userId: string,
    year: number,
    month: number
  ): Promise<DayAttendanceSummary[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // Also load leaves for this month
    const leaves = await prisma.demandeConge.findMany({
      where: {
        userId,
        status: 'VALIDE',
        dateDebut: { lte: endDate },
        dateFin: { gte: startDate },
      },
    });

    // Also load reward days
    const rewards = await prisma.rewardDay.findMany({
      where: {
        userId,
        status: 'APPROVED',
        date: { gte: startDate, lte: endDate },
      },
    });

    // Build day-by-day summary
    const summaries: DayAttendanceSummary[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = toDateString(current);
      const dayDate = new Date(current);
      const isWork = isWorkDay(dayDate);

      const daySessions = sessions.filter(
        s => toDateString(new Date(s.date)) === dateStr
      );
      const morning = daySessions.find(s => s.sessionType === 'MORNING') || null;
      const afternoon = daySessions.find(s => s.sessionType === 'AFTERNOON') || null;

      // Check if this date has a leave
      const dayLeave = leaves.find(l => {
        const start = new Date(l.dateDebut);
        const end = new Date(l.dateFin);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return dayDate >= start && dayDate <= end;
      });

      // Check if this date has a reward
      const dayReward = rewards.find(
        r => toDateString(new Date(r.date)) === dateStr
      );

      let dayStatus: DayStatus;
      let workedMinutes = 0;
      const expectedMinutes = isWork ? 420 : 0; // 7h = 420min

      if (!isWork) {
        dayStatus = isWeekendDay(dayDate) ? 'WEEKEND' : 'HOLIDAY';
      } else if (dayReward) {
        dayStatus = 'REWARD';
        workedMinutes = 480; // Full day credit
      } else if (dayLeave) {
        if (dayLeave.isHalfDay) {
          const leavedSession = dayLeave.halfDaySession;
          if (leavedSession === 'MORNING') {
            dayStatus = 'LEAVE_HALF_AM';
            workedMinutes = (afternoon?.durationMinutes || 0);
          } else {
            dayStatus = 'LEAVE_HALF_PM';
            workedMinutes = (morning?.durationMinutes || 0);
          }
          // Add credit for the leave half (morning=180min/3h, afternoon=240min/4h)
          workedMinutes += leavedSession === 'MORNING' ? 180 : 240;
        } else {
          dayStatus = 'LEAVE_FULL';
          workedMinutes = 420; // Full day credit for paid leave
        }
      } else {
        dayStatus = this.computeDayStatus(morning, afternoon, dayDate);
        workedMinutes = (morning?.durationMinutes || 0) + (afternoon?.durationMinutes || 0);
      }

      summaries.push({
        date: new Date(dayDate),
        dateStr,
        morning: morning ? this.toRecord(morning) : null,
        afternoon: afternoon ? this.toRecord(afternoon) : null,
        dayStatus,
        workedMinutes,
        expectedMinutes,
        isWorkDay: isWork,
      });

      current.setDate(current.getDate() + 1);
    }

    return summaries;
  }

  // ─── ANOMALIES ─────────────────────────────────────────────

  /**
   * Get all attendance anomalies for RH review
   */
  async getAnomalies(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }) {
    const where: Record<string, unknown> = { anomalyDetected: true };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters?.startDate) (where.date as Record<string, unknown>).gte = filters.startDate;
      if (filters?.endDate) (where.date as Record<string, unknown>).lte = filters.endDate;
    }

    return prisma.attendanceSession.findMany({
      where: where as NonNullable<Parameters<typeof prisma.attendanceSession.findMany>[0]>['where'],
      include: { user: { select: { id: true, name: true, lastName: true, email: true } } },
      orderBy: { date: 'desc' },
    });
  }

  // ─── HELPERS ───────────────────────────────────────────────

  private computeDayStatus(
    morning: { status: string; checkIn: Date | null } | null,
    afternoon: { status: string; checkIn: Date | null } | null,
    date: Date
  ): DayStatus {
    if (!isWorkDay(date)) {
      return isWeekendDay(date) ? 'WEEKEND' : 'HOLIDAY';
    }

    const mStatus = morning?.status;
    const aStatus = afternoon?.status;

    if (mStatus === 'LEAVE_FULL' || aStatus === 'LEAVE_FULL') return 'LEAVE_FULL';
    if (mStatus === 'REWARD' || aStatus === 'REWARD') return 'REWARD';

    const morningWorked = mStatus === 'FULL' || mStatus === 'PARTIAL';
    const afternoonWorked = aStatus === 'FULL' || aStatus === 'PARTIAL';

    if (morningWorked && afternoonWorked) return 'FULL_DAY';
    if (morningWorked && !afternoonWorked) return 'HALF_DAY_AM';
    if (!morningWorked && afternoonWorked) return 'HALF_DAY_PM';

    return 'ABSENT';
  }

  private toRecord(session: {
    id: string;
    userId: string;
    date: Date;
    sessionType: string;
    checkIn: Date | null;
    checkOut: Date | null;
    durationMinutes: number | null;
    status: string;
    anomalyDetected: boolean | null;
    anomalyReason: string | null;
    [key: string]: unknown;
  }): AttendanceSessionRecord {
    return {
      id: session.id,
      userId: session.userId,
      date: session.date,
      sessionType: session.sessionType as SessionType,
      checkIn: session.checkIn,
      checkOut: session.checkOut,
      durationMinutes: session.durationMinutes,
      status: session.status as AttendanceStatus,
      anomalyDetected: session.anomalyDetected ?? false,
      anomalyReason: session.anomalyReason,
    };
  }
}

function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export const attendanceSessionService = new AttendanceSessionService();
