/**
 * User Pointage History API
 * Get current user's pointage records
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { pointageService } from "@/lib/services/pointage-service";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    const pointages = await pointageService.getUserPointages(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    return NextResponse.json(pointages);
  } catch (error: any) {
    console.error("Error fetching pointages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pointages" },
      { status: 500 }
    );
  }
});
