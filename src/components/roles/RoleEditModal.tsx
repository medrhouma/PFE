"use client"

import { useState } from "react"
import { X, Save, Check, ChevronDown, ChevronUp, Shield, Zap, Loader2 } from "lucide-react"
import { useNotification } from "@/contexts/NotificationContext"
import { useLanguage } from "@/contexts/LanguageContext"

interface RoleEditModalProps {
  role: {
    id: string
    name: string
    description: string
    permissions: Record<string, Record<string, boolean>>
    modules: any[]
  }
  onClose: () => void
  onSave?: (updatedRole: any) => void
}

export default function RoleEditModal({ role, onClose, onSave }: RoleEditModalProps) {
  const [description, setDescription] = useState(role.description)
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(
    role.permissions || {}
  )
  const [saving, setSaving] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    // Expand all modules by default
    const initial: Record<string, boolean> = {}
    role.modules?.forEach((m: any) => { initial[m.key || m.title.toLowerCase()] = true })
    return initial
  })
  const { showNotification } = useNotification()
  const { t } = useLanguage()

  const handlePermissionChange = (module: string, permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...(prev[module] || {}),
        [permission]: !(prev[module]?.[permission])
      }
    }))
  }

  const handleSelectAll = (module: string, perms: any[]) => {
    const allChecked = perms.every(p => {
      const action = p.label?.toLowerCase() || p.action?.toLowerCase() || ''
      return permissions[module]?.[action]
    })
    
    setPermissions(prev => {
      const newModulePerms = perms.reduce((acc, p) => {
        const action = p.label?.toLowerCase() || p.action?.toLowerCase() || ''
        acc[action] = !allChecked
        return acc
      }, {} as Record<string, boolean>)
      
      return { ...prev, [module]: newModulePerms }
    })
  }

  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleName]: !prev[moduleName] }))
  }

  const getModuleStats = (module: any) => {
    const moduleName = module.key || module.title.toLowerCase()
    const allPerms = [...(module.permissions?.base || []), ...(module.permissions?.advanced || [])]
    const active = allPerms.filter(p => {
      const key = p.label?.toLowerCase() || p.action?.toLowerCase() || ''
      return permissions[moduleName]?.[key]
    }).length
    return { active, total: allPerms.length }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/roles-db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: role.id, description, permissions })
      })

      if (response.ok) {
        if (onSave) onSave({ ...role, description, permissions })
        showNotification({
          type: 'success',
          title: t('ra_success'),
          message: t('re_role_updated'),
          duration: 4000
        })
        onClose()
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          title: t('error'),
          message: error.message || t('re_update_error'),
          duration: 5000
        })
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Erreur de connexion',
        message: 'Impossible de sauvegarder les modifications.',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-5 bg-gradient-to-r from-violet-600 to-violet-700 dark:from-violet-700 dark:to-violet-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('re_edit_role')}</h2>
              <p className="text-violet-200 text-sm">{role.name}</p>
            </div>
          </div>
          <button 
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-all duration-200" 
            onClick={onClose}
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <form className="flex-1 overflow-y-auto p-6 space-y-6" onSubmit={handleSave}>
          {/* Description */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t('re_role_description')}
            </label>
            <textarea
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 min-h-[70px] bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 resize-none text-sm"
              placeholder={t('re_describe_role')}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('re_permissions_by_module')}</h3>
            </div>
            
            <div className="space-y-3">
              {role.modules && role.modules.map((module: any, idx: number) => {
                const moduleName = module.key || module.title.toLowerCase()
                const isExpanded = expandedModules[moduleName] !== false
                const stats = getModuleStats(module)
                const hasPermissionsData = module.permissions?.base?.length > 0 || module.permissions?.advanced?.length > 0
                
                return (
                  <div 
                    key={idx}
                    className={`rounded-xl border transition-all duration-200 ${
                      stats.active > 0
                        ? 'border-violet-200 dark:border-violet-700/50 bg-white dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    {/* Module header */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors"
                      onClick={() => toggleModule(moduleName)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${stats.active > 0 ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className="font-semibold text-gray-900 dark:text-white">{module.title}</span>
                        {module.badge && (
                          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-xs rounded-md font-bold">
                            {module.badge}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {stats.active}/{stats.total} actives
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermissionsData && (
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation()
                              const allPerms = [...(module.permissions?.base || []), ...(module.permissions?.advanced || [])]
                              handleSelectAll(moduleName, allPerms)
                            }}
                            className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline font-medium px-2 py-1 rounded-md hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                          >
                            {stats.active === stats.total ? t('re_deselect_all') : t('re_select_all')}
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {/* Module content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4">
                        {/* Base Permissions */}
                        {module.permissions?.base && module.permissions.base.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Check className="w-3.5 h-3.5 text-gray-500" />
                               <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('re_base_permissions')}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {module.permissions.base.map((perm: any, permIdx: number) => {
                                const permKey = perm.label?.toLowerCase() || perm.action?.toLowerCase() || ''
                                const isChecked = permissions[moduleName]?.[permKey] || false
                                return (
                                  <button
                                    key={permIdx}
                                    type="button"
                                    onClick={() => handlePermissionChange(moduleName, permKey)}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-200 text-left ${
                                      isChecked
                                        ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-600'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                      isChecked
                                        ? 'bg-violet-500 shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500'
                                    }`}>
                                      {isChecked && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`text-sm capitalize ${
                                      isChecked
                                        ? 'text-gray-900 dark:text-white font-medium'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {perm.label}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Advanced Permissions */}
                        {module.permissions?.advanced && module.permissions.advanced.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                              <Zap className="w-3.5 h-3.5 text-violet-500" />
                               <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">{t('re_advanced_permissions')}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {module.permissions.advanced.map((perm: any, permIdx: number) => {
                                const permKey = perm.label?.toLowerCase() || perm.action?.toLowerCase() || ''
                                const isChecked = permissions[moduleName]?.[permKey] || false
                                return (
                                  <button
                                    key={permIdx}
                                    type="button"
                                    onClick={() => handlePermissionChange(moduleName, permKey)}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-200 text-left ${
                                      isChecked
                                        ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-400 dark:border-violet-500'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                      isChecked
                                        ? 'bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500'
                                    }`}>
                                      {isChecked && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`text-sm capitalize ${
                                      isChecked
                                        ? 'text-gray-900 dark:text-white font-medium'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {perm.label}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </form>

        {/* Footer - fixed at bottom */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium"
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => {
              if (!saving) handleSave(e)
            }}
            className="px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('re_saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t('save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}