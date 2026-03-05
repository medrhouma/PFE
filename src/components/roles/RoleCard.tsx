"use client"

import { Shield, Edit3, Check, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface Permission {
  label: string
  checked: boolean
}

interface PermissionModule {
  title: string
  badge?: string
  permissions: {
    base: Permission[]
    advanced?: Permission[]
  }
}

interface RoleCardProps {
  roleName: string
  description: string
  modules: PermissionModule[]
  onEdit?: () => void
}

export function RoleCard({ roleName, description, modules, onEdit }: RoleCardProps) {
  const { t } = useLanguage()
  // Count active permissions
  const activePerms = modules.reduce((acc, mod) => {
    const baseActive = mod.permissions.base.filter(p => p.checked).length
    const advActive = mod.permissions.advanced?.filter(p => p.checked).length || 0
    return acc + baseActive + advActive
  }, 0)
  
  const totalPerms = modules.reduce((acc, mod) => {
    return acc + mod.permissions.base.length + (mod.permissions.advanced?.length || 0)
  }, 0)

  // Color mapping based on role name
  const getRoleColor = () => {
    const name = roleName.toUpperCase()
    if (name.includes('SUPER_ADMIN') || name.includes('ADMIN')) return { bg: 'from-violet-500 to-purple-600', light: 'violet', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' }
    if (name.includes('RH')) return { bg: 'from-blue-500 to-cyan-600', light: 'blue', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }
    return { bg: 'from-emerald-500 to-teal-600', light: 'emerald', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  }

  const colors = getRoleColor()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/30 transition-all duration-300 group">
      {/* Colored top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${colors.bg}`} />
      
      {/* Card Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.bg} shadow-sm`}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {roleName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{description}</p>
            </div>
          </div>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all duration-200"
              aria-label={t('re_edit_role')}
            >
              <Edit3 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Permission counter */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.badge}`}>
            {activePerms}/{totalPerms} permissions
          </span>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-2.5">
          {modules.map((module, idx) => {
            const hasActive = module.permissions.base.some(p => p.checked) || module.permissions.advanced?.some(p => p.checked)
            return (
              <div 
                key={idx} 
                className={`rounded-xl p-3 transition-all duration-200 ${
                  hasActive 
                    ? 'bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600' 
                    : 'bg-gray-50/50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{module.title}</span>
                  {module.badge && (
                    <span className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-[10px] rounded-md font-bold">
                      {module.badge}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {module.permissions.base.map((perm, pidx) => (
                    <div key={pidx} className="flex items-center gap-1.5">
                      {perm.checked ? (
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      )}
                      <span className={`text-[11px] truncate ${perm.checked ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                        {perm.label}
                      </span>
                    </div>
                  ))}
                  {module.permissions.advanced?.map((perm, pidx) => (
                    <div key={`adv-${pidx}`} className="flex items-center gap-1.5">
                      {perm.checked ? (
                        <Check className="w-3 h-3 text-violet-500 flex-shrink-0" />
                      ) : (
                        <X className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      )}
                      <span className={`text-[11px] truncate ${perm.checked ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                        {perm.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
