/**
 * Attendance Session API
 * 
 * POST /api/attendance/session
 * 
 * Body: { action: "CHECK_IN" | "CHECK_OUT", sessionType: "MORNING" | "AFTERNOON", photo?, deviceFingerprint? }
 * 
 * Handles check-in and check-out for morning/afternoon sessions.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getClientInfo } from "@/lib/rbac";
import { attendanceSessionService } from "@/lib/services/attendance-session-service";
import { auditLogger } from "@/lib/services/audit-logger";
import type { SessionType } from "@/lib/payroll/types";

export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const { action, sessionType, photo, deviceFingerprint } = body;

      // Validate action
      if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
        return NextResponse.json(
          { error: "Action invalide. Utilisez CHECK_IN ou CHECK_OUT" },
          { status: 400 }
        );
      }

      // Validate session type
      if (!['MORNING', 'AFTERNOON'].includes(sessionType)) {
        return NextResponse.json(
          { error: "Type de session invalide. Utilisez MORNING ou AFTERNOON" },
          { status: 400 }
        );
      }

      const clientInfo = getClientInfo(req);
      const params = {
        userId: user.id,
        sessionType: sessionType as SessionType,
        photo,
        ipAddress: clientInfo.ipAddress,
        deviceFingerprint: deviceFingerprint ? JSON.stringify(deviceFingerprint) : undefined,
      };

      let result;
      if (action === 'CHECK_IN') {
        result = await attendanceSessionService.checkIn(params);
      } else {
        result = await attendanceSessionService.checkOut(params);
      }

      // Audit log
      await auditLogger.log({
        userId: user.id,
        action: `ATTENDANCE_${action}`,
        entityType: "AttendanceSession",
        entityId: result.session?.id || '',
        metadata: JSON.stringify({
          sessionType,
          success: result.success,
          anomaly: result.anomaly,
        }),
        ipAddress: clientInfo.ipAddress,
        userAgent: req.headers.get("user-agent") || undefined,
        severity: result.anomaly?.detected ? "WARNING" : "INFO",
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.message, session: result.session },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        session: result.session,
        anomaly: result.anomaly,
      });
    } catch (error: unknown) {
      console.error("Attendance session error:", error);
      return NextResponse.json(
        { error: "Erreur lors du pointage" },
        { status: 500 }
      );
    }
  },
  { requireActive: true }
);

/**
 * GET /api/attendance/session
 * 
 * Query: ?date=YYYY-MM-DD (optional, defaults to today)
 * 
 * Returns today's attendance status
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const url = new URL(req.url);
      const dateParam = url.searchParams.get('date');
      
      if (dateParam) {
        // Get specific date — use UTC midnight to match Prisma @db.Date
        const [year, month, day] = dateParam.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

        const prisma = (await import('@/lib/prisma')).default;

        const sessions = await prisma.attendanceSession.findMany({
          where: { userId: user.id, date: { gte: date, lt: nextDay } },
        });

        return NextResponse.json({
          date: dateParam,
          morning: sessions.find(s => s.sessionType === 'MORNING') || null,
          afternoon: sessions.find(s => s.sessionType === 'AFTERNOON') || null,
        });
      }

      // Default: today's status
      const status = await attendanceSessionService.getTodayStatus(user.id);
      return NextResponse.json(status);
    } catch (error: unknown) {
      console.error("Get attendance status error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération du statut" },
        { status: 500 }
      );
    }
  },
  { requireActive: true }
);
