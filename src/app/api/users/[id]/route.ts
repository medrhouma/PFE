import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { query } from "@/lib/mysql-direct"
import bcrypt from "bcryptjs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Try direct MySQL query first
    try {
      const users = await query(
        `SELECT u.*, GROUP_CONCAT(a.provider) as providers 
         FROM User u 
         LEFT JOIN Account a ON u.id = a.userId 
         WHERE u.id = ? 
         GROUP BY u.id`,
        [id]
      ) as any[]

      if (!users || users.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const user = users[0]
      return NextResponse.json({
        ...user,
        providers: user.providers ? user.providers.split(',') : []
      })
    } catch (directError) {
      console.log("Direct query failed, trying Prisma:", directError)
      // Fallback to Prisma
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          accounts: true
        }
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      return NextResponse.json(user)
    }
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
    const { id } = await params
    const body = await req.json()
    const { name, last_name, email, role, password } = body

    // Try direct MySQL query first
    try {
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

      await query(updateQuery, updateParams)

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

      return NextResponse.json(result)
    } catch (directError) {
      console.log("Direct query failed, trying Prisma:", directError)
      // Fallback to Prisma
      const existingUser = await prisma.user.findUnique({
        where: { id }
      })

      if (!existingUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Check if email is already taken by another user
      if (email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email }
        })

        if (emailExists) {
          return NextResponse.json({ error: "Email already in use" }, { status: 400 })
        }
      }

      // Prepare update data
      const updateData: any = {
        name,
        email,
        role
      }

      // Only update password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10)
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          accounts: true
        }
      })

      const result = {
        ...updatedUser,
        last_name: last_name || "",
        providers: updatedUser.accounts.map((a: any) => a.provider)
      }

      return NextResponse.json(result)
    }
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
    const { id } = await params

    console.log("Attempting to delete user with ID:", id)

    // Try direct MySQL query first
    try {
      // Check if user exists
      const existingUsers = await query('SELECT * FROM User WHERE id = ?', [id]) as any[]
      
      if (!existingUsers || existingUsers.length === 0) {
        console.log("User not found:", id)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      console.log("User found, deleting sessions and accounts...")

      // Delete sessions first
      await query('DELETE FROM Session WHERE userId = ?', [id])
      console.log("Deleted sessions")

      // Delete accounts
      await query('DELETE FROM Account WHERE userId = ?', [id])
      console.log("Deleted accounts")

      // Delete the user
      await query('DELETE FROM User WHERE id = ?', [id])

      console.log("User deleted successfully")
      return NextResponse.json({ message: "User deleted successfully" })
    } catch (directError) {
      console.log("Direct query failed, trying Prisma:", directError)
      // Fallback to Prisma
      const existingUser = await prisma.user.findUnique({
        where: { id },
        include: {
          accounts: true,
          sessions: true
        }
      })

      if (!existingUser) {
        console.log("User not found:", id)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      console.log("User found, deleting sessions and accounts...")

      // Explicitly delete sessions first
      if (existingUser.sessions && existingUser.sessions.length > 0) {
        await prisma.session.deleteMany({
          where: { userId: id }
        })
        console.log(`Deleted ${existingUser.sessions.length} sessions`)
      }

      // Explicitly delete accounts
      if (existingUser.accounts && existingUser.accounts.length > 0) {
        await prisma.account.deleteMany({
          where: { userId: id }
        })
        console.log(`Deleted ${existingUser.accounts.length} accounts`)
      }

      console.log("Deleting user...")
      
      // Delete the user
      await prisma.user.delete({
        where: { id }
      })

      console.log("User deleted successfully")
      return NextResponse.json({ message: "User deleted successfully" })
    }
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
