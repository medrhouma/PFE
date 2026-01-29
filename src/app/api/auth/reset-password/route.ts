import { NextResponse } from "next/server"
import { query, execute } from "@/lib/mysql-direct"
import bcrypt from "bcryptjs"

// ========================================
// PASSWORD VALIDATION
// ========================================
const MIN_PASSWORD_LENGTH = 8

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
    }
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Le mot de passe doit contenir au moins une majuscule",
    }
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Le mot de passe doit contenir au moins une minuscule",
    }
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Le mot de passe doit contenir au moins un chiffre",
    }
  }

  return { valid: true }
}

/**
 * POST /api/auth/reset-password
 * 
 * Resets the user's password using a valid reset token
 * 
 * Request body:
 * - token: The reset token from the email
 * - password: The new password
 * - confirmPassword: Password confirmation
 */
export async function POST(request: Request) {
  try {
    const { token, password, confirmPassword } = await request.json()

    // ========================================
    // STEP 1: Validate input
    // ========================================
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token de réinitialisation requis" },
        { status: 400 }
      )
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: "Mot de passe requis" },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas" },
        { status: 400 }
      )
    }

    // Validate password strength
    const validation = validatePassword(password)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // ========================================
    // STEP 2: Find and validate token
    // ========================================
    const tokens = await query(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 LIMIT 1`,
      [token]
    ) as any[];
    const resetToken = tokens[0];

    if (!resetToken) {
      return NextResponse.json(
        { error: "Lien de réinitialisation invalide ou déjà utilisé" },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (new Date() > new Date(resetToken.expires)) {
      await execute(`DELETE FROM password_reset_tokens WHERE id = ?`, [resetToken.id])
      return NextResponse.json(
        { error: "Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau." },
        { status: 400 }
      )
    }

    // ========================================
    // STEP 3: Find user
    // ========================================
    const users = await query(
      `SELECT id, email FROM User WHERE email = ? LIMIT 1`,
      [resetToken.email]
    ) as any[];
    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // ========================================
    // STEP 4: Update password
    // ========================================
    const hashedPassword = await bcrypt.hash(password, 12)

    await execute(
      `UPDATE User SET password = ?, updated_at = NOW() WHERE id = ?`,
      [hashedPassword, user.id]
    )

    // Mark token as used
    await execute(
      `UPDATE password_reset_tokens SET used = 1 WHERE id = ?`,
      [resetToken.id]
    )

    // Clean up all reset tokens for this user
    await execute(
      `DELETE FROM password_reset_tokens WHERE email = ?`,
      [resetToken.email]
    )

    console.log("[RESET PASSWORD] Password reset successful for:", resetToken.email)

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a été réinitialisé avec succès",
    })
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]:", error)
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * 
 * Validates if a reset token is still valid
 * Used by the reset-password page to check before showing the form
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token manquant" },
        { status: 400 }
      )
    }

    const tokens = await query(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 LIMIT 1`,
      [token]
    ) as any[];
    const resetToken = tokens[0];

    if (!resetToken) {
      return NextResponse.json({
        valid: false,
        error: "Lien invalide ou déjà utilisé",
      })
    }

    if (new Date() > new Date(resetToken.expires)) {
      return NextResponse.json({
        valid: false,
        error: "Ce lien a expiré",
      })
    }

    return NextResponse.json({
      valid: true,
      email: resetToken.email,
    })
  } catch (error) {
    console.error("[VALIDATE TOKEN ERROR]:", error)
    return NextResponse.json(
      { valid: false, error: "Erreur de validation" },
      { status: 500 }
    )
  }
}
