import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ModuleCard } from "@/components/dashboard/ModuleCard"
import { query } from "@/lib/mysql-direct"

// Icons Components

const DashboardIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3V3zM9 3v18M15 3v18M3 9h18M3 15h18" />
  </svg>
)




const ChatbotIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
)

const ParametresIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)



// Configuration des modules
const allModules = [
  {
    id: "dashboard",
    title: "Tableau de bord",
    description: "Vue d'ensemble des indicateurs clés et performances RH.",
    icon: <DashboardIcon />,
    href: "/dashboard",
    color: "violet" as const,
    permissionModule: "dashboard",
  },
  {
    id: "chatbot",
    title: "Chatbot IA",
    description: "Assistant intelligent pour répondre à vos questions RH et analyse comportementale.",
    icon: <ChatbotIcon />,
    href: "/chatbot",
    color: "teal" as const,
    permissionModule: "chatbot",
  },
  {
    id: "parametres",
    title: "Paramètres",
    description: "Gestion des utilisateurs, rôles et paramètres généraux de la plateforme.",
    icon: <ParametresIcon />,
    href: "/parametres/users",
    color: "green" as const,
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

  const firstName = session.user.name?.split(" ")[0] || "Utilisateur"
  const userRole = session.user.role || "USER"
  
  // Get user permissions from database
  const { permissions: userPermissions } = await getUserPermissions(session.user.email!)
  
  // Filter modules based on VIEW permission
  const modules = allModules.filter((module) => {
    // SUPER_ADMIN has access to everything
    if (userRole === "SUPER_ADMIN") return true
    
    // Check if user has VIEW permission for this module
    const modulePerms = userPermissions[module.permissionModule]
    return modulePerms && modulePerms.includes('VIEW')
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Badge Plateforme */}
      <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-6 shadow-sm">
        <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></span>
        <span className="text-sm text-gray-600 font-medium">Plateforme Santec AI</span>
      </div>

      {/* Bienvenue */}
      <h1 className="text-3xl font-bold text-gray-900">
        Bienvenue, <span className="text-violet-600">{firstName}</span>
      </h1>

      {/* ✅ Section Modules - Titre centré AU-DESSUS des cartes */}
      <div className="mt-12 mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Modules disponibles</h2>
        <p className="text-gray-500 mt-2">Sélectionnez un module pour commencer votre session</p>
      </div>

      {/* Grille des Modules */}
      <div className="grid grid-cols-1 md: grid-cols-2 lg: grid-cols-4 gap-6">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            title={module.title}
            description={module.description}
            icon={module.icon}
            href={module.href}
            color={module.color}
          />
        ))}
      </div>
    </div>
  )
}