/**
 * Pointage Anomalies API
 * Get all pointage anomalies (RH/Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { pointageService } from "@/lib/services/pointage-service";

export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status") || undefined;
      const severity = searchParams.get("severity") || undefined;
      
      const anomalies = await pointageService.getAnomalies(status, severity);
      
      return NextResponse.json(anomalies);
    } catch (error: any) {
      console.error("Error fetching anomalies:", error);
      return NextResponse.json(
        { error: "Failed to fetch anomalies" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);

export const PATCH = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { anomalyId, status, resolution } = await req.json();
      
      if (!anomalyId || !status || !resolution) {
        return NextResponse.json(
          { error: "Anomaly ID, status, and resolution are required" },
          { status: 400 }
        );
      }
      
      const updatedAnomaly = await pointageService.resolveAnomaly(
        anomalyId,
        user.id,
        status,
        resolution
      );
      
      return NextResponse.json({
        success: true,
        anomaly: updatedAnomaly,
      });
    } catch (error: any) {
      console.error("Error resolving anomaly:", error);
      return NextResponse.json(
        { error: "Failed to resolve anomaly" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
