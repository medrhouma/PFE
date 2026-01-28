/**
 * RH Approve Employee API
 * Approve employee profile and activate user
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
      const { employeId, comments } = await req.json();
      
      if (!employeId) {
        return NextResponse.json(
          { error: "Employee ID is required" },
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
      
      // Perform approval in a transaction
      const connection = await getConnection();
      try {
        await connection.beginTransaction();
        
        // Update employee status
        await connection.execute(`
          UPDATE Employe 
          SET status = 'APPROUVE', approved_by = ?, approved_at = NOW(), rejection_reason = NULL
          WHERE id = ?
        `, [user.id, employeId]);
        
        // Update user status
        await connection.execute(`
          UPDATE User 
          SET status = 'ACTIVE'
          WHERE id = ?
        `, [employee.user_id]);
        
        // Create RH decision record
        const decisionId = uuidv4();
        await connection.execute(`
          INSERT INTO RHDecision (id, employe_id, decider_id, decision, comments, createdAt)
          VALUES (?, ?, ?, 'APPROVED', ?, NOW())
        `, [decisionId, employeId, user.id, comments || null]);
        
        await connection.commit();
      } catch (txError) {
        await connection.rollback();
        throw txError;
      } finally {
        connection.release();
      }
      
      // Send notification to employee
      const rhName = user.name || user.email || "Service RH";
      try {
        await notificationService.notifyProfileApproved(employee.user_id, rhName);
      } catch (e) {
        console.log("Notification error (non-blocking):", e);
      }
      
      // Send email to employee
      try {
        await emailService.sendProfileApprovedEmail(
          employee.user_email,
          employee.user_name || employee.nom || "Employé",
          rhName
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
          "APPROVED",
          comments,
          clientInfo
        );
      } catch (e) {
        console.log("Audit log error (non-blocking):", e);
      }
      
      return NextResponse.json({
        success: true,
        message: "Employee approved successfully",
        employee: { id: employeId, status: "APPROUVE" },
      });
    } catch (error: any) {
      console.error("Error approving employee:", error);
      return NextResponse.json(
        { error: "Failed to approve employee" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
