import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

// Debug endpoint to check database state
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Count notifications for RH user
    const rhNotifications: any = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = '2a2194b2-2781-4a2b-bfe4-326804b75b17'`
    );

    // Get all notifications for RH user
    const allNotifications: any = await query(
      `SELECT * FROM notifications WHERE user_id = '2a2194b2-2781-4a2b-bfe4-326804b75b17' ORDER BY created_at DESC`
    );

    // Count all leave requests
    const leaveRequests: any = await query(
      `SELECT COUNT(*) as count FROM demande_conge`
    );

    // Get pending leave requests
    const pendingLeaves: any = await query(
      `SELECT dc.*, u.name as userName FROM demande_conge dc 
       JOIN User u ON dc.userId = u.id 
       WHERE dc.status = 'EN_ATTENTE'`
    );

    // Check RH user details
    const rhUser: any = await query(
      `SELECT id, name, email, role, status FROM User WHERE id = '2a2194b2-2781-4a2b-bfe4-326804b75b17'`
    );

    return NextResponse.json({
      rhUser: rhUser[0] || null,
      rhNotificationCount: rhNotifications[0]?.count || 0,
      rhNotifications: allNotifications || [],
      totalLeaveRequests: leaveRequests[0]?.count || 0,
      pendingLeaves: pendingLeaves || []
    });
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
