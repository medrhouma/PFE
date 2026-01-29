import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import bcrypt from "bcryptjs";
import { auditLogger, AUDIT_ACTIONS } from "@/lib/services/audit-logger";
import { checkRateLimit, getClientIP } from "@/lib/security-middleware";

// Password validation helper
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Le mot de passe doit contenir au moins une majuscule" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Le mot de passe doit contenir au moins un chiffre" };
  }
  return { valid: true };
}

/**
 * Change Password API Endpoint
 * POST /api/profile/change-password
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Rate limiting - max 5 password change attempts per hour
    const { allowed } = checkRateLimit(`password-change:${session.user.id}`, "sensitive");
    if (!allowed) {
      await auditLogger.log({
        userId: session.user.id,
        action: "PASSWORD_CHANGE_RATE_LIMITED",
        entityType: "User",
        ipAddress: ip,
        userAgent,
        severity: "WARNING"
      });
      
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer plus tard." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mot de passe actuel et nouveau requis" },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Ensure new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit être différent de l'ancien" },
        { status: 400 }
      );
    }

    // Get current user with password hash
    const users: any[] = await query(
      "SELECT id, password FROM User WHERE id = ? LIMIT 1",
      [session.user.id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const user = users[0];

    // Verify current password
    if (!user.password) {
      return NextResponse.json(
        { error: "Ce compte utilise une connexion sociale (Google). Le mot de passe ne peut pas être modifié." },
        { status: 400 }
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      await auditLogger.log({
        userId: session.user.id,
        action: "PASSWORD_CHANGE_FAILED",
        entityType: "User",
        ipAddress: ip,
        userAgent,
        severity: "WARNING",
        metadata: JSON.stringify({ reason: "Invalid current password" })
      });
      
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await query(
      "UPDATE User SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashedPassword, session.user.id]
    );

    // Log the password change event
    await auditLogger.log({
      userId: session.user.id,
      userRole: session.user.role,
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      entityType: "User",
      entityId: session.user.id,
      ipAddress: ip,
      userAgent,
      severity: "INFO",
    });

    return NextResponse.json({
      success: true,
      message: "Mot de passe modifié avec succès"
    });

  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du mot de passe" },
      { status: 500 }
    );
  }
}
