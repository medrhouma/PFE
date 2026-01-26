/**
 * Audit Logs API
 * Query audit logs (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { auditLogger } from "@/lib/services/audit-logger";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      
      const filters = {
        userId: searchParams.get("userId") || undefined,
        action: searchParams.get("action") || undefined,
        entityType: searchParams.get("entityType") || undefined,
        entityId: searchParams.get("entityId") || undefined,
        severity: searchParams.get("severity") as any,
        startDate: searchParams.get("startDate")
          ? new Date(searchParams.get("startDate")!)
          : undefined,
        endDate: searchParams.get("endDate")
          ? new Date(searchParams.get("endDate")!)
          : undefined,
        limit: searchParams.get("limit")
          ? parseInt(searchParams.get("limit")!)
          : 100,
        offset: searchParams.get("offset")
          ? parseInt(searchParams.get("offset")!)
          : 0,
      };
      
      const logs = await auditLogger.query(filters);
      
      return NextResponse.json(logs);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN"] }
);

export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { action, entityType, entityId, changes, metadata, severity } = await req.json();
      
      if (!action || !entityType) {
        return NextResponse.json(
          { error: "Action and entity type are required" },
          { status: 400 }
        );
      }
      
      await auditLogger.log({
        userId: user.id,
        action,
        entityType,
        entityId,
        changes,
        metadata,
        severity: severity || "INFO",
      });
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Error creating audit log:", error);
      return NextResponse.json(
        { error: "Failed to create audit log" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN"] }
);
