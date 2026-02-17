/**
 * Employee Detail Archive API
 * 
 * GET /api/rh/employee-archive/[id]?year=2026&month=2
 * 
 * Returns detailed attendance, leave, and salary history
 * for a specific employee. RH and SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { estimateSalary } from "@/lib/payroll/engine";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      if (!["RH", "SUPER_ADMIN"].includes(user.role)) {
        return NextResponse.json({ error: "Accès réservé aux RH" }, { status: 403 });
      }

      // Extract employee ID from URL path
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const employeeId = pathParts[pathParts.length - 1];

      if (!employeeId) {
        return NextResponse.json({ error: "ID employé requis" }, { status: 400 });
      }

      const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));
      const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));

      // Get employee info
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
          status: true,
          createdAt: true,
          employee: {
            select: {
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
              typeContrat: true,
              dateEmbauche: true,
              baseSalary: true,
              hourlyRate: true,
              annualLeave: true,
              adresse: true,
              sexe: true,
              birthday: true,
              rib: true,
            },
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 });
      }

      // Date range for the month
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));

      // Count working days 
      const daysInMonth = new Date(year, month, 0).getDate();
      const allDays: { date: string; dayOfWeek: number; isWeekend: boolean }[] = [];
      let workingDaysCount = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(Date.UTC(year, month - 1, d));
        const dayOfWeek = dt.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        allDays.push({ date: dt.toISOString().split("T")[0], dayOfWeek, isWeekend });
        if (!isWeekend) workingDaysCount++;
      }

      // Get all attendance sessions for this employee this month
      const sessions = await prisma.attendanceSession.findMany({
        where: {
          userId: employeeId,
          date: { gte: startDate, lt: endDate },
        },
        orderBy: { date: "asc" },
      });

      // Get all leave requests
      const leaveRequests = await prisma.demandeConge.findMany({
        where: {
          userId: employeeId,
          dateDebut: { lte: endDate },
          dateFin: { gte: startDate },
        },
        orderBy: { dateDebut: "desc" },
      });

      // Get salary report if exists
      let salaryReport = await prisma.salaryReport.findUnique({
        where: {
          userId_month_year: {
            userId: employeeId,
            month,
            year,
          },
        },
      });

      // If no report, try to estimate salary
      let salaryEstimate = null;
      try {
        salaryEstimate = await estimateSalary(employeeId, year, month);
      } catch (e) {
        // If salary estimation fails, that's ok
        console.log("Salary estimation not available:", e);
      }

      // Build daily breakdown
      const dailyBreakdown = allDays.map((day) => {
        if (day.isWeekend) {
          return { ...day, status: "weekend" as const, morning: null, afternoon: null, totalMinutes: 0, leaveType: null, anomaly: null };
        }

        // Check leave
        const dayDate = new Date(day.date);
        const onLeave = leaveRequests.find((l) => {
          const start = new Date(l.dateDebut);
          const end = new Date(l.dateFin);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          return dayDate >= start && dayDate <= end && l.status === "VALIDE";
        });

        if (onLeave) {
          return { ...day, status: "leave" as const, morning: null, afternoon: null, totalMinutes: 0, leaveType: onLeave.type, anomaly: null };
        }

        // Check attendance
        const daySessions = sessions.filter((s) => {
          const sDate = new Date(s.date).toISOString().split("T")[0];
          return sDate === day.date;
        });
        const morning = daySessions.find((s) => s.sessionType === "MORNING");
        const afternoon = daySessions.find((s) => s.sessionType === "AFTERNOON");
        const totalMins = (morning?.durationMinutes || 0) + (afternoon?.durationMinutes || 0);
        const hasAnomaly = !!(morning?.anomalyDetected || afternoon?.anomalyDetected);
        const anomalyReason = morning?.anomalyReason || afternoon?.anomalyReason || null;

        const morningComplete = !!(morning?.checkIn && morning?.checkOut);
        const afternoonComplete = !!(afternoon?.checkIn && afternoon?.checkOut);
        const hasAny = !!(morning?.checkIn || afternoon?.checkIn);

        let status: "present" | "partial" | "absent" = "absent";
        if (morningComplete && afternoonComplete) status = "present";
        else if (hasAny) status = "partial";

        return {
          ...day,
          status,
          morning: morning ? {
            checkIn: morning.checkIn?.toISOString() || null,
            checkOut: morning.checkOut?.toISOString() || null,
            duration: morning.durationMinutes,
          } : null,
          afternoon: afternoon ? {
            checkIn: afternoon.checkIn?.toISOString() || null,
            checkOut: afternoon.checkOut?.toISOString() || null,
            duration: afternoon.durationMinutes,
          } : null,
          totalMinutes: totalMins,
          leaveType: null,
          anomaly: hasAnomaly ? anomalyReason : null,
        };
      });

      // Calculate summary stats
      const presentDays = dailyBreakdown.filter((d) => d.status === "present").length;
      const partialDays = dailyBreakdown.filter((d) => d.status === "partial").length;
      const absentDays = dailyBreakdown.filter((d) => d.status === "absent").length;
      const leaveDayCount = dailyBreakdown.filter((d) => d.status === "leave").length;
      const totalWorkedMinutes = dailyBreakdown.reduce((s, d) => s + d.totalMinutes, 0);
      const anomalyCount = dailyBreakdown.filter((d) => d.anomaly).length;

      // Get leave balance: annual - used
      const annualAllowance = employee.employee?.annualLeave || 26;
      const usedLeaves = await prisma.demandeConge.aggregate({
        where: {
          userId: employeeId,
          status: "VALIDE",
          dateDebut: { gte: new Date(Date.UTC(year, 0, 1)) },
          dateFin: { lt: new Date(Date.UTC(year + 1, 0, 1)) },
        },
        _sum: { durationDays: true },
      });
      const pendingLeaves = await prisma.demandeConge.aggregate({
        where: {
          userId: employeeId,
          status: "EN_ATTENTE",
          dateDebut: { gte: new Date(Date.UTC(year, 0, 1)) },
          dateFin: { lt: new Date(Date.UTC(year + 1, 0, 1)) },
        },
        _sum: { durationDays: true },
      });

      return NextResponse.json({
        employee: {
          id: employee.id,
          name: employee.employee?.prenom && employee.employee?.nom
            ? `${employee.employee.prenom} ${employee.employee.nom}`
            : employee.name || employee.email,
          email: employee.email,
          image: employee.image,
          telephone: employee.employee?.telephone || null,
          typeContrat: employee.employee?.typeContrat || null,
          dateEmbauche: employee.employee?.dateEmbauche || null,
          baseSalary: employee.employee?.baseSalary || null,
          hourlyRate: employee.employee?.hourlyRate || null,
          annualLeave: annualAllowance,
          adresse: employee.employee?.adresse || null,
          sexe: employee.employee?.sexe || null,
          birthday: employee.employee?.birthday || null,
          rib: employee.employee?.rib || null,
          status: employee.status,
          createdAt: employee.createdAt,
        },
        year,
        month,
        daysInMonth,
        workingDaysCount,
        summary: {
          presentDays,
          partialDays,
          absentDays,
          leaveDays: leaveDayCount,
          totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
          totalWorkedMinutes,
          anomalies: anomalyCount,
          attendanceRate: workingDaysCount > 0
            ? Math.round(((presentDays + partialDays * 0.5 + leaveDayCount) / workingDaysCount) * 100)
            : 0,
        },
        dailyBreakdown,
        leaveRequests: leaveRequests.map((l) => ({
          id: l.id,
          type: l.type,
          dateDebut: l.dateDebut,
          dateFin: l.dateFin,
          status: l.status,
          durationDays: l.durationDays,
        })),
        leaveBalance: {
          annualAllowance,
          used: usedLeaves._sum.durationDays || 0,
          pending: pendingLeaves._sum.durationDays || 0,
          remaining: annualAllowance - (usedLeaves._sum.durationDays || 0),
        },
        salary: salaryReport ? {
          baseSalary: salaryReport.baseSalary,
          grossSalary: salaryReport.grossSalary,
          netSalary: salaryReport.netSalary,
          deductions: salaryReport.deductions,
          status: salaryReport.status,
        } : salaryEstimate ? {
          baseSalary: salaryEstimate.baseSalary,
          grossSalary: null,
          netSalary: salaryEstimate.estimatedNet,
          deductions: salaryEstimate.baseSalary - salaryEstimate.estimatedNet,
          status: "ESTIMATE",
        } : null,
      });
    } catch (error) {
      console.error("Employee archive error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'archive employé" },
        { status: 500 }
      );
    }
  },
  { roles: ["RH", "SUPER_ADMIN"], requireActive: true }
);
