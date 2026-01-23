import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { pool } from "@/lib/db"
import { query } from "@/lib/mysql-direct"

async function hasPermission(email: string, module: string, action: string): Promise<boolean> {
  try {
    // Get user's role
    const users = await query('SELECT role FROM User WHERE email = ?', [email]) as any[]
    if (!users || users.length === 0) return false

    const userRole = users[0].role
    
    // SUPER_ADMIN has all permissions
    if (userRole === 'SUPER_ADMIN') return true

    // Get Role ID
    const roles = await query('SELECT id FROM Role WHERE name = ?', [userRole]) as any[]
    if (!roles || roles.length === 0) return false

    // Check if user has the permission
    const permissions = await query(`
      SELECT COUNT(*) as count
      FROM RolePermission rp
      JOIN Permission p ON rp.permissionId = p.id
      WHERE rp.roleId = ? AND p.module = ? AND p.action = ?
    `, [roles[0].id, module.toUpperCase(), action]) as any[]

    return permissions[0].count > 0
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Check if user has VIEW permission for parametres
    const canView = await hasPermission(session.user.email!, 'PARAMETRES', 'VIEW')
    
    if (!canView) {
      return NextResponse.json({ error: "Accès refusé - Permission VIEW requise" }, { status: 403 })
    }

    console.log("Fetching users for", session.user.role, ":", session.user.email)

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
