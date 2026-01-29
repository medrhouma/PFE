import { NextResponse } from "next/server"
import { query, execute } from "@/lib/mysql-direct"
import crypto from "crypto"
import { emailService, isDevMode } from "@/lib/services/email-service"

// ========================================
// PASSWORD RESET CONFIGURATION
// ========================================
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT = 3 // Max requests per hour per email
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour window

/**
 * Generate a secure random token for password reset
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * POST /api/auth/forgot-password
 * 
 * Sends a password reset email to the user
 * 
 * Request body:
 * - email: User's email address
 * 
 * Response:
 * - success: true (always, for security - don't reveal if email exists)
 * - message: Generic success message
 * 
 * DEV mode: Logs reset link to console
 * PROD mode: Sends email via SMTP
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ========================================
    // STEP 1: Check if user exists
    // ========================================
    const users = await query(
      `SELECT id, email, name, password FROM User WHERE email = ? LIMIT 1`,
      [normalizedEmail]
    ) as any[];
    const user = users[0];

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      console.log("[FORGOT PASSWORD] User not found:", normalizedEmail)
      return NextResponse.json({
        success: true,
        message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
      })
    }

    // Check if user uses OAuth (no password set)
    if (!user.password) {
      console.log("[FORGOT PASSWORD] OAuth user:", normalizedEmail)
      // Still return success for security
      return NextResponse.json({
        success: true,
        message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
      })
    }

    // ========================================
    // STEP 2: Check rate limiting
    // ========================================
    const rateWindow = new Date(Date.now() - RATE_WINDOW);
    
    // First check if table exists, if not create it
    try {
      await execute(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires DATETIME NOT NULL,
          used TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_token (token),
          INDEX idx_expires (expires)
        )
      `, []);
    } catch (e) {
      // Table might already exist, ignore error
    }

    const recentRequestsResult = await query(
      `SELECT COUNT(*) as count FROM password_reset_tokens WHERE email = ? AND created_at >= ?`,
      [normalizedEmail, rateWindow]
    ) as any[];
    const recentRequests = recentRequestsResult[0]?.count || 0;

    if (recentRequests >= RATE_LIMIT) {
      console.log("[FORGOT PASSWORD] Rate limit exceeded:", normalizedEmail)
      return NextResponse.json(
        { error: "Trop de demandes. Veuillez réessayer plus tard." },
        { status: 429 }
      )
    }

    // ========================================
    // STEP 3: Generate reset token
    // ========================================
    const resetToken = generateResetToken()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY)

    // Delete any existing tokens for this email
    await execute(
      `DELETE FROM password_reset_tokens WHERE email = ?`,
      [normalizedEmail]
    )

    // Store new token
    await execute(
      `INSERT INTO password_reset_tokens (id, email, token, expires, used, created_at)
       VALUES (UUID(), ?, ?, ?, 0, NOW())`,
      [normalizedEmail, resetToken, expiresAt]
    )

    // ========================================
    // STEP 4: Send reset email
    // ========================================
    if (isDevMode()) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      console.log("========================================")
      console.log("[DEV MODE] Password Reset Request")
      console.log("Email:", normalizedEmail)
      console.log("Token:", resetToken)
      console.log("Reset Link:", `${baseUrl}/reset-password?token=${resetToken}`)
      console.log("Expires:", expiresAt.toISOString())
      console.log("========================================")
    }

    await emailService.sendPasswordResetEmail(
      normalizedEmail,
      resetToken,
      user.name || "Utilisateur"
    )

    return NextResponse.json({
      success: true,
      message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
      // Include token in DEV mode for testing
      ...(isDevMode() && { devToken: resetToken }),
    })
  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    )
  }
}
