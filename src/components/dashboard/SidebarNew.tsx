"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  Home,
  LayoutDashboard,
  Clock,
  Calendar,
  FileText,
  Users,
  Settings,
  Bell,
  Activity,
  Shield,
  UserCheck,
  Menu,
  X,
  ChevronDown,
  Briefcase,
  HelpCircle
} from "lucide-react"

interface SidebarProps {
  userRole: string
}

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: string[]
}

interface MenuSection {
  title?: string
  titleKey?: string
  items: MenuItem[]
}

export function SidebarNew({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const { t, isRTL } = useLanguage()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [contractCount, setContractCount] = useState(0)

  // Fetch contract count
  useEffect(() => {
    const fetchContractCount = async () => {
      try {
        const response = await fetch("/api/contracts/count")
        if (response.ok) {
          const data = await response.json()
          setContractCount(data.count || 0)
        }
      } catch (error) {
        console.error("Error fetching contract count:", error)
      }
    }
    fetchContractCount()
    // Refresh every 30 seconds
    const interval = setInterval(fetchContractCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  // Menu sections with role-based filtering
  const menuSections: MenuSection[] = [
    {
      items: [
        { href: "/home", label: t("home"), icon: <Home className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
        { href: "/dashboard", label: t("dashboard"), icon: <LayoutDashboard className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
        { href: "/workspace", label: t("workspace"), icon: <Activity className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
        { href: "/pointage", label: t("attendance"), icon: <Clock className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
        { href: "/conges", label: t("leave_requests"), icon: <Calendar className="w-5 h-5" />, roles: ["USER"] },
        { href: "/documents", label: t("my_documents"), icon: <FileText className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
        { href: "/contracts", label: t("contracts"), icon: <FileText className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
        { href: "/security", label: t("login_history"), icon: <Shield className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
        { href: "/chatbot", label: t("help") || "Assistance", icon: <HelpCircle className="w-5 h-5" />, roles: ["USER", "RH", "SUPER_ADMIN"] },
      ]
    },
    {
      title: t("hr"),
      items: [
        { href: "/rh/conges", label: t("leave_management"), icon: <Calendar className="w-5 h-5" />, roles: ["RH"] },
        { href: "/rh/profiles", label: t("profile_validation"), icon: <UserCheck className="w-5 h-5" />, roles: ["RH", "SUPER_ADMIN"] },
        { href: "/rh/notifications", label: t("notification_center"), icon: <Bell className="w-5 h-5" />, roles: ["RH", "SUPER_ADMIN"] },
      ]
    },
    {
      title: t("administration"),
      items: [
        { href: "/parametres/users", label: t("user_management"), icon: <Users className="w-5 h-5" />, roles: ["SUPER_ADMIN"] },
        { href: "/parametres/roles", label: t("role_management"), icon: <Settings className="w-5 h-5" />, roles: ["SUPER_ADMIN"] },
        { href: "/parametres/logs", label: t("audit_logs"), icon: <Activity className="w-5 h-5" />, roles: ["SUPER_ADMIN"] },
        { href: "/parametres/cookies", label: t("cookie_settings"), icon: <Shield className="w-5 h-5" />, roles: ["SUPER_ADMIN"] },
      ]
    }
  ]

  // Filter sections based on user role
  const filteredSections = menuSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(userRole))
    }))
    .filter(section => section.items.length > 0)

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.href)
    const showBadge = item.href === "/documents/contracts" && contractCount > 0
    
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-200
          ${active 
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-l-2 border-blue-600" 
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
          }
          ${isRTL ? "flex-row-reverse text-right" : ""}
          ${isCollapsed ? "justify-center px-2" : ""}
        `}
        title={isCollapsed ? item.label : undefined}
      >
        <span className={`flex-shrink-0 ${active ? "text-blue-600 dark:text-blue-400" : ""}`}>
          {item.icon}
        </span>
        {!isCollapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {showBadge && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {contractCount}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {filteredSections.map((section, idx) => (
          <div key={idx}>
            {/* Section Title */}
            {section.title && !isCollapsed && (
              <div className={`px-3 mb-2 ${isRTL ? "text-right" : ""}`}>
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {section.title}
                </span>
              </div>
            )}
            {section.title && isCollapsed && (
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
            )}
            {/* Menu Items */}
            <div className="space-y-1">
              {section.items.map(renderMenuItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Santec RH v1.0.0
          </p>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`
          lg:hidden fixed top-20 z-50 p-2.5 
          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
          rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
          hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
          ${isRTL ? "right-4" : "left-4"}
        `}
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
      <aside
        className={`
          fixed top-16 bottom-0 z-40
          bg-white dark:bg-gray-900 
          border-r border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-16" : "w-64"}
          ${isRTL ? "right-0 border-l border-r-0" : "left-0"}
          ${isMobileOpen 
            ? "translate-x-0" 
            : isRTL 
              ? "translate-x-full lg:translate-x-0" 
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50
          w-6 h-12 items-center justify-center
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          rounded-r-lg shadow-md
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-all duration-300
          ${isCollapsed ? "left-16" : "left-64"}
          ${isRTL ? "hidden" : ""}
        `}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isCollapsed ? "-rotate-90" : "rotate-90"}`} 
        />
      </button>
    </>
  )
}

export default SidebarNew
