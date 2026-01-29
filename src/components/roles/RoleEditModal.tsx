"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { useNotification } from "@/contexts/NotificationContext"

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
  const { showNotification } = useNotification()
  
  console.log('RoleEditModal render - saving:', saving, 'role:', role)

  const handlePermissionChange = (module: string, permission: string) => {
    console.log('handlePermissionChange called - module:', module, 'permission:', permission);
    setPermissions(prev => {
      const newState = {
        ...prev,
        [module]: {
          ...(prev[module] || {}),
          [permission]: !(prev[module]?.[permission])
        }
      };
      console.log('New permissions state:', newState);
      return newState;
    });
  }

  const handleSelectAll = (module: string, perms: any[]) => {
    console.log('handleSelectAll called for module:', module, 'perms:', perms);
    
    // Check current state - are all permissions selected?
    const allChecked = perms.every(p => {
      const action = p.label?.toLowerCase() || p.action?.toLowerCase() || '';
      console.log('Checking permission:', action, 'current value:', permissions[module]?.[action]);
      return permissions[module]?.[action];
    });
    
    console.log('All checked:', allChecked);
    
    setPermissions(prev => {
      const newModulePerms = perms.reduce((acc, p) => {
        const action = p.label?.toLowerCase() || p.action?.toLowerCase() || '';
        acc[action] = !allChecked; // If all were checked, uncheck all. If not all were checked, check all.
        console.log('Setting', action, 'to', !allChecked);
        return acc;
      }, {} as Record<string, boolean>);
      
      return {
        ...prev,
        [module]: newModulePerms
      };
    });
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSave called with event:', e);
    console.log('Current state - description:', description);
    console.log('Current state - permissions:', permissions);
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
        showNotification({
          type: 'success',
          title: 'Succès',
          message: 'Le rôle a été mis à jour avec succès!',
          duration: 4000
        })
        onClose()
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          title: 'Erreur',
          message: error.message || 'Une erreur est survenue lors de la mise à jour',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error saving role:', error)
      showNotification({
        type: 'error',
        title: 'Erreur de connexion',
        message: 'Impossible de sauvegarder les modifications. Veuillez vérifier votre connexion.',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-violet-500/10 dark:shadow-violet-900/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-r from-violet-50/50 to-white dark:from-violet-900/10 dark:to-gray-800 rounded-t-3xl">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Modifier le rôle</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm pl-11">Modifiez les informations et permissions du rôle</p>
          </div>
          <button 
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 transform hover:scale-110" 
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form className="p-6 md:p-8 space-y-8" onSubmit={handleSave}>
          {/* Informations générales */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-800/50 rounded-2xl p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1.5 h-6 bg-violet-600 rounded-full"></div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Informations générales</h3>
            </div>
            
            <div>
              <label className="block text-gray-800 dark:text-gray-200 text-sm font-bold mb-2 flex items-center gap-1">
                Nom du rôle <span className="text-red-500 text-base">*</span>
              </label>
              <div className="relative">
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-not-allowed font-medium"
                  value={role.name}
                  disabled
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-800 dark:text-gray-200 text-sm font-bold mb-2">Description</label>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 min-h-[60px] bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 resize-none"
                placeholder="Décrivez brièvement ce rôle..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Permissions par module */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-violet-600 rounded-full"></div>
              <h3 className="text-lg font-bold text-violet-600 dark:text-violet-400">Permissions par module</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {role.modules && role.modules.map((module: any, idx: number) => {
                const moduleName = module.title.toLowerCase()
                const hasPermissions = module.permissions?.base?.length > 0 || module.permissions?.advanced?.length > 0
                
                return (
                  <div 
                    key={idx}
                    className={`rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-lg ${
                      module.badge 
                        ? 'bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/30 border-violet-200 dark:border-violet-700 hover:border-violet-300 dark:hover:border-violet-600' 
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                        <span className="font-bold text-gray-900 dark:text-white text-lg">{module.title}</span>
                        {module.badge && (
                          <span className="px-3 py-1 bg-violet-200 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs rounded-full font-bold uppercase tracking-wide">
                            {module.badge}
                          </span>
                        )}
                      </div>
                      {hasPermissions && (
                        <button 
                          type="button" 
                          onClick={() => {
                            console.log('Tout sélectionner button clicked');
                            console.log('Module name:', moduleName);
                            console.log('Base perms:', module.permissions?.base);
                            console.log('Advanced perms:', module.permissions?.advanced);
                            const allPerms = [...(module.permissions?.base || []), ...(module.permissions?.advanced || [])];
                            console.log('All perms to toggle:', allPerms);
                            handleSelectAll(moduleName, allPerms);
                          }}
                          className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline font-medium transition-colors duration-200"
                        >
                          Tout sélectionner
                        </button>
                      )}
                    </div>
                    
                    {/* Base Permissions */}
                    {module.permissions?.base && module.permissions.base.length > 0 && (
                      <>
                        <div className="mb-3">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-3">
                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Permissions de base</span>
                          </div>
                        </div>
                        <div className="space-y-3 mb-4">
                          {module.permissions.base.map((perm: any, permIdx: number) => {
                            const permKey = perm.label?.toLowerCase() || perm.action?.toLowerCase() || '';
                            const isChecked = permissions[moduleName]?.[permKey] || false;
                            return (
                              <label 
                                key={permIdx} 
                                className="flex items-center gap-4 cursor-pointer group relative"
                                onClick={(e) => {
                                  e.preventDefault();
                                  console.log('Base permission clicked:', permKey);
                                  handlePermissionChange(moduleName, permKey);
                                }}
                              >
                                {/* Main checkbox container with glass effect */}
                                <div className={`relative w-8 h-8 rounded-2xl flex items-center justify-center transition-all duration-500 transform group-hover:scale-105 ${
                                  isChecked 
                                    ? 'bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 shadow-[0_10px_30px_-5px_rgba(139,92,246,0.4)] ring-2 ring-violet-400/50' 
                                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] group-hover:border-violet-300/70 group-hover:shadow-[0_8px_25px_-3px_rgba(139,92,246,0.2)]'
                                }`}>
                                  
                                  {/* Inner glow effect */}
                                  <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                                    isChecked 
                                      ? 'bg-white/20 scale-100 opacity-100' 
                                      : 'bg-violet-500/0 scale-75 opacity-0 group-hover:opacity-20'
                                  }`}></div>
                                  
                                  {/* Floating particles effect when checked */}
                                  {isChecked && (
                                    <>
                                      {[...Array(3)].map((_, i) => (
                                        <div 
                                          key={i}
                                          className="absolute w-1 h-1 bg-white/40 rounded-full animate-pulse"
                                          style={{
                                            top: `${20 + i * 15}%`,
                                            left: `${15 + i * 20}%`,
                                            animationDelay: `${i * 0.2}s`
                                          }}
                                        ></div>
                                      ))}
                                    </>
                                  )}
                                  
                                  {/* Morphing checkmark with advanced animation */}
                                  {isChecked && (
                                    <div className="absolute inset-0 flex items-center justify-center animate-morph-in">
                                      <div className="relative">
                                        <svg className="w-5 h-5 text-white drop-shadow-lg filter brightness-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {/* Glow effect around checkmark */}
                                        <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse"></div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Preview indicator with morphing effect */}
                                  {!isChecked && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg animate-pulse"></div>
                                    </div>
                                  )}
                                  
                                  {/* Ripple effect circle */}
                                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-active:border-violet-400/60 transition-all duration-200 group-active:scale-110"></div>
                                </div>
                                
                                {/* Label with creative connection */}
                                <div className="relative flex-1">
                                  <span className={`text-lg transition-all duration-300 relative z-10 ${
                                    isChecked 
                                      ? 'text-gray-900 dark:text-white font-bold tracking-wide' 
                                      : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300'
                                  } capitalize`}>
                                    {perm.label}
                                  </span>
                                  
                                  {/* Animated underline connector */}
                                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-500 origin-left ${
                                    isChecked 
                                      ? 'w-full scale-x-100' 
                                      : 'w-0 group-hover:w-1/2 scale-x-0 group-hover:scale-x-100'
                                  }`}></div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {/* Advanced Permissions */}
                    {module.permissions?.advanced && module.permissions.advanced.length > 0 && (
                      <>
                        <div className="mb-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-3">
                            <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Permissions avancées</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {module.permissions.advanced.map((perm: any, permIdx: number) => {
                            const permKey = perm.label?.toLowerCase() || perm.action?.toLowerCase() || '';
                            const isChecked = permissions[moduleName]?.[permKey] || false;
                            return (
                              <label 
                                key={permIdx} 
                                className="flex items-center gap-4 cursor-pointer group relative"
                                onClick={(e) => {
                                  e.preventDefault();
                                  console.log('Advanced permission clicked:', permKey);
                                  handlePermissionChange(moduleName, permKey);
                                }}
                              >
                                {/* Premium checkbox with advanced glassmorphism */}
                                <div className={`relative w-8 h-8 rounded-2xl flex items-center justify-center transition-all duration-500 transform group-hover:scale-105 ${
                                  isChecked 
                                    ? 'bg-gradient-to-br from-violet-600 via-violet-700 to-violet-800 shadow-[0_12px_35px_-6px_rgba(124,58,237,0.5)] ring-2 ring-violet-500/60' 
                                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] group-hover:border-violet-400/70 group-hover:shadow-[0_8px_25px_-3px_rgba(124,58,237,0.3)]'
                                }`}>
                                  
                                  {/* Dynamic inner lighting */}
                                  <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                                    isChecked 
                                      ? 'bg-white/25 scale-100 opacity-100' 
                                      : 'bg-violet-600/0 scale-75 opacity-0 group-hover:opacity-25'
                                  }`}></div>
                                  
                                  {/* Quantum particle system when active */}
                                  {isChecked && (
                                    <>
                                      {[...Array(4)].map((_, i) => (
                                        <div 
                                          key={i}
                                          className="absolute w-1.5 h-1.5 bg-white/50 rounded-full animate-ping"
                                          style={{
                                            top: `${10 + i * 20}%`,
                                            left: `${10 + (i % 2) * 30}%`,
                                            animationDelay: `${i * 0.15}s`,
                                            animationDuration: '1.5s'
                                          }}
                                        ></div>
                                      ))}
                                    </>
                                  )}
                                  
                                  {/* Holographic checkmark with depth */}
                                  {isChecked && (
                                    <div className="absolute inset-0 flex items-center justify-center animate-morph-in">
                                      <div className="relative transform rotate-3">
                                        <svg className="w-5 h-5 text-white drop-shadow-xl filter brightness-125" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {/* Holographic glow layers */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-violet-300/30 rounded-full blur-sm animate-pulse"></div>
                                        <div className="absolute -inset-1 bg-violet-400/20 rounded-full blur-md animate-pulse" style={{animationDelay: '0.3s'}}></div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Sophisticated hover preview */}
                                  {!isChecked && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 shadow-xl animate-pulse"></div>
                                    </div>
                                  )}
                                  
                                  {/* Interactive ripple feedback */}
                                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-active:border-violet-500/70 transition-all duration-200 group-active:scale-110"></div>
                                </div>
                                
                                {/* Enhanced label with premium typography */}
                                <div className="relative flex-1">
                                  <span className={`text-lg transition-all duration-300 relative z-10 ${
                                    isChecked 
                                      ? 'text-gray-900 dark:text-white font-extrabold tracking-wider' 
                                      : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300'
                                  } capitalize`}>
                                    {perm.label}
                                  </span>
                                  
                                  {/* Premium animated underline */}
                                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-violet-600 via-violet-500 to-violet-400 transition-all duration-500 origin-left ${
                                    isChecked 
                                      ? 'w-full scale-x-100 shadow-lg shadow-violet-500/30' 
                                      : 'w-0 group-hover:w-2/3 scale-x-0 group-hover:scale-x-100'
                                  }`}></div>
                                </div>
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
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                console.log('Submit button clicked, saving state:', saving);
                if (saving) {
                  console.log('Button is disabled, cannot click');
                  return;
                }
                console.log('Calling handleSave');
                handleSave(e);
              }}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 text-white font-bold hover:from-violet-700 hover:to-violet-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}