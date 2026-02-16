/**
 * Team Attendance API (RH / SUPER_ADMIN only)
 * 
 * GET /api/attendance/team?date=YYYY-MM-DD (optional, defaults to today)
 * 
 * Returns today's attendance status for ALL active employees.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      // Only RH and SUPER_ADMIN can access
      if (!["RH", "SUPER_ADMIN"].includes(user.role)) {
        return NextResponse.json(
          { error: "Accès réservé aux RH" },
          { status: 403 }
        );
      }

      const url = new URL(req.url);
      const dateParam = url.searchParams.get("date");

      const now = new Date();
      let targetDate: Date;
      let nextDay: Date;

      if (dateParam) {
        const [year, month, day] = dateParam.split("-").map(Number);
        targetDate = new Date(Date.UTC(year, month - 1, day));
        nextDay = new Date(Date.UTC(year, month - 1, day + 1));
      } else {
        targetDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        nextDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
      }

      // Get all active employees only (exclude SUPER_ADMIN and RH)
      const employees = await prisma.user.findMany({
        where: {
          role: { notIn: ["SUPER_ADMIN", "RH"] },
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          employee: {
            select: {
              typeContrat: true,
              dateEmbauche: true,
              telephone: true,
              sexe: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Get all attendance sessions for the target date
      const sessions = await prisma.attendanceSession.findMany({
        where: {
          date: { gte: targetDate, lt: nextDay },
          userId: { in: employees.map((e) => e.id) },
        },
      });

      // Build per-employee attendance map
      const teamAttendance = employees.map((emp) => {
        const empSessions = sessions.filter((s) => s.userId === emp.id);
        const morning = empSessions.find((s) => s.sessionType === "MORNING") || null;
        const afternoon = empSessions.find((s) => s.sessionType === "AFTERNOON") || null;

        const totalMinutes =
          (morning?.durationMinutes || 0) + (afternoon?.durationMinutes || 0);

        let dayStatus: "absent" | "partial" | "present" | "complete" = "absent";
        if (morning?.checkIn || afternoon?.checkIn) {
          const morningDone = !!(morning?.checkIn && morning?.checkOut);
          const afternoonDone = !!(afternoon?.checkIn && afternoon?.checkOut);
          if (morningDone && afternoonDone) {
            dayStatus = "complete";
          } else if (morning?.checkOut || afternoon?.checkOut) {
            dayStatus = "present";
          } else {
            dayStatus = "partial";
          }
        }

        return {
          id: emp.id,
          name: emp.name || emp.email,
          email: emp.email,
          role: emp.role,
          image: emp.image,
          typeContrat: emp.employee?.typeContrat || null,
          dateEmbauche: emp.employee?.dateEmbauche || null,
          telephone: emp.employee?.telephone || null,
          sexe: emp.employee?.sexe || null,
          morning: morning
            ? {
                checkIn: morning.checkIn,
                checkOut: morning.checkOut,
                durationMinutes: morning.durationMinutes,
                status: morning.status,
              }
            : null,
          afternoon: afternoon
            ? {
                checkIn: afternoon.checkIn,
                checkOut: afternoon.checkOut,
                durationMinutes: afternoon.durationMinutes,
                status: afternoon.status,
              }
            : null,
          totalMinutes,
          dayStatus,
        };
      });

      // Summary stats
      const present = teamAttendance.filter((e) => e.dayStatus !== "absent").length;
      const absent = teamAttendance.filter((e) => e.dayStatus === "absent").length;
      const complete = teamAttendance.filter((e) => e.dayStatus === "complete").length;

      return NextResponse.json({
        date: dateParam || targetDate.toISOString().split("T")[0],
        totalEmployees: employees.length,
        present,
        absent,
        complete,
        employees: teamAttendance,
      });
    } catch (error: unknown) {
      console.error("Team attendance error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'équipe" },
        { status: 500 }
      );
    }
  },
  { requireActive: true }
);
