"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  FiHome, FiClock, FiCalendar, FiFileText, 
  FiUsers, FiSettings, FiMessageSquare, FiGrid, FiBell, FiActivity, FiShield
} from "react-icons/fi"
import { useLanguage } from "@/contexts/LanguageContext"

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const { t, isRTL } = useLanguage()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  // Menu items pour tous les utilisateurs
  const userMenuItems = [
    { 
      href: "/home", 
      labelKey: "home", 
      icon: <FiHome className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/dashboard", 
      labelKey: "dashboard", 
      icon: <FiGrid className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/pointage", 
      labelKey: "attendance", 
      icon: <FiClock className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/conges", 
      labelKey: "leave_requests", 
      icon: <FiCalendar className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/documents", 
      labelKey: "my_documents", 
      icon: <FiFileText className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/chatbot", 
      labelKey: "ai_assistant", 
      icon: <FiMessageSquare className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
  ]

  // Menu items pour RH et SUPER_ADMIN
  const adminMenuItems = [
    { 
      href: "/rh/conges", 
      labelKey: "leave_management", 
      icon: <FiCalendar className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/rh/notifications", 
      labelKey: "notification_center", 
      icon: <FiBell className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/parametres/users", 
      labelKey: "user_management", 
      icon: <FiUsers className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/parametres/roles", 
      labelKey: "role_management", 
      icon: <FiSettings className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"]
    },
    { 
      href: "/parametres/logs", 
      labelKey: "audit_logs", 
      icon: <FiActivity className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/parametres/cookies", 
      labelKey: "cookie_settings", 
      icon: <FiShield className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"]
    },
  ]

  const allMenuItems = [...userMenuItems, ...adminMenuItems]
  const filteredItems = allMenuItems.filter(item => item.roles.includes(userRole))

  return (
    <aside className={`w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen fixed ${isRTL ? 'right-0' : 'left-0'} top-16 overflow-y-auto`}>
      <nav className="p-4 space-y-1">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.href)
                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            } ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
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
