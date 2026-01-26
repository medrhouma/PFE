/**
 * RH Approve Employee API
 * Approve employee profile and activate user
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
      const { employeId, comments } = await req.json();
      
      if (!employeId) {
        return NextResponse.json(
          { error: "Employee ID is required" },
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
      
      // Perform approval in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update employee status
        const updatedEmployee = await tx.employe.update({
          where: { id: employeId },
          data: {
            status: "APPROUVE",
            approvedBy: user.id,
            approvedAt: new Date(),
            rejectionReason: null,
          },
        });
        
        // Update user status
        await tx.user.update({
          where: { id: employee.userId },
          data: { status: "ACTIVE" },
        });
        
        // Create RH decision record
        await tx.rHDecision.create({
          data: {
            employeId,
            deciderId: user.id,
            decision: "APPROVED",
            comments,
          },
        });
        
        return updatedEmployee;
      });
      
      // Send notification to employee
      const rhName = user.name || user.email || "Service RH";
      await notificationService.notifyProfileApproved(employee.userId, rhName);
      
      // Send email to employee
      await emailService.sendProfileApprovedEmail(
        employee.user.email,
        employee.user.name || employee.nom || "Employé",
        rhName
      );
      
      // Log the action
      const clientInfo = getClientInfo(req);
      await auditLogger.logRHDecision(
        employeId,
        user.id,
        "APPROVED",
        comments,
        clientInfo
      );
      
      return NextResponse.json({
        success: true,
        message: "Employee approved successfully",
        employee: result,
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
