import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier s'il y a un check-in aujourd'hui
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    let checkInTime: string | null = null;
    let checkOutTime: string | null = null;
    let hasCheckedIn = false;
    let hasCheckedOut = false;

    try {
      // Query check-in using raw SQL
      const checkInResult: any[] = await query(
        `SELECT id, timestamp FROM pointages 
         WHERE user_id = ? AND type = 'IN' 
         AND timestamp >= ? AND timestamp <= ?
         ORDER BY timestamp DESC LIMIT 1`,
        [session.user.id, startOfDay.toISOString(), endOfDay.toISOString()]
      );

      const checkOutResult: any[] = await query(
        `SELECT id, timestamp FROM pointages 
         WHERE user_id = ? AND type = 'OUT' 
         AND timestamp >= ? AND timestamp <= ?
         ORDER BY timestamp DESC LIMIT 1`,
        [session.user.id, startOfDay.toISOString(), endOfDay.toISOString()]
      );

      hasCheckedIn = checkInResult && checkInResult.length > 0;
      hasCheckedOut = checkOutResult && checkOutResult.length > 0;

      if (hasCheckedIn && checkInResult[0]?.timestamp) {
        const time = new Date(checkInResult[0].timestamp);
        checkInTime = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }

      if (hasCheckedOut && checkOutResult[0]?.timestamp) {
        const time = new Date(checkOutResult[0].timestamp);
        checkOutTime = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (dbError) {
      console.error("Error querying pointage:", dbError);
      // Return default status on error - table might not exist yet
    }

    return NextResponse.json({
      hasCheckedIn,
      hasCheckedOut,
      checkInTime,
      checkOutTime,
      duration: null
    });
  } catch (error: any) {
    console.error("Error checking today status:", error);
    return NextResponse.json({
      hasCheckedIn: false,
      hasCheckedOut: false,
      checkInTime: null,
      checkOutTime: null
    });
  }
}
