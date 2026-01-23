"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface ModulePermissions {
  actions: string[]
}

interface PermissionsContextType {
  permissions: Record<string, ModulePermissions>
  role: string
  hasPermission: (module: string, action: string) => boolean
  loading: boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: {},
  role: "USER",
  hasPermission: () => false,
  loading: true,
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Record<string, ModulePermissions>>({})
  const [role, setRole] = useState<string>("USER")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const response = await fetch('/api/user-permissions')
        if (response.ok) {
          const data = await response.json()
          setPermissions(data.permissions || {})
          setRole(data.role || "USER")
        }
      } catch (error) {
        console.error("Error fetching permissions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  const hasPermission = (module: string, action: string) => {
    // SUPER_ADMIN has all permissions
    if (role === "SUPER_ADMIN") return true
    
    const modulePerms = permissions[module.toLowerCase()]
    if (!modulePerms || !modulePerms.actions) return false
    
    return modulePerms.actions.includes(action)
  }

  return (
    <PermissionsContext.Provider value={{ permissions, role, hasPermission, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => useContext(PermissionsContext)
