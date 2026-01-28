/**
 * RH Reject Employee API
 * Reject employee profile with reason
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getClientInfo } from "@/lib/rbac";
import { query, getConnection } from "@/lib/mysql-direct";
import { auditLogger } from "@/lib/services/audit-logger";
import { notificationService } from "@/lib/services/notification-service";
import { emailService } from "@/lib/services/email-service";
import { v4 as uuidv4 } from "uuid";
import type { RowDataPacket } from "mysql2";

interface EmployeeRow extends RowDataPacket {
  id: string;
  user_id: string;
  nom: string;
  user_db_id: string;
  user_email: string;
  user_name: string;
}

export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { employeId, reason, comments } = await req.json();
      
      if (!employeId || !reason) {
        return NextResponse.json(
          { error: "Employee ID and rejection reason are required" },
          { status: 400 }
        );
      }
      
      // Get employee
      const employees = await query<EmployeeRow[]>(`
        SELECT e.*, u.id as user_db_id, u.email as user_email, u.name as user_name
        FROM Employe e
        LEFT JOIN User u ON e.user_id = u.id
        WHERE e.id = ?
      `, [employeId]);
      
      if (!employees.length) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }
      
      const employee = employees[0];
      
      // Perform rejection in a transaction
      const connection = await getConnection();
      try {
        await connection.beginTransaction();
        
        // Update employee status
        await connection.execute(`
          UPDATE Employe 
          SET status = 'REJETE', rejection_reason = ?, approved_by = NULL, approved_at = NULL
          WHERE id = ?
        `, [reason, employeId]);
        
        // Update user status
        await connection.execute(`
          UPDATE User 
          SET status = 'REJECTED'
          WHERE id = ?
        `, [employee.user_id]);
        
        // Create RH decision record
        const decisionId = uuidv4();
        await connection.execute(`
          INSERT INTO RHDecision (id, employe_id, decider_id, decision, reason, comments, createdAt)
          VALUES (?, ?, ?, 'REJECTED', ?, ?, NOW())
        `, [decisionId, employeId, user.id, reason, comments || null]);
        
        await connection.commit();
      } catch (txError) {
        await connection.rollback();
        throw txError;
      } finally {
        connection.release();
      }
      
      // Send notification to employee
      try {
        await notificationService.notifyProfileRejected(employee.user_id, reason);
      } catch (e) {
        console.log("Notification error (non-blocking):", e);
      }
      
      // Send email to employee
      try {
        await emailService.sendProfileRejectedEmail(
          employee.user_email,
          employee.user_name || employee.nom || "Employé",
          reason,
          user.name || "Service RH"
        );
      } catch (e) {
        console.log("Email error (non-blocking):", e);
      }
      
      // Log the action
      const clientInfo = getClientInfo(req);
      try {
        await auditLogger.logRHDecision(
          employeId,
          user.id,
          "REJECTED",
          reason,
          clientInfo
        );
      } catch (e) {
        console.log("Audit log error (non-blocking):", e);
      }
      
      return NextResponse.json({
        success: true,
        message: "Employee rejected",
        employee: { id: employeId, status: "REJETE" },
      });
    } catch (error: any) {
      console.error("Error rejecting employee:", error);
      return NextResponse.json(
        { error: "Failed to reject employee" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
