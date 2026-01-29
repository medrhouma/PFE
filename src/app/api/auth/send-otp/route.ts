import { NextResponse } from "next/server"
import { query, execute } from "@/lib/mysql-direct"
import bcrypt from "bcryptjs"
import { emailService, generateSecureOTP, isDevMode } from "@/lib/services/email-service"

// ========================================
// OTP CONFIGURATION
// ========================================
const OTP_RATE_LIMIT = 3 // Max OTP requests per email
const OTP_RATE_WINDOW = 10 * 60 * 1000 // 10 minutes window
const OTP_EXPIRY = 5 * 60 * 1000 // 5 minutes expiration

/**
 * POST /api/auth/send-otp
 * 
 * Sends OTP verification code to user's email
 * 
 * DEV mode (OTP_DEV_MODE=true):
 * - Always uses "000000" as OTP code
 * - Logs code to console
 * - Still stores in database for verification flow
 * 
 * PROD mode (OTP_DEV_MODE=false):
 * - Generates secure 6-digit random code
 * - Sends email via SMTP
 * - Enforces rate limiting and expiration
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // ========================================
    // STEP 1: Verify user credentials
    // ========================================
    const users = await query(
      `SELECT id, email, password, name, status FROM User WHERE email = ? LIMIT 1`,
      [email]
    ) as any[];
    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      )
    }

    // Check if user uses Google OAuth (no password)
    if (!user.password) {
      return NextResponse.json(
        { error: "Utilisez la connexion Google pour ce compte" },
        { status: 400 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      )
    }

    // ========================================
    // STEP 2: Check rate limiting
    // ========================================
    const rateWindow = new Date(Date.now() - OTP_RATE_WINDOW);
    const recentOTPsResult = await query(
      `SELECT COUNT(*) as count FROM otp_tokens WHERE email = ? AND created_at >= ?`,
      [email, rateWindow]
    ) as any[];
    const recentOTPs = recentOTPsResult[0]?.count || 0;

    if (recentOTPs >= OTP_RATE_LIMIT) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      )
    }

    // ========================================
    // STEP 3: Generate OTP (DEV vs PROD)
    // ========================================
    // generateSecureOTP() returns "000000" in DEV mode
    // and a random 6-digit code in PROD mode
    const otp = generateSecureOTP()
    const hashedOTP = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY);

    // Log for DEV mode debugging
    if (isDevMode()) {
      console.log("========================================");
      console.log("[DEV MODE] OTP System");
      console.log("Email:", email);
      console.log("OTP Code: 000000");
      console.log("Expires:", expiresAt.toISOString());
      console.log("========================================");
    }

    // ========================================
    // STEP 4: Store OTP in database
    // ========================================
    // Delete any existing OTPs for this email
    await execute(`DELETE FROM otp_tokens WHERE email = ?`, [email])

    // Store new OTP
    await execute(
      `INSERT INTO otp_tokens (id, email, code, expires, verified, attempts, created_at)
       VALUES (UUID(), ?, ?, ?, 0, 0, NOW())`,
      [email, hashedOTP, expiresAt]
    )

    // ========================================
    // STEP 5: Send OTP email (PROD only)
    // ========================================
    // In DEV mode, sendOTPEmail logs to console and skips actual email
    await emailService.sendOTPEmail(email, otp, user.name || "Utilisateur")

    return NextResponse.json({
      success: true,
      message: isDevMode() 
        ? "Code OTP: 000000 (mode développement)" 
        : "Code OTP envoyé à votre email",
      expiresIn: OTP_EXPIRY / 1000, // seconds
      devMode: isDevMode(),
    })
  } catch (error) {
    console.error("[OTP ERROR] Error sending OTP:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du code OTP" },
      { status: 500 }
    )
  }
}


