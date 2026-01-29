import { NextResponse } from "next/server"
import { query, execute } from "@/lib/mysql-direct"
import bcrypt from "bcryptjs"
import { isDevMode } from "@/lib/services/email-service"

// ========================================
// OTP VERIFICATION CONFIGURATION
// ========================================
const MAX_ATTEMPTS = 5 // Max verification attempts before invalidation
const DEV_OTP_CODE = "000000" // Fixed OTP code for DEV mode

/**
 * POST /api/auth/verify-otp
 * 
 * Verifies the OTP code entered by the user
 * 
 * DEV mode (OTP_DEV_MODE=true):
 * - Accepts "000000" as valid OTP without database check
 * - Allows easy testing during development
 * 
 * PROD mode (OTP_DEV_MODE=false):
 * - Verifies against hashed code in database
 * - Enforces expiration and attempt limits
 */
export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    // Validate required fields
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email et code OTP requis" },
        { status: 400 }
      )
    }

    // ========================================
    // DEV MODE: Accept "000000" directly
    // ========================================
    if (isDevMode() && code === DEV_OTP_CODE) {
      console.log("========================================");
      console.log("[DEV MODE] OTP Verification");
      console.log("Email:", email);
      console.log("Code:", code);
      console.log("Status: ACCEPTED (dev mode bypass)");
      console.log("========================================");

      // Get user data for session
      const users = await query(
        `SELECT id, email, name, image, role, status FROM User WHERE email = ? LIMIT 1`,
        [email]
      ) as any[];
      const user = users[0];

      if (!user) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        )
      }

      // Clean up any existing OTPs for this email
      await execute(`DELETE FROM otp_tokens WHERE email = ?`, [email])

      return NextResponse.json({
        success: true,
        verified: true,
        devMode: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
        },
      })
    }

    // ========================================
    // PROD MODE: Verify against database
    // ========================================
    
    // Find the OTP token
    const otpTokens = await query(
      `SELECT * FROM otp_tokens WHERE email = ? AND verified = 0 ORDER BY created_at DESC LIMIT 1`,
      [email]
    ) as any[];
    const otpToken = otpTokens[0];

    if (!otpToken) {
      return NextResponse.json(
        { error: "Aucun code OTP trouvé. Veuillez en demander un nouveau." },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > new Date(otpToken.expires)) {
      await execute(`DELETE FROM otp_tokens WHERE id = ?`, [otpToken.id])
      return NextResponse.json(
        { error: "Code OTP expiré. Veuillez en demander un nouveau." },
        { status: 400 }
      )
    }

    // Check max attempts
    if (otpToken.attempts >= MAX_ATTEMPTS) {
      await execute(`DELETE FROM otp_tokens WHERE id = ?`, [otpToken.id])
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez demander un nouveau code." },
        { status: 400 }
      )
    }

    // Verify OTP (compare with hashed code)
    const isValid = await bcrypt.compare(code, otpToken.code)

    if (!isValid) {
      // Increment attempts
      await execute(
        `UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = ?`,
        [otpToken.id]
      )

      const remainingAttempts = MAX_ATTEMPTS - otpToken.attempts - 1

      return NextResponse.json(
        {
          error: `Code OTP invalide. ${remainingAttempts} tentative(s) restante(s).`,
          remainingAttempts,
        },
        { status: 400 }
      )
    }

    // ========================================
    // OTP VALID: Get user and create session
    // ========================================
    
    // Mark as verified
    await execute(
      `UPDATE otp_tokens SET verified = 1 WHERE id = ?`,
      [otpToken.id]
    )

    // Get user data for session
    const users = await query(
      `SELECT id, email, name, image, role, status FROM User WHERE email = ? LIMIT 1`,
      [email]
    ) as any[];
    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Clean up old OTPs for this email
    await execute(`DELETE FROM otp_tokens WHERE email = ? AND verified = 1`, [email])

    return NextResponse.json({
      success: true,
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        status: user.status,
      },
    })
  } catch (error) {
    console.error("[OTP ERROR] Error verifying OTP:", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification du code OTP" },
      { status: 500 }
    )
  }
}


