import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * GET /api/users/check-email?email=test@example.com
 * Check if an email already exists in the database
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    // Check if email exists
    const [rows] = await pool.execute(
      `SELECT id FROM User WHERE email = ? LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    const exists = (rows as any[]).length > 0;

    return NextResponse.json({
      exists,
      email: email.toLowerCase().trim(),
    });
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification de l'email" },
      { status: 500 }
    );
  }
}
