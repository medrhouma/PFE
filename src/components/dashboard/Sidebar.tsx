"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  Home, Clock, Calendar, FileText, 
  Users, Settings, MessageSquare, LayoutGrid, Bell, Activity, Shield,
  UserCheck, Database, Menu, X
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const { t, isRTL } = useLanguage()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  // Menu items pour tous les utilisateurs authentifiés
  const userMenuItems = [
    { 
      href: "/home", 
      labelKey: "home", 
      icon: <Home className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/dashboard", 
      labelKey: "dashboard", 
      icon: <LayoutGrid className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/workspace", 
      labelKey: "workspace", 
      icon: <Activity className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/pointage", 
      labelKey: "attendance", 
      icon: <Clock className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
    { 
      href: "/conges", 
      labelKey: "leave_requests", 
      icon: <Calendar className="w-5 h-5" />,
      roles: ["USER"] // Only regular users can request leaves - RH manages them
    },
    { 
      href: "/security", 
      labelKey: "login_history", 
      icon: <Shield className="w-5 h-5" />,
      roles: ["USER", "RH", "SUPER_ADMIN"]
    },
  ]

  // Menu RH - Gestion des employés et congés
  const rhMenuItems = [
    { 
      href: "/rh/conges", 
      labelKey: "leave_management", 
      icon: <Calendar className="w-5 h-5" />,
      roles: ["RH"] // Only RH can manage leaves, not SUPER_ADMIN
    },
    { 
      href: "/rh/profiles", 
      labelKey: "profile_validation", 
      icon: <UserCheck className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
    { 
      href: "/rh/notifications", 
      labelKey: "notification_center", 
      icon: <Bell className="w-5 h-5" />,
      roles: ["RH", "SUPER_ADMIN"]
    },
  ]

  // Menu Administration - SUPER_ADMIN uniquement ou fonctionnalités limitées pour RH
  const adminMenuItems = [
    { 
      href: "/parametres/users", 
      labelKey: "user_management", 
      icon: <Users className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"]
    },
    { 
      href: "/parametres/roles", 
      labelKey: "role_management", 
      icon: <Settings className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"]
    },
    { 
      href: "/parametres/logs", 
      labelKey: "audit_logs", 
      icon: <Activity className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"]
    },
    { 
      href: "/parametres/cookies", 
      labelKey: "cookie_settings", 
      icon: <Shield className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"]
    },
  ]

  const userItems = userMenuItems.filter(item => item.roles.includes(userRole))
  const rhItems = rhMenuItems.filter(item => item.roles.includes(userRole))
  const adminItems = adminMenuItems.filter(item => item.roles.includes(userRole))

  const renderMenuItems = (items: typeof userMenuItems) => (
    items.map((item) => (
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
    ))
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`lg:hidden fixed top-20 ${isRTL ? 'right-4' : 'left-4'} z-50 p-2 bg-violet-600 text-white rounded-lg shadow-lg hover:bg-violet-700 transition-colors`}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
        h-[calc(100vh-4rem)] fixed ${isRTL ? 'right-0' : 'left-0'} top-16 z-50
        transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Scrollable nav container */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
          {/* User Menu */}
          {renderMenuItems(userItems)}

          {/* RH Section */}
          {rhItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <div className="border-t border-gray-200 dark:border-gray-700" />
                <p className={`px-4 pt-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${isRTL ? 'text-right' : ''}`}>
                  {t("hr")}
                </p>
              </div>
              {renderMenuItems(rhItems)}
            </>
          )}

          {/* Admin Section - SUPER_ADMIN only */}
          {adminItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <div className="border-t border-gray-200 dark:border-gray-700" />
                <p className={`px-4 pt-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${isRTL ? 'text-right' : ''}`}>
                  {t("administration")}
                </p>
              </div>
              {renderMenuItems(adminItems)}
            </>
          )}
        </nav>

        {/* Version info - fixed at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-400 text-center">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}
