import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { query, execute } from "@/lib/mysql-direct"
import bcrypt from "bcryptjs"
import { auditLogger } from "@/lib/services/audit-logger"

// Helper to get client IP
function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown"
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ SECURITY FIX: Add authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    
    // Only allow users to fetch their own data, or admins to fetch any user
    if (session.user.id !== id && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'RH') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
    }
    
    const users = await query(
      `SELECT u.id, u.name, u.last_name, u.email, u.image, u.sexe, u.telephone,
              u.adresse, u.dateEmbauche, u.typeContrat, u.role, u.status,
              u.created_at, u.updated_at,
              GROUP_CONCAT(a.provider) as providers 
       FROM User u 
       LEFT JOIN accounts a ON u.id = a.user_id 
       WHERE u.id = ? 
       GROUP BY u.id`,
      [id]
    ) as any[]

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    const user = users[0]
    // Remove sensitive fields
    delete user.password
    
    return NextResponse.json({
      ...user,
      providers: user.providers ? user.providers.split(',') : []
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Only SUPER_ADMIN can update users
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, last_name, email, role, password } = body
    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get("user-agent") || undefined

    // Check if user exists
    const existingUsers = await query('SELECT * FROM User WHERE id = ?', [id]) as any[]
    
    if (!existingUsers || existingUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const existingUser = existingUsers[0]

    // Check if email is already taken by another user
    if (email !== existingUser.email) {
      const emailCheck = await query('SELECT id FROM User WHERE email = ? AND id != ?', [email, id]) as any[]
      
      if (emailCheck && emailCheck.length > 0) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 })
      }
    }

    // Prepare update query
    let updateQuery = 'UPDATE User SET name = ?, email = ?, role = ?, updatedAt = NOW()'
    const updateParams: any[] = [name, email, role]

    // Only update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateQuery += ', password = ?'
      updateParams.push(hashedPassword)
    }

    updateQuery += ' WHERE id = ?'
    updateParams.push(id)

    await execute(updateQuery, updateParams)

    // Fetch updated user
    const updatedUsers = await query(
      `SELECT u.*, GROUP_CONCAT(a.provider) as providers 
       FROM User u 
       LEFT JOIN Account a ON u.id = a.userId 
       WHERE u.id = ? 
       GROUP BY u.id`,
      [id]
    ) as any[]

    const result = {
      ...updatedUsers[0],
      providers: updatedUsers[0].providers ? updatedUsers[0].providers.split(',') : []
    }

    // Log the user update
    await auditLogger.logUpdate(
      "User",
      id,
      session.user.id,
      {
        before: { name: existingUser.name, email: existingUser.email, role: existingUser.role },
        after: { name, email, role, passwordChanged: !!password }
      },
      { ipAddress, userAgent }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Only SUPER_ADMIN can delete users
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get("user-agent") || undefined

    console.log("Attempting to delete user with ID:", id)

    // Check if user exists
    const existingUsers = await query('SELECT * FROM User WHERE id = ?', [id]) as any[]
    
    if (!existingUsers || existingUsers.length === 0) {
      console.log("User not found:", id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const deletedUserData = existingUsers[0]

    console.log("User found, deleting sessions and accounts...")

    // Delete sessions first
    await execute('DELETE FROM Session WHERE userId = ?', [id])
    console.log("Deleted sessions")

    // Delete accounts
    await execute('DELETE FROM Account WHERE userId = ?', [id])
    console.log("Deleted accounts")

    // Delete the user
    await execute('DELETE FROM User WHERE id = ?', [id])

    // Log the user deletion
    await auditLogger.logDelete(
      "User",
      id,
      session.user.id,
      { name: deletedUserData.name, email: deletedUserData.email, role: deletedUserData.role },
      { ipAddress, userAgent }
    )

    console.log("User deleted successfully")
    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting user - Full error:", error)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    return NextResponse.json({ 
      error: "Failed to delete user", 
      details: error.message,
      code: error.code
    }, { status: 500 })
  }
}
