import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/mysql-direct"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Get user's role
    const users = await query(
      'SELECT id, role FROM User WHERE email = ?',
      [session.user.email]
    ) as any[]

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    const user = users[0]

    // Get the Role ID based on the role name
    const roles = await query(
      'SELECT id FROM Role WHERE name = ?',
      [user.role]
    ) as any[]

    let permissions: any[] = []
    
    if (roles && roles.length > 0) {
      const roleId = roles[0].id
      
      permissions = await query(`
        SELECT p.module, p.type, p.action
        FROM RolePermission rp
        JOIN Permission p ON rp.permissionId = p.id
        WHERE rp.roleId = ?
      `, [roleId]) as any[]
    }

    // Group permissions by module
    const modulePermissions: Record<string, any> = {}
    
    permissions.forEach((perm: any) => {
      const module = perm.module.toLowerCase()
      
      if (!modulePermissions[module]) {
        modulePermissions[module] = {
          actions: []
        }
      }
      
      modulePermissions[module].actions.push(perm.action)
    })

    return NextResponse.json({
      role: user.role,
      permissions: modulePermissions
    })
  } catch (error: any) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la récupération des permissions",
      details: error.message 
    }, { status: 500 })
  }
}
