"use client"

import { useState } from "react"
import { FiX } from "react-icons/fi"

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
      const action = p.label.toLowerCase()
      return permissions[module]?.[action]
    })
    
    setPermissions(prev => ({
      ...prev,
      [module]: perms.reduce((acc, p) => {
        const action = p.label.toLowerCase()
        acc[action] = !allChecked
        return acc
      }, {} as Record<string, boolean>)
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/roles-db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: role.id,
          description,
          permissions
        })
      })

      if (response.ok) {
        if (onSave) {
          onSave({ ...role, description, permissions })
        }
        alert('Rôle mis à jour avec succès!')
        onClose()
      } else {
        const error = await response.json()
        alert(error.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="text-2xl">🔒</span> Modifier le rôle
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Modifiez les informations et permissions du rôle</p>
          </div>
          <button className="text-gray-400 hover:text-red-500 text-xl" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form className="p-6 space-y-6" onSubmit={handleSave}>
          {/* Informations générales */}
          <div className="bg-[#f7fafd] dark:bg-gray-700/50 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-violet-600 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Informations générales</h3>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">
                Nom du rôle <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                value={role.name}
                disabled
              />
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 min-h-[56px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Permissions par module */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-violet-600 rounded"></div>
              <h3 className="text-sm font-semibold text-violet-600 dark:text-violet-400">Permissions par module</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {role.modules && role.modules.map((module: any, idx: number) => {
                const moduleName = module.title.toLowerCase()
                const hasPermissions = module.permissions?.base?.length > 0 || module.permissions?.advanced?.length > 0
                
                return (
                  <div 
                    key={idx}
                    className={`rounded-xl border p-4 ${
                      module.badge 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{module.title}</span>
                        {module.badge && (
                          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs rounded font-medium">
                            {module.badge}
                          </span>
                        )}
                      </div>
                      {hasPermissions && (
                        <button 
                          type="button" 
                          onClick={() => handleSelectAll(moduleName, [...(module.permissions?.base || []), ...(module.permissions?.advanced || [])])}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Tout sélectionner
                        </button>
                      )}
                    </div>
                    
                    {/* Base Permissions */}
                    {module.permissions?.base && module.permissions.base.length > 0 && (
                      <>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">PERMISSIONS DE BASE</p>
                        <div className="space-y-2 mb-3">
                          {module.permissions.base.map((perm: any, permIdx: number) => {
                            const permKey = perm.label.toLowerCase()
                            return (
                              <label key={permIdx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={permissions[moduleName]?.[permKey] || false}
                                  onChange={() => handlePermissionChange(moduleName, permKey)}
                                  className="w-4 h-4 rounded accent-violet-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{perm.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {/* Advanced Permissions */}
                    {module.permissions?.advanced && module.permissions.advanced.length > 0 && (
                      <>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">PERMISSIONS AVANCÉES</p>
                        <div className="space-y-2">
                          {module.permissions.advanced.map((perm: any, permIdx: number) => {
                            const permKey = perm.label.toLowerCase()
                            return (
                              <label key={permIdx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={permissions[moduleName]?.[permKey] || false}
                                  onChange={() => handlePermissionChange(moduleName, permKey)}
                                  className="w-4 h-4 rounded accent-violet-400"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{perm.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}