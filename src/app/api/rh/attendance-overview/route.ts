/**
 * RH Attendance Overview API
 * 
 * GET /api/rh/attendance-overview?year=2026&month=2
 * 
 * Returns a full monthly grid of all employees with daily attendance status.
 * RH and SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      if (!["RH", "SUPER_ADMIN"].includes(user.role)) {
        return NextResponse.json({ error: "Accès réservé aux RH" }, { status: 403 });
      }

      const url = new URL(req.url);
      const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));
      const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));

      // Build date range for the month
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));

      // Count working days (Mon-Fri) in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const workingDays: string[] = [];
      const allDays: { date: string; dayOfWeek: number; isWeekend: boolean }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(Date.UTC(year, month - 1, d));
        const dayOfWeek = dt.getUTCDay(); // 0=Sun, 6=Sat
        const iso = dt.toISOString().split("T")[0];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        allDays.push({ date: iso, dayOfWeek, isWeekend });
        if (!isWeekend) workingDays.push(iso);
      }

      // Get all active employees (excluding SUPER_ADMIN/RH)
      const employees = await prisma.user.findMany({
        where: {
          role: { notIn: ["SUPER_ADMIN", "RH"] },
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          employee: {
            select: {
              nom: true,
              prenom: true,
              typeContrat: true,
              dateEmbauche: true,
              baseSalary: true,
              telephone: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Get ALL attendance sessions for this month
      const sessions = await prisma.attendanceSession.findMany({
        where: {
          date: { gte: startDate, lt: endDate },
          userId: { in: employees.map((e) => e.id) },
        },
        select: {
          userId: true,
          date: true,
          sessionType: true,
          checkIn: true,
          checkOut: true,
          durationMinutes: true,
          status: true,
          anomalyDetected: true,
          anomalyReason: true,
        },
      });

      // Get all leave requests for this month
      const leaves = await prisma.demandeConge.findMany({
        where: {
          userId: { in: employees.map((e) => e.id) },
          status: { in: ["EN_ATTENTE", "VALIDE"] },
          dateDebut: { lte: endDate },
          dateFin: { gte: startDate },
        },
        select: {
          userId: true,
          dateDebut: true,
          dateFin: true,
          type: true,
          status: true,
        },
      });

      // Build map: userId -> date -> attendance status
      const employeeData = employees.map((emp) => {
        const empSessions = sessions.filter((s) => s.userId === emp.id);
        const empLeaves = leaves.filter((l) => l.userId === emp.id);

        // Per-day stats
        let workedDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let totalMinutes = 0;
        let anomalies = 0;

        const dailyMap: Record<string, {
          status: "present" | "partial" | "absent" | "leave" | "weekend";
          morningIn: string | null;
          morningOut: string | null;
          afternoonIn: string | null;
          afternoonOut: string | null;
          totalMinutes: number;
          hasAnomaly: boolean;
          leaveType?: string;
        }> = {};

        for (const day of allDays) {
          if (day.isWeekend) {
            dailyMap[day.date] = { status: "weekend", morningIn: null, morningOut: null, afternoonIn: null, afternoonOut: null, totalMinutes: 0, hasAnomaly: false };
            continue;
          }

          // Check if employee is on leave this day
          const dayDate = new Date(day.date);
          const onLeave = empLeaves.find((l) => {
            const start = new Date(l.dateDebut);
            const end = new Date(l.dateFin);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return dayDate >= start && dayDate <= end && l.status === "VALIDE";
          });

          if (onLeave) {
            dailyMap[day.date] = { status: "leave", morningIn: null, morningOut: null, afternoonIn: null, afternoonOut: null, totalMinutes: 0, hasAnomaly: false, leaveType: onLeave.type || undefined };
            leaveDays++;
            continue;
          }

          // Check attendance
          const daySessions = empSessions.filter((s) => {
            const sDate = new Date(s.date).toISOString().split("T")[0];
            return sDate === day.date;
          });
          const morning = daySessions.find((s) => s.sessionType === "MORNING");
          const afternoon = daySessions.find((s) => s.sessionType === "AFTERNOON");

          const dayMinutes = (morning?.durationMinutes || 0) + (afternoon?.durationMinutes || 0);
          const hasAnyCheckIn = !!(morning?.checkIn || afternoon?.checkIn);
          const morningComplete = !!(morning?.checkIn && morning?.checkOut);
          const afternoonComplete = !!(afternoon?.checkIn && afternoon?.checkOut);
          const hasAnomaly = !!(morning?.anomalyDetected || afternoon?.anomalyDetected);

          if (hasAnomaly) anomalies++;

          let dayStatus: "present" | "partial" | "absent" = "absent";
          if (morningComplete && afternoonComplete) {
            dayStatus = "present";
            workedDays++;
          } else if (hasAnyCheckIn) {
            dayStatus = "partial";
            workedDays += 0.5;
          } else {
            // Only count as absent if the day is in the past or today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dayDate <= today) {
              absentDays++;
            }
          }

          totalMinutes += dayMinutes;

          dailyMap[day.date] = {
            status: dayStatus,
            morningIn: morning?.checkIn?.toISOString() || null,
            morningOut: morning?.checkOut?.toISOString() || null,
            afternoonIn: afternoon?.checkIn?.toISOString() || null,
            afternoonOut: afternoon?.checkOut?.toISOString() || null,
            totalMinutes: dayMinutes,
            hasAnomaly,
          };
        }

        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
        const attendanceRate = workingDays.length > 0 ? Math.round(((workedDays + leaveDays) / workingDays.length) * 100) : 0;

        return {
          id: emp.id,
          name: emp.employee?.prenom && emp.employee?.nom
            ? `${emp.employee.prenom} ${emp.employee.nom}`
            : emp.name || emp.email,
          email: emp.email,
          image: emp.image,
          typeContrat: emp.employee?.typeContrat || null,
          baseSalary: emp.employee?.baseSalary || null,
          workedDays,
          absentDays,
          leaveDays,
          totalHours,
          totalMinutes,
          anomalies,
          attendanceRate,
          expectedDays: workingDays.length,
          daily: dailyMap,
        };
      });

      return NextResponse.json({
        year,
        month,
        daysInMonth,
        workingDaysCount: workingDays.length,
        totalEmployees: employees.length,
        days: allDays,
        employees: employeeData,
      });
    } catch (error) {
      console.error("Attendance overview error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des données de présence" },
        { status: 500 }
      );
    }
  },
  { roles: ["RH", "SUPER_ADMIN"], requireActive: true }
);
