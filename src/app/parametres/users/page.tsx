"use client"
import { useEffect, useState } from "react"
import { User, Edit3, Trash2, RefreshCw, Mail, Phone, Filter, LayoutGrid, List, Search, UserPlus, Briefcase } from "lucide-react"
import AddUserModal from "@/components/users/AddUserModal"
import EditUserModal from "@/components/users/EditUserModal"
import ConfirmationModal from "@/components/ui/ConfirmationModal"
import UserDossierModal from "@/components/users/UserDossierModal"
import { usePermissions } from "@/contexts/PermissionsContext"
import { useNotification } from "@/contexts/NotificationContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { getSafeImageSrc } from "@/lib/utils"

// Role configurations with colors and translations
const roleConfig: Record<string, { gradient: string; bg: string; text: string; border: string; icon: string }> = {
  SUPER_ADMIN: { 
    gradient: 'from-red-500 to-orange-500', 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    icon: '👑'
  },
  RH: { 
    gradient: 'from-blue-500 to-indigo-500', 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: '💼'
  },
  USER: { 
    gradient: 'from-green-500 to-emerald-500', 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: '👤'
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showDossierModal, setShowDossierModal] = useState(false)
  const { hasPermission } = usePermissions()
  const { showNotification } = useNotification()
  const { language } = useLanguage()

  const isRTL = language === 'ar'

  const canAdd = hasPermission('parametres', 'ADD')
  const canEdit = hasPermission('parametres', 'EDIT')
  const canDelete = hasPermission('parametres', 'DELETE')

  // Translations
  const t = {
    title: { fr: 'Gestion des Utilisateurs', en: 'User Management', ar: 'إدارة المستخدمين' },
    subtitle: { fr: 'Gérez les comptes utilisateurs et leurs permissions', en: 'Manage user accounts and their permissions', ar: 'إدارة حسابات المستخدمين وصلاحياتهم' },
    search: { fr: 'Rechercher un utilisateur...', en: 'Search for a user...', ar: 'البحث عن مستخدم...' },
    addUser: { fr: 'Ajouter', en: 'Add User', ar: 'إضافة مستخدم' },
    allRoles: { fr: 'Tous les rôles', en: 'All Roles', ar: 'جميع الأدوار' },
    users: { fr: 'utilisateurs', en: 'users', ar: 'مستخدم' },
    viewProfile: { fr: 'Voir le profil', en: 'View Profile', ar: 'عرض الملف الشخصي' },
    edit: { fr: 'Modifier', en: 'Edit', ar: 'تعديل' },
    delete: { fr: 'Supprimer', en: 'Delete', ar: 'حذف' },
    noPhoto: { fr: 'Pas de photo', en: 'No photo', ar: 'لا توجد صورة' },
    validated: { fr: 'Validé', en: 'Validated', ar: 'مصادق عليه' },
    pending: { fr: 'En attente', en: 'Pending', ar: 'في انتظار' },
    refresh: { fr: 'Actualiser', en: 'Refresh', ar: 'تحديث' },
    loadError: { fr: 'Erreur de chargement', en: 'Loading error', ar: 'خطأ في التحميل' },
    loadErrorMsg: { fr: 'Impossible de charger la liste des utilisateurs', en: 'Unable to load users list', ar: 'تعذر تحميل قائمة المستخدمين' }
  }
  const getText = (key: keyof typeof t) => t[key][language as keyof typeof t.title] || t[key].fr

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setUsers(data)
      } else {
        console.error("API response is not an array:", data)
        setUsers([])
      }
    } catch (err) {
      console.error("Error fetching users:", err)
      setUsers([])
      showNotification({
        type: 'error',
        title: getText('loadError'),
        message: getText('loadErrorMsg'),
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name + ' ' + u.email + ' ' + (u.nom || '') + ' ' + (u.prenom || '')).toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Get user photo with fallback
  const getUserPhoto = (user: any): string | null => {
    return getSafeImageSrc(user.photo) || getSafeImageSrc(user.image) || null
  }

  // Get user initials for avatar
  const getInitials = (user: any): string => {
    const first = user.prenom?.[0] || user.name?.[0] || ''
    const last = user.nom?.[0] || user.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'U'
  }

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      const response = await fetch(`/api/users/${userToDelete}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userToDelete))
        showNotification({
          type: 'success',
          title: 'Utilisateur supprimé',
          message: 'L\'utilisateur a été supprimé avec succès',
          duration: 4000
        })
      } else {
        try {
          const error = await response.json()
          showNotification({
            type: 'error',
            title: 'Erreur de suppression',
            message: error.message || 'Impossible de supprimer l\'utilisateur',
            duration: 5000
          })
        } catch {
          showNotification({
            type: 'error',
            title: 'Erreur de suppression',
            message: 'Impossible de supprimer l\'utilisateur',
            duration: 5000
          })
        }
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      showNotification({
        type: 'error',
        title: 'Erreur de connexion',
        message: 'Impossible de supprimer l\'utilisateur. Veuillez vérifier votre connexion.',
        duration: 5000
      })
    } finally {
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    }
  }

  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false)
    setUserToDelete(null)
  }

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleShowDossier = (user: any) => {
    setSelectedUser(user)
    setShowDossierModal(true)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {getText('title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{getText('subtitle')}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Stats badge */}
              <div className="px-4 py-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <span className="text-violet-700 dark:text-violet-300 font-bold">{filteredUsers.length}</span>
                <span className="text-violet-600 dark:text-violet-400 ml-1">{getText('users')}</span>
              </div>
              
              {/* Refresh button */}
              <button 
                onClick={fetchUsers}
                disabled={loading}
                className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all"
                title={getText('refresh')}
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              {canAdd && (
                <button 
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  onClick={() => setShowAddModal(true)}
                >
                  <UserPlus className="w-5 h-5" />
                  {getText('addUser')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder={getText('search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3">
              {/* Role Filter */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{getText('allRoles')}</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="RH">RH</option>
                  <option value="USER">Utilisateur</option>
                </select>
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
            </div>
          </div>
        )}

        {/* Grid View */}
        {!loading && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user) => {
              const config = roleConfig[user.role] || roleConfig.USER
              const photoSrc = getUserPhoto(user)
              
              return (
                <div
                  key={user.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 ${config.border} overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer`}
                  onClick={() => user.hasEmployeeProfile && handleShowDossier(user)}
                >
                  {/* Card Header with gradient */}
                  <div className={`h-20 bg-gradient-to-r ${config.gradient} relative`}>
                    {/* Role badge */}
                    <div className={`absolute top-3 right-3 px-3 py-1 bg-white/90 dark:bg-gray-800/90 rounded-full text-xs font-bold ${config.text} flex items-center gap-1`}>
                      <span>{config.icon}</span>
                      {user.role}
                    </div>
                    
                    {/* Status badge */}
                    {user.statut && (
                      <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                        user.statut === 'APPROUVE' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-yellow-500 text-white'
                      }`}>
                        {user.statut === 'APPROUVE' ? '✓' : '⏳'}
                      </div>
                    )}
                  </div>
                  
                  {/* Photo */}
                  <div className="flex justify-center -mt-12 px-6">
                    {photoSrc ? (
                      <img 
                        src={photoSrc}
                        alt={`${user.name || user.prenom}`}
                        className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-gray-800 shadow-lg group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-24 h-24 rounded-2xl ${config.bg} flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg group-hover:scale-105 transition-transform ${photoSrc ? 'hidden' : ''}`}>
                      <span className={`text-3xl font-bold ${config.text}`}>{getInitials(user)}</span>
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="p-6 pt-4 text-center">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                      {user.prenom || user.name} {user.nom || user.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1 flex items-center justify-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </p>
                    
                    {user.telephone && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                        <Phone className="w-4 h-4" />
                        {user.telephone}
                      </p>
                    )}
                    
                    {user.typeContrat && (
                      <div className={`inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        <Briefcase className="w-3 h-3" />
                        {user.typeContrat}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="px-6 pb-6 flex justify-center gap-2">
                    {user.hasEmployeeProfile && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShowDossier(user) }}
                        className="px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors flex items-center gap-1"
                      >
                        <User className="w-4 h-4" />
                        {getText('viewProfile')}
                      </button>
                    )}
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditUser(user) }}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                        title={getText('edit')}
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id) }}
                        className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                        title={getText('delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">#</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Photo</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Nom</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Email</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Rôle</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Contrat</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => {
                    const config = roleConfig[user.role] || roleConfig.USER
                    const photoSrc = getUserPhoto(user)
                    
                    return (
                      <tr 
                        key={user.id} 
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-all cursor-pointer"
                        onClick={() => user.hasEmployeeProfile && handleShowDossier(user)}
                      >
                        <td className="py-4 px-6 text-sm font-mono text-gray-500">#{idx + 1}</td>
                        <td className="py-4 px-6">
                          {photoSrc ? (
                            <img src={photoSrc} alt="" className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                              <span className={`font-bold ${config.text}`}>{getInitials(user)}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                          {user.prenom || user.name} {user.nom || user.last_name}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
                            {config.icon} {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                          {user.typeContrat || '-'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {user.hasEmployeeProfile && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleShowDossier(user) }}
                                className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200"
                                title={getText('viewProfile')}
                              >
                                <User className="w-4 h-4" />
                              </button>
                            )}
                            {canEdit && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditUser(user) }}
                                className="p-2 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/20 text-violet-600"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id) }}
                                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Aucun utilisateur trouvé</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>

      {/* Dossier complet modal */}
      {showDossierModal && selectedUser && (
        <UserDossierModal
          user={selectedUser}
          onClose={() => {
            setShowDossierModal(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSave={(newUser) => {
            setUsers([...users, newUser])
            setShowAddModal(false)
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSave={(updatedUser) => {
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
            setShowEditModal(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmationModal
          title="Supprimer l'utilisateur"
          message="Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible."
          confirmText="Supprimer"
          cancelText="Annuler"
          type="danger"
          onConfirm={confirmDeleteUser}
          onCancel={cancelDeleteUser}
        />
      )}
    </div>
  )
}