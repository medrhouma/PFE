import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
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
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, name: true, status: true },
    })

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
    const recentOTPs = await prisma.otp_tokens.count({
      where: {
        email,
        created_at: { gte: rateWindow },
      },
    })

    if (recentOTPs >= OTP_RATE_LIMIT) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      )
    }

    // ========================================
    // STEP 3: Generate OTP (DEV vs PROD)
    // ========================================
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
    await prisma.otp_tokens.deleteMany({ where: { email } })

    // Store new OTP
    await prisma.otp_tokens.create({
      data: {
        id: uuidv4(),
        email,
        code: hashedOTP,
        expires: expiresAt,
        verified: false,
        attempts: 0,
      },
    })

    // ========================================
    // STEP 5: Send OTP email (PROD only)
    // ========================================
    try {
      await emailService.sendOTPEmail(email, otp, user.name || "Utilisateur");
    } catch (emailErr) {
      console.error("[OTP ERROR] Failed to send OTP email:", emailErr);
      // Don't fail the request - in dev mode, use 000000
    }

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


