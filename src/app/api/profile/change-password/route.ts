import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import bcrypt from "bcryptjs";

/**
 * Change Password API Endpoint
 * POST /api/profile/change-password
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
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

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" },
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
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await query(
      "UPDATE User SET password = ?, updatedAt = NOW() WHERE id = ?",
      [hashedPassword, session.user.id]
    );

    // Log the password change event
    try {
      await query(
        `INSERT INTO Log (id, action, details, userId, createdAt) 
         VALUES (UUID(), 'PASSWORD_CHANGED', ?, ?, NOW())`,
        [
          JSON.stringify({
            userId: session.user.id,
            timestamp: new Date().toISOString(),
            ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
          }),
          session.user.id
        ]
      );
    } catch (logError) {
      console.error("Error logging password change:", logError);
      // Don't fail the request if logging fails
    }

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
