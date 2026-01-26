"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  FiHome, FiClock, FiCalendar, FiFileText, 
  FiUsers, FiSettings, FiMessageSquare, FiGrid, FiBell
} from "react-icons/fi"

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  // Menu items pour tous les utilisateurs
  const userMenuItems = [
    { 
      href: "/home", 
      label: "Accueil", 
      icon: <FiHome className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/dashboard", 
      label: "Tableau de bord", 
      icon: <FiGrid className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/pointage", 
      label: "Pointage", 
      icon: <FiClock className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/conges", 
      label: "Demandes de congé", 
      icon: <FiCalendar className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/documents", 
      label: "Mes documents", 
      icon: <FiFileText className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/chatbot", 
      label: "Assistant IA", 
      icon: <FiMessageSquare className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
  ]

  // Menu items pour RH et SUPER_ADMIN
  const adminMenuItems = [
    { 
      href: "/rh/conges", 
      label: "Gestion des congés", 
      icon: <FiCalendar className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/rh/notifications", 
      label: "Centre de notifications", 
      icon: <FiBell className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/parametres/users", 
      label: "Gestion utilisateurs", 
      icon: <FiUsers className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/parametres/roles", 
      label: "Gestion des rôles", 
      icon: <FiSettings className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"]
    },
  ]

  const allMenuItems = [...userMenuItems, ...adminMenuItems]
  const filteredItems = allMenuItems.filter(item => item.roles.includes(userRole))

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen fixed left-0 top-16 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.href)
                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Version info */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-xs text-gray-400">v1.0.0</p>
      </div>
    </aside>
  )
}
