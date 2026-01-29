import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"
import bcrypt from "bcryptjs"
import { v4 as uuid } from "uuid"
import { checkRateLimit, getClientIP } from "@/lib/security-middleware"
import { auditLogger } from "@/lib/services/audit-logger"

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password validation - min 8 chars, 1 uppercase, 1 number
const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Le mot de passe doit contenir au moins une majuscule" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Le mot de passe doit contenir au moins un chiffre" }
  }
  return { valid: true }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || undefined
  
  try {
    // Rate limiting - max 5 registrations per IP per hour
    const { allowed, remaining } = checkRateLimit(`register:${ip}`, "sensitive")
    if (!allowed) {
      await auditLogger.log({
        action: "REGISTER_RATE_LIMITED",
        entityType: "User",
        ipAddress: ip,
        userAgent,
        severity: "WARNING",
        metadata: JSON.stringify({ ip })
      })
      return NextResponse.json(
        { error: "Trop de tentatives d'inscription. Veuillez réessayer plus tard." },
        { status: 429 }
      )
    }

    const { name, email, password } = await request.json()

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      )
    }

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Le nom doit contenir au moins 2 caractères" },
        { status: 400 }
      )
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      `SELECT id FROM User WHERE email = ?`,
      [email.toLowerCase().trim()]
    )

    if ((existingUsers as any[]).length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const id = uuid()

    await pool.execute(
      `INSERT INTO User (id, name, email, password, role, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name.trim(), email.toLowerCase().trim(), hashedPassword, "USER", "INACTIVE"]
    )

    // Log successful registration
    await auditLogger.log({
      userId: id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: id,
      ipAddress: ip,
      userAgent,
      severity: "INFO",
      metadata: JSON.stringify({ email: email.toLowerCase().trim() })
    })

    return NextResponse.json({
      success: true,
      message: "Compte créé avec succès. Veuillez compléter votre profil.",
    })

  } catch (error: any) {
    console.error("Registration error:", error)
    
    await auditLogger.log({
      action: "REGISTER_FAILED",
      entityType: "User",
      ipAddress: ip,
      userAgent,
      severity: "ERROR",
      metadata: JSON.stringify({ error: error.message })
    })
    
    return NextResponse.json(
      { error: "Erreur lors de l'inscription. Veuillez réessayer." },
      { status: 500 }
    )
  }
}