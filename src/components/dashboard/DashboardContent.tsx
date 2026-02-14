"use client"

import { usePathname } from "next/navigation"
import { SidebarNew } from "./SidebarNew"

interface DashboardContentProps {
  userRole: string
  showSidebar: boolean
  children: React.ReactNode
}

/**
 * Client component that conditionally shows the sidebar
 * based on the current route. Sidebar is hidden on /home (landing page)
 * and only visible on dashboard and other inner pages.
 */
export function DashboardContent({ userRole, showSidebar, children }: DashboardContentProps) {
  const pathname = usePathname()

  // Pages where sidebar should NOT appear (home/landing page)
  const noSidebarPages = ["/home", "/welcome"]
  const isHomePage = noSidebarPages.some(page => pathname === page || pathname.startsWith(page + "/"))

  // Show sidebar only if allowed AND not on home page
  const shouldShowSidebar = showSidebar && !isHomePage

  if (shouldShowSidebar) {
    return (
      <div className="flex">
        {/* Fixed Sidebar */}
        <SidebarNew userRole={userRole} />
        
        {/* Main Content - offset by sidebar width on desktop */}
        <main className="flex-1 lg:ml-64 pt-16 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <main className="pt-16 min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </main>
  )
}
