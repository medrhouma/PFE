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
const routeConfig: Record<string, { label: string; icon: React.ReactNode; parent?: string }> = {
  "/home": { label: "Accueil", icon: <Home className="w-4 h-4" /> },
  "/dashboard": { label: "Tableau de bord", icon: <LayoutDashboard className="w-4 h-4" /> },
  "/workspace": { label: "Espace de travail", icon: <Activity className="w-4 h-4" /> },
  "/pointage": { label: "Pointage", icon: <Clock className="w-4 h-4" /> },
  "/conges": { label: "Congés", icon: <Calendar className="w-4 h-4" /> },
  "/documents": { label: "Documents", icon: <FileText className="w-4 h-4" /> },
  "/chatbot": { label: "Assistant", icon: <Briefcase className="w-4 h-4" /> },
  "/rh/conges": { label: "Gestion Congés", icon: <Calendar className="w-4 h-4" />, parent: "RH" },
  "/rh/profiles": { label: "Validation Profils", icon: <UserCheck className="w-4 h-4" />, parent: "RH" },
  "/rh/notifications": { label: "Notifications", icon: <Bell className="w-4 h-4" />, parent: "RH" },
  "/parametres/users": { label: "Utilisateurs", icon: <Users className="w-4 h-4" />, parent: "Administration" },
  "/parametres/roles": { label: "Rôles", icon: <Settings className="w-4 h-4" />, parent: "Administration" },
  "/parametres/logs": { label: "Logs", icon: <Activity className="w-4 h-4" />, parent: "Administration" },
  "/parametres/cookies": { label: "Cookies", icon: <Shield className="w-4 h-4" />, parent: "Administration" },
  "/profile": { label: "Mon Profil", icon: <Users className="w-4 h-4" /> },
  "/settings": { label: "Paramètres", icon: <Settings className="w-4 h-4" /> },
}

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { isRTL } = useLanguage()

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
          {currentRoute?.parent && (
            <>
              <span className="text-gray-400 dark:text-gray-500 font-medium">
                {currentRoute.parent}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </>
          )}
          {currentRoute && (
            <div className={`flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-400 dark:text-gray-500">
                {currentRoute.icon}
              </span>
              <span>{currentRoute.label}</span>
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
