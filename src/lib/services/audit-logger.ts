/**
 * Audit Logger Service
 * Centralized logging for all critical actions
 */

import { prisma } from "@/lib/prisma";

interface AuditLogParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
}

class AuditLogger {
  /**
   * Log an action to the database
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          changes: params.changes ? JSON.stringify(params.changes) : null,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          severity: params.severity || "INFO",
        },
      });
    } catch (error) {
      // Don't throw - logging shouldn't break the main flow
      console.error("Failed to create audit log:", error);
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: "LOGIN",
      entityType: "User",
      entityId: userId,
      ipAddress,
      userAgent,
      severity: "INFO",
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: "LOGOUT",
      entityType: "User",
      entityId: userId,
      ipAddress,
      userAgent,
      severity: "INFO",
    });
  }

  /**
   * Log entity creation
   */
  async logCreate(
    entityType: string,
    entityId: string,
    userId?: string,
    data?: any,
    clientInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.log({
      userId,
      action: "CREATE",
      entityType,
      entityId,
      changes: data,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      severity: "INFO",
    });
  }

  /**
   * Log entity update
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    userId?: string,
    changes?: { before: any; after: any },
    clientInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.log({
      userId,
      action: "UPDATE",
      entityType,
      entityId,
      changes,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      severity: "INFO",
    });
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: string,
    entityId: string,
    userId?: string,
    data?: any,
    clientInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.log({
      userId,
      action: "DELETE",
      entityType,
      entityId,
      changes: data,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      severity: "WARNING",
    });
  }

  /**
   * Log RH decision
   */
  async logRHDecision(
    employeId: string,
    rhId: string,
    decision: "APPROVED" | "REJECTED",
    reason?: string,
    clientInfo?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.log({
      userId: rhId,
      action: "RH_DECISION",
      entityType: "Employe",
      entityId: employeId,
      metadata: { decision, reason },
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      severity: "INFO",
    });
  }

  /**
   * Log anomaly detection
   */
  async logAnomaly(
    type: string,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    description: string,
    metadata?: any
  ) {
    await this.log({
      action: "ANOMALY_DETECTED",
      entityType: "Anomaly",
      metadata: { type, description, ...metadata },
      severity: severity as any,
    });
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    severity?: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.severity) where.severity = filters.severity;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    
    return await prisma.auditLog.findMany({
      where,
      take: filters.limit || 100,
      skip: filters.offset || 0,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            roleEnum: true,
          },
        },
      },
    });
  }
}

export const auditLogger = new AuditLogger();
