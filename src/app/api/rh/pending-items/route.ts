/**
 * RH Pending Items API
 * GET /api/rh/pending-items
 */

import { withRole, successResponse, errorResponse } from "@/lib/api-helpers";
import { query } from "@/lib/mysql-direct";
import type { RowDataPacket } from "mysql2";

interface PendingEmployee extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

interface PendingLeave extends RowDataPacket {
  id: string;
  type: string;
  date_debut: Date;
  status: string;
  user_name: string;
  user_email: string;
}

interface PendingAnomaly extends RowDataPacket {
  id: string;
  description: string;
  severity: string;
  created_at: Date;
  pointage_id: string;
  user_name: string;
  user_email: string;
}

export const GET = withRole(["RH", "SUPER_ADMIN"], async (context) => {
  try {
    // Get pending employees
    const pendingEmployees = await query<PendingEmployee[]>(`
      SELECT id, name, email, createdAt as created_at
      FROM User
      WHERE status = 'PENDING'
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    // Get pending leave requests
    const pendingLeaves = await query<PendingLeave[]>(`
      SELECT 
        dc.id, dc.type, dc.date_debut, dc.status,
        u.name as user_name, u.email as user_email
      FROM demande_conge dc
      LEFT JOIN User u ON dc.userId = u.id
      WHERE dc.status = 'EN_ATTENTE'
      ORDER BY dc.date_debut ASC
      LIMIT 10
    `);

    // Get pending anomalies (if table exists)
    let pendingAnomalies: PendingAnomaly[] = [];
    try {
      pendingAnomalies = await query<PendingAnomaly[]>(`
        SELECT 
          a.id, a.description, a.severity, a.created_at, a.pointage_id,
          u.name as user_name, u.email as user_email
        FROM anomalies a
        LEFT JOIN pointages p ON a.pointage_id = p.id
        LEFT JOIN User u ON p.user_id = u.id
        WHERE a.status = 'PENDING'
        ORDER BY 
          CASE a.severity 
            WHEN 'URGENT' THEN 0 
            WHEN 'HIGH' THEN 1 
            WHEN 'NORMAL' THEN 2 
            WHEN 'LOW' THEN 3 
            ELSE 2 
          END
        LIMIT 10
      `);
    } catch (e) {
      // Table might not exist
      console.log("Anomalies table not found or error:", e);
    }

    // Format all pending items
    const pendingItems = [
      ...pendingEmployees.map((emp) => ({
        id: emp.id,
        type: "employee" as const,
        name: emp.name || emp.email,
        description: "Profil en attente de validation",
        date: emp.created_at,
        priority: "NORMAL" as const,
      })),
      ...pendingLeaves.map((leave) => ({
        id: leave.id,
        type: "leave" as const,
        name: leave.user_name || leave.user_email,
        description: `Demande de congé (${leave.type})`,
        date: leave.date_debut,
        priority: "NORMAL" as const,
      })),
      ...pendingAnomalies.map((anomaly) => ({
        id: anomaly.id,
        type: "anomaly" as const,
        name: anomaly.user_name || anomaly.user_email || "Utilisateur inconnu",
        description: anomaly.description,
        date: anomaly.created_at,
        priority: anomaly.severity as any,
      })),
    ];

    // Sort by priority and date
    const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    pendingItems.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return successResponse(pendingItems.slice(0, 20));
  } catch (error: any) {
    console.error("RH pending items error:", error);
    return errorResponse(
      "Erreur lors du chargement des éléments en attente",
      500,
      error.message
    );
  }
});
