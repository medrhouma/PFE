"use client"

import { useSession } from "next-auth/react"
import { ThemeToggle } from "./ThemeToggle"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { ProfileMenu } from "@/components/profile/ProfileMenu"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-gray-900 dark:text-white text-lg">Santec</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5 font-medium">RH</span>
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