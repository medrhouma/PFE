"use client"

import { useSession } from "next-auth/react"
import { ThemeToggle } from "./ThemeToggle"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { ProfileMenu } from "@/components/profile/ProfileMenu"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-gray-900 dark:text-white text-lg">Santec</span>
            <span className="font-bold text-violet-600 dark:text-violet-400 text-lg">_AI</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications - Available for all users */}
          <NotificationBell />

          {/* Professional Profile Menu */}
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}