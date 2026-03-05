import { NextResponse } from "next/server"
import { query } from "@/lib/mysql-direct"

/**
 * POST /api/auth/check-2fa
 * 
 * Check if a user has 2FA enabled (pre-login check).
 * Only returns whether 2FA is required, no sensitive data.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      )
    }

    // Find the user and their 2FA preference
    const results: any[] = await query(
      `SELECT u.id, up.twoFactorEnabled 
       FROM User u 
       LEFT JOIN UserPreferences up ON up.userId = u.id 
       WHERE u.email = ?`,
      [email]
    )

    if (results.length === 0) {
      // Don't reveal if user exists - return default (true) for security
      return NextResponse.json({ twoFactorEnabled: true })
    }

    // Default to true if no preference set
    const twoFactorEnabled = results[0].twoFactorEnabled ?? true

    return NextResponse.json({ twoFactorEnabled })

  } catch (error) {
    console.error("[2FA CHECK] Error:", error)
    // Default to requiring 2FA on errors
    return NextResponse.json({ twoFactorEnabled: true })
  }
}
