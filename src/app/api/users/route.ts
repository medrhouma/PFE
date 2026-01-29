import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query } from "@/lib/mysql-direct"
import { sanitizeImageFromAPI } from "@/lib/utils"

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

    // RH and SUPER_ADMIN can view users (RH needs to validate employee profiles)
    if (session.user.role !== 'RH' && session.user.role !== 'SUPER_ADMIN') {
      // Check if user has VIEW permission for parametres
      const canView = await hasPermission(session.user.email!, 'PARAMETRES', 'VIEW')
      
      if (!canView) {
        return NextResponse.json({ error: "Accès refusé - Permission VIEW requise" }, { status: 403 })
      }
    }

    console.log("Fetching users for", session.user.role, ":", session.user.email)

    // Use mysql-direct for more reliable queries
    const rows = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.image,
        u.status,
        e.nom,
        e.prenom,
        e.telephone,
        e.adresse,
        e.sexe,
        e.birthday,
        e.photo,
        e.cv,
        e.rib,
        e.type_contrat as typeContrat,
        e.date_embauche as dateEmbauche,
        e.status as statut,
        e.autres_documents
       FROM User u
       LEFT JOIN Employe e ON u.id = e.user_id
       ORDER BY u.createdAt DESC
    `) as any[]

    console.log("Found users:", rows?.length || 0)

    // Format providers into array and include employee data
    // Sanitize all image fields to prevent ERR_INVALID_URL
    const formattedUsers = (rows || []).map(user => {
      // Use employee name if available, otherwise split user name
      const fullName = user.name || ''
      const nameParts = fullName.trim().split(' ')
      const firstName = user.prenom || nameParts[0] || ''
      const lastName = user.nom || nameParts.slice(1).join(' ') || ''
      
      return {
        id: user.id,
        name: firstName,
        last_name: lastName,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        image: sanitizeImageFromAPI(user.image),
        status: user.status,
        telephone: user.telephone,
        adresse: user.adresse,
        sexe: user.sexe,
        birthday: user.birthday,
        photo: sanitizeImageFromAPI(user.photo),
        cv: sanitizeImageFromAPI(user.cv),
        rib: user.rib,
        typeContrat: user.typeContrat,
        dateEmbauche: user.dateEmbauche,
        statut: user.statut,
        autres_documents: user.autres_documents,
        hasEmployeeProfile: !!user.nom || !!user.prenom,
        providers: ['Credentials']
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
