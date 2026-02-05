export const dynamic = "force-dynamic";

import { NextResponse } from "next/server"
import { query, execute } from "@/lib/mysql-direct"

// Map database action to frontend labels
const actionMap: Record<string, string> = {
  'ADD': 'ajouter',
  'EDIT': 'modifier',
  'VIEW': 'voir',
  'DELETE': 'supprimer',
  'ACTIVATE': 'activer',
  'VALIDATE': 'valider',
  'VERIFY': 'vérifier',
  'PROCESS': 'traiter'
}

const reverseActionMap: Record<string, string> = {
  'ajouter': 'ADD',
  'modifier': 'EDIT',
  'voir': 'VIEW',
  'supprimer': 'DELETE',
  'activer': 'ACTIVATE',
  'valider': 'VALIDATE',
  'vérifier': 'VERIFY',
  'traiter': 'PROCESS'
}

export async function GET(req: Request) {
  try {
    // Fetch all available permissions
    const allPermissions = await query(`SELECT * FROM Permission ORDER BY module, type, action`) as any[]
    
    // Fetch all roles with their assigned permissions
    const rolesData = await query(`
      SELECT 
        r.id as role_id,
        r.name as role_name,
        r.description as role_description,
        p.id as permission_id,
        p.module,
        p.type,
        p.action
      FROM Role r
      LEFT JOIN RolePermission rp ON r.id = rp.roleId
      LEFT JOIN Permission p ON rp.permissionId = p.id
      ORDER BY r.createdAt ASC, p.module, p.type, p.action
    `) as any[]

    // Group by role
    const rolesMap = new Map()
    
    rolesData.forEach(row => {
      if (!rolesMap.has(row.role_id)) {
        rolesMap.set(row.role_id, {
          id: row.role_id,
          name: row.role_name,
          description: row.role_description,
          rolePermissions: []
        })
      }
      
      if (row.permission_id) {
        rolesMap.get(row.role_id).rolePermissions.push({
          permission: {
            id: row.permission_id,
            module: row.module,
            type: row.type,
            action: row.action
          }
        })
      }
    })

    const roles = Array.from(rolesMap.values())

    const formattedRoles = roles.map((role: any) => {
      // Create a set of assigned permission IDs for this role
      const assignedPermissionIds = new Set(
        role.rolePermissions.map((rp: any) => rp.permission.id)
      )

      // Build modules structure with ALL available permissions
      const allModulePermissions: Record<string, any> = {}
      
      allPermissions.forEach((perm: any) => {
        const module = perm.module.toLowerCase()
        const action = actionMap[perm.action] || perm.action.toLowerCase()
        const isChecked = assignedPermissionIds.has(perm.id)
        
        if (!allModulePermissions[module]) {
          allModulePermissions[module] = {
            base: [],
            advanced: []
          }
        }
        
        const permType = perm.type === 'BASE' ? 'base' : 'advanced'
        allModulePermissions[module][permType].push({
          label: action.charAt(0).toUpperCase() + action.slice(1),
          checked: isChecked,
          action: perm.action
        })
      })

      // Build modules for display
      const modules = Object.entries(allModulePermissions).map(([moduleName, perms]: [string, any]) => ({
        title: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
        badge: perms.base.some((p: any) => p.checked && p.action === 'VIEW') ? "ON" : undefined,
        permissions: perms
      }))

      // Build flat permissions structure for modal
      const permissions: any = {}
      Object.entries(allModulePermissions).forEach(([moduleName, perms]: [string, any]) => {
        permissions[moduleName] = {}
        ;[...perms.base, ...perms.advanced].forEach((p: any) => {
          const actionKey = actionMap[p.action] || p.action.toLowerCase()
          permissions[moduleName][actionKey] = p.checked
        })
      })

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        modules,
        permissions
      }
    })

    return NextResponse.json(formattedRoles)
  } catch (error: any) {
    console.error("Error fetching roles:", error)
    return NextResponse.json({ 
      error: "Failed to fetch roles", 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, description, permissions } = body

    // Create the role
    const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await execute(
      'INSERT INTO Role (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [roleId, name, description]
    )

    // Get all permissions
    const allPermissions = await query('SELECT * FROM Permission') as any[]

    // Create role permissions based on selected ones
    for (const perm of allPermissions) {
      const module = perm.module.toLowerCase()
      const action = actionMap[perm.action] || perm.action.toLowerCase()
      
      if (permissions[module]?.[action]) {
        const rpId = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await execute(
          'INSERT INTO RolePermission (id, roleId, permissionId, createdAt) VALUES (?, ?, ?, NOW())',
          [rpId, roleId, perm.id]
        )
      }
    }

    return NextResponse.json({ 
      message: "Role created successfully", 
      role: { id: roleId, name, description }
    })
  } catch (error: any) {
    console.error("Error creating role:", error)
    return NextResponse.json({ 
      error: "Failed to create role", 
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { roleId, description, permissions } = body

    console.log("Updating role:", roleId, "with permissions:", permissions)

    // Update role description
    await execute(
      'UPDATE Role SET description = ?, updatedAt = NOW() WHERE id = ?',
      [description, roleId]
    )

    // Delete existing role permissions
    await execute('DELETE FROM RolePermission WHERE roleId = ?', [roleId])

    // Get all permissions
    const allPermissions = await query('SELECT * FROM Permission') as any[]

    // Create new role permissions based on selected ones
    for (const perm of allPermissions) {
      const module = perm.module.toLowerCase()
      const action = actionMap[perm.action] || perm.action.toLowerCase()
      
      if (permissions[module]?.[action]) {
        const rpId = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await execute(
          'INSERT INTO RolePermission (id, roleId, permissionId, createdAt) VALUES (?, ?, ?, NOW())',
          [rpId, roleId, perm.id]
        )
      }
    }

    return NextResponse.json({ message: "Role updated successfully" })
  } catch (error: any) {
    console.error("Error updating role:", error)
    return NextResponse.json({ 
      error: "Failed to update role", 
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const roleId = searchParams.get('id')

    if (!roleId) {
      return NextResponse.json({ 
        error: "Role ID is required" 
      }, { status: 400 })
    }

    // Check if role has users
    const usersCheck = await query(
      'SELECT COUNT(*) as count FROM User WHERE roleId = ?',
      [roleId]
    ) as any[]
    
    const usersWithRole = usersCheck[0]?.count || 0

    if (usersWithRole > 0) {
      return NextResponse.json({ 
        error: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.` 
      }, { status: 400 })
    }

    // Delete role permissions first
    await execute('DELETE FROM RolePermission WHERE roleId = ?', [roleId])
    
    // Delete role
    await execute('DELETE FROM Role WHERE id = ?', [roleId])

    return NextResponse.json({ message: "Role deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting role:", error)
    return NextResponse.json({ 
      error: "Failed to delete role", 
      details: error.message 
    }, { status: 500 })
  }
}