import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { pool } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Only SUPER_ADMIN can access users
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    console.log("Fetching users for SUPER_ADMIN:", session.user.email)

    // Query from User table - only select existing columns
    const [rows] = await pool.execute(
      `SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.password,
        u.role, 
        u.image,
        GROUP_CONCAT(DISTINCT a.provider) as providers
       FROM User u
       LEFT JOIN Account a ON u.id = a.userId
       GROUP BY u.id
       ORDER BY u.id DESC`
    )

    console.log("Found users:", (rows as any[]).length)

    // Format providers into array and split name
    const formattedUsers = (rows as any[]).map(user => {
      // Split name into first and last name if it contains a space
      const fullName = user.name || ''
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      return {
        id: user.id,
        name: firstName,
        last_name: lastName,
        email: user.email,
        role: user.role,
        image: user.image,
        password: user.password,
        providers: user.providers ? user.providers.split(',').map((p: string) => 
          p === 'google' ? 'Google' : 'Credentials'
        ) : (user.password ? ['Credentials'] : ['Google'])
      }
    })

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    )
  }
}
