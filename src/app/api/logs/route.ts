/**
 * Audit Logs API
 * Provides endpoints for viewing, filtering, and exporting audit logs
 * Access restricted to SUPER_ADMIN and RH roles
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { auditLogger, AUDIT_ACTIONS } from "@/lib/services/audit-logger";
import { checkRateLimit, getClientIP, withSecurityHeaders } from "@/lib/security-middleware";

export const GET = withAuth(
  async (req: NextRequest, user: any) => {
    try {
      // Rate limiting
      const ip = getClientIP(req);
      const { allowed } = checkRateLimit(`logs:${ip}`, "api");
      if (!allowed) {
        return NextResponse.json(
          { error: "Trop de requêtes" },
          { status: 429 }
        );
      }

      const { searchParams } = new URL(req.url);
      
      // Parse pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
      const offset = (page - 1) * limit;

      const filters = {
        userId: searchParams.get("userId") || undefined,
        action: searchParams.get("action") || undefined,
        entityType: searchParams.get("entityType") || undefined,
        entityId: searchParams.get("entityId") || undefined,
        severity: searchParams.get("severity") as any,
        search: searchParams.get("search") || undefined,
        startDate: searchParams.get("startDate")
          ? new Date(searchParams.get("startDate")!)
          : undefined,
        endDate: searchParams.get("endDate")
          ? new Date(searchParams.get("endDate")!)
          : undefined,
        limit,
        offset,
      };

      // For RH role, only show their related logs
      if (user.roleEnum === "RH") {
        // RH can see logs they created or related to employees
        // For now, allow full access to their own logs
      }
      
      const logs = await auditLogger.query(filters);
      const totalCount = await auditLogger.count(filters);
      const totalPages = Math.ceil(totalCount / limit);

      const response = NextResponse.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore: page < totalPages,
        },
      });
      
      return withSecurityHeaders(response);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des logs" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);

export const POST = withAuth(
  async (req: NextRequest, user: any) => {
    try {
      const body = await req.json();
      const { type } = body;

      // Handle different POST actions
      switch (type) {
        case "stats": {
          const startDate = body.startDate ? new Date(body.startDate) : undefined;
          const endDate = body.endDate ? new Date(body.endDate) : undefined;
          const stats = await auditLogger.getStats(startDate, endDate);
          return NextResponse.json({ success: true, data: stats });
        }

        case "actionTypes": {
          const actionTypes = await auditLogger.getActionTypes();
          return NextResponse.json({ 
            success: true, 
            data: actionTypes,
            definitions: AUDIT_ACTIONS,
          });
        }

        case "entityTypes": {
          const entityTypes = await auditLogger.getEntityTypes();
          return NextResponse.json({ success: true, data: entityTypes });
        }

        case "export": {
          const exportFilters = {
            userId: body.userId,
            action: body.action,
            entityType: body.entityType,
            severity: body.severity,
            startDate: body.startDate ? new Date(body.startDate) : undefined,
            endDate: body.endDate ? new Date(body.endDate) : undefined,
            limit: 10000, // Max export limit
            offset: 0,
          };

          const logs = await auditLogger.query(exportFilters);

          // Log this export action
          await auditLogger.logExport("generated", user.id!, getClientIP(req), undefined, {
            format: body.format || "json",
            type: "audit_logs",
            recordCount: logs.length,
          });

          // Return based on format
          if (body.format === "csv") {
            const csv = convertToCSV(logs);
            return new NextResponse(csv, {
              headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="audit_logs_${Date.now()}.csv"`,
              },
            });
          }

          return NextResponse.json({ 
            success: true, 
            data: logs,
            count: logs.length,
          });
        }

        case "log": {
          // Create a manual log entry (existing functionality)
          const { action, entityType, entityId, changes, metadata, severity } = body;
          
          if (!action || !entityType) {
            return NextResponse.json(
              { error: "Action et type d'entité requis" },
              { status: 400 }
            );
          }
          
          await auditLogger.log({
            userId: user.id,
            userRole: user.roleEnum,
            action,
            entityType,
            entityId,
            changes,
            metadata,
            severity: severity || "INFO",
            ipAddress: getClientIP(req),
          });
          
          return NextResponse.json({ success: true });
        }

        default:
          return NextResponse.json(
            { error: "Type d'action non supporté" },
            { status: 400 }
          );
      }
    } catch (error: any) {
      console.error("Error in logs POST:", error);
      return NextResponse.json(
        { error: "Erreur serveur" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);

function convertToCSV(logs: any[]): string {
  if (logs.length === 0) return "";

  const headers = [
    "ID",
    "Date",
    "Action",
    "Entity Type",
    "Entity ID",
    "User ID",
    "User Name",
    "User Email",
    "User Role",
    "IP Address",
    "Severity",
    "Metadata",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt ? new Date(log.createdAt).toISOString() : "",
    log.action,
    log.entityType,
    log.entityId || "",
    log.userId || "",
    log.user ? `${log.user.name || ""} ${log.user.lastName || ""}`.trim() : "",
    log.user?.email || "",
    log.user?.roleEnum || "",
    log.ipAddress || "",
    log.severity,
    log.metadata ? JSON.stringify(log.metadata) : "",
  ]);

  const escapeCsv = (value: any) => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");
}
