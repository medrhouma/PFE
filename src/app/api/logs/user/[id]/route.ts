/**
 * User-specific Audit Logs API
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { auditLogger } from "@/lib/services/audit-logger";

export const GET = withAuth(
  async (req: NextRequest, user, context?: any) => {
    try {
      const { params } = context || {};
      const userId = params?.id;
      
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }
      
      const { searchParams } = new URL(req.url);
      const limit = searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 50;
      
      const logs = await auditLogger.query({
        userId,
        limit,
      });
      
      return NextResponse.json(logs);
    } catch (error: any) {
      console.error("Error fetching user logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch user logs" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
