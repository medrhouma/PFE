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

    let body;
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        { error: "Corps de requête invalide" },
        { status: 400 }
      )
    }
    
    const { name, email, password } = body
    
    console.log("📝 Register attempt:", { name: name?.substring(0, 20), email, hasPassword: !!password })

    // Validate required fields
    if (!name || !email || !password) {
      console.log("❌ Missing fields:", { name: !name, email: !email, password: !password })
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      )
    }

    // Validate name
    if (name.trim().length < 2) {
      console.log("❌ Name too short:", name.trim().length)
      return NextResponse.json(
        { error: "Le nom doit contenir au moins 2 caractères" },
        { status: 400 }
      )
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      console.log("❌ Invalid email format:", email)
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      console.log("❌ Password validation failed:", passwordValidation.message)
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
      console.log("❌ Email already exists:", email)
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      )
    }
    
    console.log("✅ All validations passed, creating user...")

    const hashedPassword = await bcrypt.hash(password, 12)
    const id = uuid()

    // Insert user - use 'role' column (not roleEnum, which is Prisma field name)
    await pool.execute(
      `INSERT INTO User (id, name, email, password, role, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
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