/**
 * Profile Status API
 * Returns current user's profile completion and validation status
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // Get user with employee data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        employee: true,
      },
    });
    
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const hasEmployeeProfile = !!userData.employee;
    const employeeStatus = userData.employee?.status || null;
    
    return NextResponse.json({
      userId: userData.id,
      userStatus: userData.status,
      hasEmployeeProfile,
      employeeStatus,
      requiresProfileCompletion: userData.status === "INACTIVE" && !hasEmployeeProfile,
      isPending: userData.status === "PENDING" || employeeStatus === "EN_ATTENTE",
      isActive: userData.status === "ACTIVE" && employeeStatus === "APPROUVE",
      isRejected: employeeStatus === "REJETE",
      rejectionReason: userData.employee?.rejectionReason || null,
    });
  } catch (error: any) {
    console.error("Error fetching profile status:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile status" },
      { status: 500 }
    );
  }
});
