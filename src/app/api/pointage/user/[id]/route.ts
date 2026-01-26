/**
 * User Pointage by ID API
 * Get specific user's pointage records (RH/Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { pointageService } from "@/lib/services/pointage-service";

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
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      
      const pointages = await pointageService.getUserPointages(
        userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      
      return NextResponse.json(pointages);
    } catch (error: any) {
      console.error("Error fetching user pointages:", error);
      return NextResponse.json(
        { error: "Failed to fetch user pointages" },
        { status: 500 }
      );
    }
  },
  { roles: ["SUPER_ADMIN", "RH"] }
);
