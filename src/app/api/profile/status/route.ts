/**
 * Profile Status API
 * Returns current user's profile completion and validation status
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac";
import { query } from "@/lib/mysql-direct";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // Get user with employee data
    const users = await query(
      `SELECT u.id, u.status, e.id as employeeId, e.status as employeeStatus, e.rejectionReason
       FROM User u
       LEFT JOIN Employe e ON u.id = e.userId
       WHERE u.id = ? LIMIT 1`,
      [user.id]
    ) as any[];
    const userData = users[0];
    
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const hasEmployeeProfile = !!userData.employeeId;
    const employeeStatus = userData.employeeStatus || null;
    
    return NextResponse.json({
      userId: userData.id,
      userStatus: userData.status,
      hasEmployeeProfile,
      employeeStatus,
      requiresProfileCompletion: userData.status === "INACTIVE" && !hasEmployeeProfile,
      isPending: userData.status === "PENDING" || employeeStatus === "EN_ATTENTE",
      isActive: userData.status === "ACTIVE" && employeeStatus === "APPROUVE",
      isRejected: employeeStatus === "REJETE",
      rejectionReason: userData.rejectionReason || null,
    });
  } catch (error: any) {
    console.error("Error fetching profile status:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile status" },
      { status: 500 }
    );
  }
});
