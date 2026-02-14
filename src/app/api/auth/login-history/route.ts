export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loginHistoryService } from "@/lib/services/login-history-service";

/**
 * GET /api/auth/login-history
 * Get current user's login history
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    // Get user's login history
    const loginHistory = await loginHistoryService.getUserLoginHistory(
      session.user.id,
      limit,
      (page - 1) * limit
    );

    // Get suspicious logins (for highlighting)
    const suspiciousLogins = await loginHistoryService.getSuspiciousLogins(
      session.user.id,
      10
    );

    // Get failed login attempts
    const failedLogins = await loginHistoryService.getFailedAttempts(
      session.user.id,
      10
    );

    // Map snake_case DB columns to camelCase for frontend
    const mapEntry = (row: any) => ({
      id: row.id,
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent || "",
      deviceFingerprint: row.device_fingerprint,
      isSuspicious: !!row.is_suspicious,
      loginMethod: row.login_method,
      success: !!row.success,
      failureReason: row.failure_reason,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        loginHistory: (loginHistory || []).map(mapEntry),
        suspiciousLogins: (suspiciousLogins || []).map(mapEntry),
        failedLogins: (failedLogins || []).map(mapEntry),
        pagination: {
          page,
          limit,
          hasMore: loginHistory.length === limit,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching login history:", error);
    
    // Handle missing table gracefully
    if (error.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({
        success: true,
        data: {
          loginHistory: [],
          suspiciousLogins: [],
          failedLogins: [],
          pagination: { page: 1, limit: 20, hasMore: false },
        },
        message: "La table login_history n'existe pas encore. Exécutez les migrations via POST /api/debug/migrate"
      });
    }
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique de connexion" },
      { status: 500 }
    );
  }
}
