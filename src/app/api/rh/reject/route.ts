/**
 * RH Reject Employee API
 * Reject employee profile with reason
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getClientInfo } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { auditLogger } from "@/lib/services/audit-logger";
import { notificationService } from "@/lib/services/notification-service";
import { emailService } from "@/lib/services/email-service";

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
      const employee = await prisma.employe.findUnique({
        where: { id: employeId },
        include: { user: true },
      });
      
      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }
      
      // Perform rejection in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update employee status
        const updatedEmployee = await tx.employe.update({
          where: { id: employeId },
          data: {
            status: "REJETE",
            rejectionReason: reason,
            approvedBy: null,
            approvedAt: null,
          },
        });
        
        // Update user status
        await tx.user.update({
          where: { id: employee.userId },
          data: { status: "REJECTED" },
        });
        
        // Create RH decision record
        await tx.rHDecision.create({
          data: {
            employeId,
            deciderId: user.id,
            decision: "REJECTED",
            reason,
            comments,
          },
        });
        
        return updatedEmployee;
      });
      
      // Send notification to employee
      await notificationService.notifyProfileRejected(employee.userId, reason);
      
      // Send email to employee
      await emailService.sendProfileRejectedEmail(
        employee.user.email,
        employee.user.name || employee.nom || "Employé",
        reason,
        user.name || "Service RH"
      );
      
      // Log the action
      const clientInfo = getClientInfo(req);
      await auditLogger.logRHDecision(
        employeId,
        user.id,
        "REJECTED",
        reason,
        clientInfo
      );
      
      return NextResponse.json({
        success: true,
        message: "Employee rejected",
        employee: result,
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
