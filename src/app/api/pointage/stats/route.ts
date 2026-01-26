/**
 * Pointage Stats API
 * Get user's pointage statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { pointageService } from "@/lib/services/pointage-service";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    
    const stats = await pointageService.getUserStats(
      user.id,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined
    );
    
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
});
