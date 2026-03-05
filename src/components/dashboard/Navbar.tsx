"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { ProfileMenu } from "@/components/profile/ProfileMenu"
import { useLanguage } from "@/contexts/LanguageContext"
import { 
  Home, LayoutDashboard, Clock, Calendar, FileText, 
  Users, Settings, Bell, Activity, Shield, UserCheck,
  Briefcase, ChevronRight
} from "lucide-react"

// Breadcrumb configuration based on routes
const routeConfig: Record<string, { labelKey: string; icon: React.ReactNode; parentKey?: string }> = {
  "/home": { labelKey: "nav_home", icon: <Home className="w-4 h-4" /> },
  "/dashboard": { labelKey: "nav_dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  "/workspace": { labelKey: "workspace_module_title", icon: <Activity className="w-4 h-4" /> },
  "/pointage": { labelKey: "nav_attendance", icon: <Clock className="w-4 h-4" /> },
  "/conges": { labelKey: "nav_leaves", icon: <Calendar className="w-4 h-4" /> },
  "/rh/conges": { labelKey: "nav_leave_management", icon: <Calendar className="w-4 h-4" />, parentKey: "hr" },
  "/rh/profiles": { labelKey: "nav_profile_validation", icon: <UserCheck className="w-4 h-4" />, parentKey: "hr" },
  "/rh/notifications": { labelKey: "notifications", icon: <Bell className="w-4 h-4" />, parentKey: "hr" },
  "/parametres/users": { labelKey: "nav_users", icon: <Users className="w-4 h-4" />, parentKey: "nav_administration" },
  "/parametres/roles": { labelKey: "nav_roles", icon: <Settings className="w-4 h-4" />, parentKey: "nav_administration" },
  "/parametres/logs": { labelKey: "nav_logs", icon: <Activity className="w-4 h-4" />, parentKey: "nav_administration" },
  "/parametres/cookies": { labelKey: "nav_cookies", icon: <Shield className="w-4 h-4" />, parentKey: "nav_administration" },
  "/profile": { labelKey: "nav_my_profile", icon: <Users className="w-4 h-4" /> },
  "/settings": { labelKey: "settings_module_title", icon: <Settings className="w-4 h-4" /> },
}

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { isRTL, t } = useLanguage()

  // Get current route info for breadcrumb
  const getCurrentRoute = () => {
    // Find exact match first
    if (routeConfig[pathname]) {
      return routeConfig[pathname]
    }
    // Find parent match for nested routes
    const parentPath = Object.keys(routeConfig).find(path => 
      pathname.startsWith(path) && path !== "/"
    )
    return parentPath ? routeConfig[parentPath] : null
  }

  const currentRoute = getCurrentRoute()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 transition-colors">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link href="/home" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">
                Santec
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5 font-medium">
                RH
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Breadcrumb / Page Title */}
        <div className={`hidden md:flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          {currentRoute?.parentKey && (
            <>
              <span className="text-gray-400 dark:text-gray-500 font-medium">
                {t(currentRoute.parentKey)}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </>
          )}
          {currentRoute && (
            <div className={`flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-400 dark:text-gray-500">
                {currentRoute.icon}
              </span>
              <span>{t(currentRoute.labelKey)}</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className={`flex items-center gap-2 md:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationBell />

          {/* Profile Menu */}
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

export default Navbar
