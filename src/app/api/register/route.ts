import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"
import bcrypt from "bcryptjs"
import { v4 as uuid } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request. json()

    if (!name || !email || !password) {
      return NextResponse. json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      )
    }

    const [existingUsers] = await pool. execute(
      `SELECT id FROM User WHERE email = ?`,
      [email]
    )

    if ((existingUsers as any[]).length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status:  400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = uuid()

    await pool.execute(
      `INSERT INTO User (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, email, hashedPassword, "USER", "INACTIVE"]
    )

    return NextResponse.json({
      success: true,
      message:  "Utilisateur créé avec succès",
    })

  } catch (error: any) {
    return NextResponse. json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}