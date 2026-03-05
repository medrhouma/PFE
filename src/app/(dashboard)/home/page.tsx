import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { query } from "@/lib/mysql-direct"
import { HomeContent } from "@/components/dashboard/HomeContent"

// Configuration des modules — only 3 core modules
const allModules = [
  {
    id: "dashboard",
    titleKey: "dashboard_module_title",
    descriptionKey: "dashboard_module_desc",
    iconId: "dashboard",
    href: "/dashboard",
    color: "violet" as const,
    roles: ["USER", "RH", "SUPER_ADMIN"],
    permissionModule: "dashboard",
  },
  {
    id: "workspace",
    titleKey: "workspace_module_title",
    descriptionKey: "workspace_module_desc",
    iconId: "workspace",
    href: "/workspace",
    color: "blue" as const,
    roles: ["USER", "RH", "SUPER_ADMIN"],
    permissionModule: "chatbot",
  },
  {
    id: "parametres",
    titleKey: "settings_module_title",
    descriptionKey: "settings_module_desc",
    iconId: "settings",
    href: "/settings",
    color: "green" as const,
    roles: ["USER", "RH", "SUPER_ADMIN"],
    permissionModule: "parametres",
  },
]

async function getUserPermissions(email: string) {
  try {
    // Get user's role
    const users = await query(
      'SELECT id, role FROM User WHERE email = ?',
      [email]
    ) as any[]

    if (!users || users.length === 0) {
      return { permissions: {} }
    }

    const user = users[0]

    // Get the Role ID based on the role name
    const roles = await query(
      'SELECT id FROM Role WHERE name = ?',
      [user.role]
    ) as any[]

    if (roles && roles.length > 0) {
      const roleId = roles[0].id

      // Get permissions for this role
      const permissions = await query(`
        SELECT p.module, p.action
        FROM RolePermission rp
        JOIN Permission p ON rp.permissionId = p.id
        WHERE rp.roleId = ?
      `, [roleId]) as any[]

      // Group permissions by module
      const modulePermissions: Record<string, string[]> = {}
      
      permissions.forEach((perm: any) => {
        const module = perm.module.toLowerCase()
        
        if (!modulePermissions[module]) {
          modulePermissions[module] = []
        }
        
        modulePermissions[module].push(perm.action)
      })

      return { permissions: modulePermissions, role: user.role }
    }
  } catch (error) {
    console.error("Error fetching permissions:", error)
  }
  return { permissions: {} }
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Vérifier le statut de l'utilisateur et rediriger si nécessaire
  const userStatus = session.user.status
  const userRole = session.user.role

  // SUPER_ADMIN et RH sont exemptés des vérifications de statut
  if (userRole !== "SUPER_ADMIN" && userRole !== "RH") {
    // INACTIVE ou REJECTED → compléter le profil
    if (userStatus === "INACTIVE" || userStatus === "REJECTED") {
      redirect("/complete-profile")
    }

    // PENDING → en attente de validation
    if (userStatus === "PENDING") {
      redirect("/waiting-validation")
    }

    // Seuls les utilisateurs ACTIVE peuvent accéder
    if (userStatus !== "ACTIVE") {
      redirect("/complete-profile")
    }
  }

  const firstName = session.user.name?.split(" ")[0] || ""
  
  // Load DB permissions for this user
  const { permissions } = await getUserPermissions(session.user.email!)

  // SUPER_ADMIN sees everything; others filtered by DB VIEW permission
  const hasView = (permModule: string) => {
    if (userRole === "SUPER_ADMIN") return true
    const actions = permissions[permModule]
    if (Array.isArray(actions)) return actions.includes("VIEW")
    return false
  }

  // Filter modules based on role AND DB permissions
  const modules = allModules
    .filter((module) => module.roles.includes(userRole))
    .filter((module) => hasView(module.permissionModule))
    .map(({ roles, permissionModule, ...rest }) => {
      // RH / SUPER_ADMIN: Settings card → user management, USER → personal settings
      if (rest.id === "parametres" && (userRole === "RH" || userRole === "SUPER_ADMIN")) {
        return { ...rest, href: "/parametres/users" }
      }
      return rest
    })

  return (
    <HomeContent
      firstName={firstName}
      modules={modules}
    />
  )
}