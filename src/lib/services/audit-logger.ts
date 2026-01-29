/**
 * Audit Logger Service
 * Centralized logging for all critical actions
 * Production-grade logging with role tracking
 */

import { query, execute } from "@/lib/mysql-direct";

// Action types for comprehensive logging
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
  PASSWORD_RESET_COMPLETE: "PASSWORD_RESET_COMPLETE",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  
  // Session
  SESSION_CREATED: "SESSION_CREATED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_REVOKED: "SESSION_REVOKED",
  
  // Cookie Consent (GDPR)
  COOKIE_CONSENT_ACCEPTED: "COOKIE_CONSENT_ACCEPTED",
  COOKIE_CONSENT_REJECTED: "COOKIE_CONSENT_REJECTED",
  COOKIE_CONSENT_CUSTOMIZED: "COOKIE_CONSENT_CUSTOMIZED",
  COOKIE_CONSENT_UPDATED: "COOKIE_CONSENT_UPDATED",
  
  // Face Verification
  FACE_VERIFY_SUCCESS: "FACE_VERIFY_SUCCESS",
  FACE_VERIFY_FAILED: "FACE_VERIFY_FAILED",
  FACE_REGISTRATION: "FACE_REGISTRATION",
  
  // Pointage (Attendance)
  POINTAGE_ENTREE: "POINTAGE_ENTREE",
  POINTAGE_SORTIE: "POINTAGE_SORTIE",
  POINTAGE_PAUSE_DEBUT: "POINTAGE_PAUSE_DEBUT",
  POINTAGE_PAUSE_FIN: "POINTAGE_PAUSE_FIN",
  POINTAGE_MANUAL: "POINTAGE_MANUAL",
  POINTAGE_CORRECTION: "POINTAGE_CORRECTION",
  
  // Leave Requests
  LEAVE_REQUEST_CREATED: "LEAVE_REQUEST_CREATED",
  LEAVE_REQUEST_APPROVED: "LEAVE_REQUEST_APPROVED",
  LEAVE_REQUEST_REJECTED: "LEAVE_REQUEST_REJECTED",
  LEAVE_REQUEST_CANCELLED: "LEAVE_REQUEST_CANCELLED",
  
  // Employee Management
  EMPLOYEE_CREATED: "EMPLOYEE_CREATED",
  EMPLOYEE_APPROVED: "EMPLOYEE_APPROVED",
  EMPLOYEE_REJECTED: "EMPLOYEE_REJECTED",
  EMPLOYEE_UPDATED: "EMPLOYEE_UPDATED",
  EMPLOYEE_DEACTIVATED: "EMPLOYEE_DEACTIVATED",
  
  // Documents
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  DOCUMENT_DOWNLOADED: "DOCUMENT_DOWNLOADED",
  DOCUMENT_DELETED: "DOCUMENT_DELETED",
  
  // Security
  SECURITY_CSRF_VIOLATION: "SECURITY_CSRF_VIOLATION",
  SECURITY_RATE_LIMIT: "SECURITY_RATE_LIMIT",
  SECURITY_SUSPICIOUS_ACTIVITY: "SECURITY_SUSPICIOUS_ACTIVITY",
  
  // Anomalies
  ANOMALY_DETECTED: "ANOMALY_DETECTED",
  ANOMALY_RESOLVED: "ANOMALY_RESOLVED",
  
  // RH Decisions
  RH_DECISION: "RH_DECISION",
  
  // CRUD
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  
  // Export
  EXPORT_GENERATED: "EXPORT_GENERATED",
  EXPORT_DOWNLOADED: "EXPORT_DOWNLOADED",
  
  // Profile
  PROFILE_UPDATED: "PROFILE_UPDATED",
  PROFILE_COMPLETED: "PROFILE_COMPLETED",
  
  // Error tracking
  API_ERROR: "API_ERROR",
  SYSTEM_ERROR: "SYSTEM_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

interface AuditLogParams {
  userId?: string;
  userRole?: string;
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
   * Log an action to the database using mysql-direct for reliability
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await execute(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent, metadata, severity, created_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          params.userId || null,
          params.action,
          params.entityType,
          params.entityId || null,
          params.changes ? JSON.stringify(params.changes) : null,
          params.ipAddress || null,
          params.userAgent || null,
          params.metadata ? JSON.stringify({ ...params.metadata, userRole: params.userRole }) : 
            params.userRole ? JSON.stringify({ userRole: params.userRole }) : null,
          params.severity || "INFO",
        ]
      );
    } catch (error) {
      // Don't throw - logging shouldn't break the main flow
      console.error("Failed to create audit log:", error);
    }
  }

  /**
   * Log user login
   */
  async logLogin(
    userId: string, 
    ipAddress?: string, 
    userAgent?: string,
    metadata?: { role?: string; method?: string; device?: string }
  ) {
    await this.log({
      userId,
      userRole: metadata?.role,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: "User",
      entityId: userId,
      ipAddress,
      userAgent,
      metadata: { loginMethod: metadata?.method, device: metadata?.device },
      severity: "INFO",
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailed(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ) {
    await this.log({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: "User",
      ipAddress,
      userAgent,
      metadata: { email, reason },
      severity: "WARNING",
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId: string, ipAddress?: string, userAgent?: string, role?: string) {
    await this.log({
      userId,
      userRole: role,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: "User",
      entityId: userId,
      ipAddress,
      userAgent,
      severity: "INFO",
    });
  }

  /**
   * Log cookie consent action
   */
  async logCookieConsent(
    action: "accepted" | "rejected" | "customized",
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    sessionId?: string,
    preferences?: { necessary: boolean; functional: boolean; analytics: boolean; marketing: boolean }
  ) {
    const actionMap = {
      accepted: AUDIT_ACTIONS.COOKIE_CONSENT_ACCEPTED,
      rejected: AUDIT_ACTIONS.COOKIE_CONSENT_REJECTED,
      customized: AUDIT_ACTIONS.COOKIE_CONSENT_CUSTOMIZED,
    };

    await this.log({
      userId,
      action: actionMap[action],
      entityType: "CookieConsent",
      entityId: sessionId,
      ipAddress,
      userAgent,
      metadata: { preferences, sessionId },
      severity: "INFO",
    });
  }

  /**
   * Log face verification attempt
   */
  async logFaceVerification(
    userId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    metadata?: { confidence?: number; reason?: string; deviceId?: string; mode?: string }
  ) {
    await this.log({
      userId,
      action: success ? AUDIT_ACTIONS.FACE_VERIFY_SUCCESS : AUDIT_ACTIONS.FACE_VERIFY_FAILED,
      entityType: "FaceVerification",
      entityId: userId,
      ipAddress,
      userAgent,
      metadata,
      severity: success ? "INFO" : "WARNING",
    });
  }

  /**
   * Log pointage (attendance) action
   */
  async logPointage(
    userId: string,
    type: "entree" | "sortie" | "pause_debut" | "pause_fin" | "manual" | "correction",
    ipAddress?: string,
    userAgent?: string,
    metadata?: {
      pointageId?: string;
      location?: string;
      faceVerified?: boolean;
      correctedBy?: string;
      originalTime?: string;
      newTime?: string;
    }
  ) {
    const actionMap = {
      entree: AUDIT_ACTIONS.POINTAGE_ENTREE,
      sortie: AUDIT_ACTIONS.POINTAGE_SORTIE,
      pause_debut: AUDIT_ACTIONS.POINTAGE_PAUSE_DEBUT,
      pause_fin: AUDIT_ACTIONS.POINTAGE_PAUSE_FIN,
      manual: AUDIT_ACTIONS.POINTAGE_MANUAL,
      correction: AUDIT_ACTIONS.POINTAGE_CORRECTION,
    };

    await this.log({
      userId,
      action: actionMap[type],
      entityType: "Pointage",
      entityId: metadata?.pointageId,
      ipAddress,
      userAgent,
      metadata,
      severity: type === "correction" ? "WARNING" : "INFO",
    });
  }

  /**
   * Log leave request action
   */
  async logLeaveRequest(
    action: "created" | "approved" | "rejected" | "cancelled",
    leaveRequestId: string,
    employeeId: string,
    decidedBy?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: {
      leaveType?: string;
      startDate?: string;
      endDate?: string;
      reason?: string;
      comment?: string;
    }
  ) {
    const actionMap = {
      created: AUDIT_ACTIONS.LEAVE_REQUEST_CREATED,
      approved: AUDIT_ACTIONS.LEAVE_REQUEST_APPROVED,
      rejected: AUDIT_ACTIONS.LEAVE_REQUEST_REJECTED,
      cancelled: AUDIT_ACTIONS.LEAVE_REQUEST_CANCELLED,
    };

    await this.log({
      userId: decidedBy || employeeId,
      action: actionMap[action],
      entityType: "LeaveRequest",
      entityId: leaveRequestId,
      ipAddress,
      userAgent,
      metadata: { employeeId, ...metadata },
      severity: action === "rejected" ? "WARNING" : "INFO",
    });
  }

  /**
   * Log employee management action
   */
  async logEmployeeAction(
    action: "created" | "approved" | "rejected" | "updated" | "deactivated",
    employeeId: string,
    performedBy?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: { reason?: string; changes?: any }
  ) {
    const actionMap = {
      created: AUDIT_ACTIONS.EMPLOYEE_CREATED,
      approved: AUDIT_ACTIONS.EMPLOYEE_APPROVED,
      rejected: AUDIT_ACTIONS.EMPLOYEE_REJECTED,
      updated: AUDIT_ACTIONS.EMPLOYEE_UPDATED,
      deactivated: AUDIT_ACTIONS.EMPLOYEE_DEACTIVATED,
    };

    await this.log({
      userId: performedBy,
      action: actionMap[action],
      entityType: "Employe",
      entityId: employeeId,
      ipAddress,
      userAgent,
      metadata,
      changes: metadata?.changes,
      severity: ["rejected", "deactivated"].includes(action) ? "WARNING" : "INFO",
    });
  }

  /**
   * Log document action
   */
  async logDocument(
    action: "uploaded" | "downloaded" | "deleted",
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: { filename?: string; size?: number; type?: string }
  ) {
    const actionMap = {
      uploaded: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
      downloaded: AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
      deleted: AUDIT_ACTIONS.DOCUMENT_DELETED,
    };

    await this.log({
      userId,
      action: actionMap[action],
      entityType: "Document",
      entityId: documentId,
      ipAddress,
      userAgent,
      metadata,
      severity: action === "deleted" ? "WARNING" : "INFO",
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    type: "csrf_violation" | "rate_limit" | "suspicious_activity",
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    metadata?: { reason?: string; endpoint?: string; count?: number }
  ) {
    const actionMap = {
      csrf_violation: AUDIT_ACTIONS.SECURITY_CSRF_VIOLATION,
      rate_limit: AUDIT_ACTIONS.SECURITY_RATE_LIMIT,
      suspicious_activity: AUDIT_ACTIONS.SECURITY_SUSPICIOUS_ACTIVITY,
    };

    await this.log({
      userId,
      action: actionMap[type],
      entityType: "Security",
      ipAddress,
      userAgent,
      metadata,
      severity: "WARNING",
    });
  }

  /**
   * Log API error for tracking and debugging
   */
  async logError(
    type: "api" | "system" | "validation" | "database",
    error: Error | string,
    context: {
      endpoint?: string;
      method?: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      requestData?: any;
      stackTrace?: string;
    }
  ) {
    const actionMap = {
      api: AUDIT_ACTIONS.API_ERROR,
      system: AUDIT_ACTIONS.SYSTEM_ERROR,
      validation: AUDIT_ACTIONS.VALIDATION_ERROR,
      database: AUDIT_ACTIONS.DATABASE_ERROR,
    };

    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : context.stackTrace;

    await this.log({
      userId: context.userId,
      action: actionMap[type],
      entityType: "Error",
      metadata: {
        message: errorMessage,
        endpoint: context.endpoint,
        method: context.method,
        requestData: context.requestData,
        stackTrace: stackTrace?.substring(0, 1000), // Limit stack trace length
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      severity: type === "system" || type === "database" ? "CRITICAL" : "ERROR",
    });
  }

  /**
   * Log export action
   */
  async logExport(
    action: "generated" | "downloaded",
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: { format?: string; type?: string; recordCount?: number }
  ) {
    await this.log({
      userId,
      action: action === "generated" ? AUDIT_ACTIONS.EXPORT_GENERATED : AUDIT_ACTIONS.EXPORT_DOWNLOADED,
      entityType: "Export",
      ipAddress,
      userAgent,
      metadata,
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
    metadata?: any,
    userId?: string
  ) {
    await this.log({
      userId,
      action: AUDIT_ACTIONS.ANOMALY_DETECTED,
      entityType: "Anomaly",
      metadata: { type, description, ...metadata },
      severity: severity === "LOW" ? "INFO" : 
               severity === "MEDIUM" ? "WARNING" :
               severity === "HIGH" ? "ERROR" : "CRITICAL",
    });
  }

  /**
   * Query audit logs with mysql-direct for better compatibility
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
    search?: string;
  }) {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    if (filters.userId) {
      conditions.push("al.user_id = ?");
      params.push(filters.userId);
    }
    if (filters.action) {
      conditions.push("al.action = ?");
      params.push(filters.action);
    }
    if (filters.entityType) {
      conditions.push("al.entity_type = ?");
      params.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push("al.entity_id = ?");
      params.push(filters.entityId);
    }
    if (filters.severity) {
      conditions.push("al.severity = ?");
      params.push(filters.severity);
    }
    if (filters.startDate) {
      conditions.push("al.created_at >= ?");
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push("al.created_at <= ?");
      params.push(filters.endDate);
    }
    if (filters.search) {
      conditions.push("(al.action LIKE ? OR al.entity_type LIKE ? OR al.metadata LIKE ?)");
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const limit = Number(filters.limit) || 100;
    const offset = Number(filters.offset) || 0;

    // Use string interpolation for LIMIT/OFFSET to avoid mysql2 prepared statement issues
    const sql = `
      SELECT 
        al.id, al.user_id, al.action, al.entity_type, al.entity_id,
        al.changes, al.ip_address, al.user_agent, al.metadata, al.severity, al.created_at,
        u.name as user_name, u.email as user_email, u.role as user_role
      FROM audit_logs al
      LEFT JOIN User u ON al.user_id = u.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = await query(sql, params) as any[];
    
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      changes: row.changes ? JSON.parse(row.changes) : null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      severity: row.severity,
      createdAt: row.created_at,
      user: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        roleEnum: row.user_role,
      } : null,
    }));
  }

  /**
   * Count audit logs matching filters
   */
  async count(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    if (filters.userId) {
      conditions.push("user_id = ?");
      params.push(filters.userId);
    }
    if (filters.action) {
      conditions.push("action = ?");
      params.push(filters.action);
    }
    if (filters.entityType) {
      conditions.push("entity_type = ?");
      params.push(filters.entityType);
    }
    if (filters.severity) {
      conditions.push("severity = ?");
      params.push(filters.severity);
    }
    if (filters.startDate) {
      conditions.push("created_at >= ?");
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push("created_at <= ?");
      params.push(filters.endDate);
    }

    const sql = `SELECT COUNT(*) as count FROM audit_logs WHERE ${conditions.join(" AND ")}`;
    const result = await query(sql, params) as any[];
    return result[0]?.count || 0;
  }

  /**
   * Get audit log statistics
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    bySeverity: Record<string, number>;
    byEntityType: Record<string, number>;
    recentActivity: { hour: string; count: number }[];
  }> {
    const dateCondition = startDate && endDate 
      ? "WHERE created_at BETWEEN ? AND ?" 
      : startDate ? "WHERE created_at >= ?" 
      : endDate ? "WHERE created_at <= ?" 
      : "";
    const params = [startDate, endDate].filter(Boolean);

    // Total count
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM audit_logs ${dateCondition}`,
      params
    ) as any[];
    const totalLogs = totalResult[0]?.count || 0;

    // By action
    const actionResult = await query(
      `SELECT action, COUNT(*) as count FROM audit_logs ${dateCondition} GROUP BY action`,
      params
    ) as any[];
    const byAction = Object.fromEntries(actionResult.map((r: any) => [r.action, r.count]));

    // By severity
    const severityResult = await query(
      `SELECT severity, COUNT(*) as count FROM audit_logs ${dateCondition} GROUP BY severity`,
      params
    ) as any[];
    const bySeverity = Object.fromEntries(severityResult.map((r: any) => [r.severity, r.count]));

    // By entity type
    const entityResult = await query(
      `SELECT entity_type, COUNT(*) as count FROM audit_logs ${dateCondition} GROUP BY entity_type`,
      params
    ) as any[];
    const byEntityType = Object.fromEntries(entityResult.map((r: any) => [r.entity_type, r.count]));

    // Recent activity (last 24 hours by hour)
    const activityResult = await query(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as hour,
        COUNT(*) as count 
       FROM audit_logs 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       GROUP BY hour
       ORDER BY hour`,
      []
    ) as any[];
    const recentActivity = activityResult.map((r: any) => ({
      hour: r.hour,
      count: r.count,
    }));

    return { totalLogs, byAction, bySeverity, byEntityType, recentActivity };
  }

  /**
   * Get distinct action types
   */
  async getActionTypes(): Promise<string[]> {
    const result = await query(
      "SELECT DISTINCT action FROM audit_logs ORDER BY action",
      []
    ) as any[];
    return result.map((r: any) => r.action);
  }

  /**
   * Get distinct entity types
   */
  async getEntityTypes(): Promise<string[]> {
    const result = await query(
      "SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type",
      []
    ) as any[];
    return result.map((r: any) => r.entity_type);
  }
}

export const auditLogger = new AuditLogger();
