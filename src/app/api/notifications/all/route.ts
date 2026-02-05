import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/mysql-direct";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Only RH and SUPER_ADMIN can see all notifications
    if (session.user.role !== "RH" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Get all notifications with user information
    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const [notifications] = await pool.query(
      `SELECT 
        n.*,
        u.name as userName,
        u.email as userEmail
      FROM notifications n
      LEFT JOIN User u ON n.user_id = u.id
      ORDER BY 
        CASE 
          WHEN n.priority = 'URGENT' THEN 1
          WHEN n.priority = 'HIGH' THEN 2
          WHEN n.priority = 'NORMAL' THEN 3
          ELSE 4
        END,
        n.created_at DESC
      LIMIT 500`
    );

    const [unreadCountRows] = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`
    );

    const unreadCount = (unreadCountRows as any[])[0]?.count || 0;

    return NextResponse.json({
      success: true,
      notifications,
      count: (notifications as any[]).length,
      unreadCount
    });
  } catch (error: any) {
    console.error("Error fetching all notifications:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notifications", details: error.message },
      { status: 500 }
    );
  }
}
