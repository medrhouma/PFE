"use client"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Search, RefreshCw, Edit3, Trash2 } from "lucide-react"
import AddUserModal from "@/components/users/AddUserModal"
import EditUserModal from "@/components/users/EditUserModal"
import ConfirmationModal from "@/components/ui/ConfirmationModal"
import UserDossierModal from "@/components/users/UserDossierModal"
import { usePermissions } from "@/contexts/PermissionsContext"
import { useNotification } from "@/contexts/NotificationContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { getSafeImageSrc } from "@/lib/utils"

/* ─── Role styling ─── */
const roleBadge: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  RH:          { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  USER:        { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:    { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Actif' },
  PENDING:   { bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-400',    label: 'En attente' },
  INACTIVE:  { bg: 'bg-gray-100 dark:bg-gray-800',          text: 'text-gray-600 dark:text-gray-400',       label: 'Inactif' },
  REJECTED:  { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-700 dark:text-red-400',         label: 'Rejeté' },
  SUSPENDED: { bg: 'bg-orange-100 dark:bg-orange-900/30',   text: 'text-orange-700 dark:text-orange-400',   label: 'Suspendu' },
}

const ROWS_PER_PAGE = 15

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
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

  const t = {
    title: { fr: 'Gestion des Utilisateurs', en: 'User Management', ar: 'إدارة المستخدمين' },
    subtitle: { fr: 'Liste complète des comptes utilisateurs', en: 'Complete list of user accounts', ar: 'القائمة الكاملة لحسابات المستخدمين' },
    search: { fr: 'Rechercher par nom ou email...', en: 'Search by name or email...', ar: 'البحث بالاسم أو البريد...' },
    addUser: { fr: '+ Ajouter', en: '+ Add User', ar: '+ إضافة مستخدم' },
    allRoles: { fr: 'Tous les rôles', en: 'All Roles', ar: 'جميع الأدوار' },
    allStatuses: { fr: 'Tous les statuts', en: 'All Statuses', ar: 'جميع الحالات' },
    refresh: { fr: 'Actualiser', en: 'Refresh', ar: 'تحديث' },
    loadError: { fr: 'Erreur de chargement', en: 'Loading error', ar: 'خطأ في التحميل' },
    loadErrorMsg: { fr: 'Impossible de charger la liste des utilisateurs', en: 'Unable to load users list', ar: 'تعذر تحميل قائمة المستخدمين' },
  }
  const getText = (key: keyof typeof t) => t[key][language as keyof typeof t.title] || t[key].fr

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching users:", err)
      setUsers([])
      showNotification({ type: 'error', title: getText('loadError'), message: getText('loadErrorMsg'), duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  /* ─── Filters ─── */
  const filteredUsers = users.filter(u => {
    const text = (u.name + ' ' + u.email + ' ' + (u.nom || '') + ' ' + (u.prenom || '')).toLowerCase()
    if (!text.includes(search.toLowerCase())) return false
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false
    return true
  })

  // reset page when filter changes
  useEffect(() => { setPage(1) }, [search, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE))
  const paged = filteredUsers.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const getUserPhoto = (user: any): string | null =>
    getSafeImageSrc(user.photo) || getSafeImageSrc(user.image) || null

  const getInitials = (user: any): string => {
    const first = user.prenom?.[0] || user.name?.[0] || ''
    const last = user.nom?.[0] || user.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'U'
  }

  /* ─── Handlers ─── */
  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    try {
      const response = await fetch(`/api/users/${userToDelete}`, { method: "DELETE" })
      if (response.ok) {
        setUsers(users.filter(u => u.id !== userToDelete))
        showNotification({ type: 'success', title: 'Utilisateur supprimé', message: "L'utilisateur a été supprimé avec succès", duration: 4000 })
      } else {
        const error = await response.json().catch(() => ({}))
        showNotification({ type: 'error', title: 'Erreur de suppression', message: error.message || "Impossible de supprimer l'utilisateur", duration: 5000 })
      }
    } catch {
      showNotification({ type: 'error', title: 'Erreur de connexion', message: "Impossible de supprimer l'utilisateur.", duration: 5000 })
    } finally {
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    }
  }

  const handleEditUser = (user: any) => { setSelectedUser(user); setShowEditModal(true) }
  const handleShowDossier = (user: any) => { setSelectedUser(user); setShowDossierModal(true) }

  /* ─── Counts by role ─── */
  const countByRole = (r: string) => users.filter(u => u.role === r).length

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 space-y-5">

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getText('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{getText('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title={getText('refresh')}
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canAdd && (
              <button
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                onClick={() => setShowAddModal(true)}
              >
                {getText('addUser')}
              </button>
            )}
          </div>
        </div>

        {/* ─── Filters bar ─── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getText('search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">{getText('allRoles')}</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="RH">RH</option>
                <option value="USER">Utilisateur</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">{getText('allStatuses')}</option>
                <option value="ACTIVE">Actif</option>
                <option value="PENDING">En attente</option>
                <option value="INACTIVE">Inactif</option>
                <option value="REJECTED">Rejeté</option>
                <option value="SUSPENDED">Suspendu</option>
              </select>

              {/* Role quick counts */}
              <div className="hidden lg:flex items-center gap-1.5 ml-2 text-xs">
                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">{users.length} total</span>
                <span className="px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium">{countByRole('SUPER_ADMIN')} Admin</span>
                <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">{countByRole('RH')} RH</span>
                <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium">{countByRole('USER')} User</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Loading ─── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {/* ─── Table ─── */}
        {!loading && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Utilisateur</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="text-center py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rôle</th>
                    <th className="text-center py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="text-center py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contrat</th>
                    <th className="text-left py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Téléphone</th>
                    <th className="text-center py-3 px-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <span className="text-3xl block mb-2">∅</span>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Modifiez vos filtres de recherche</p>
                      </td>
                    </tr>
                  ) : paged.map((user, idx) => {
                    const rBadge = roleBadge[user.role] || roleBadge.USER
                    const sBadge = statusBadge[user.status] || statusBadge.INACTIVE
                    const photoSrc = getUserPhoto(user)
                    const globalIdx = (page - 1) * ROWS_PER_PAGE + idx + 1

                    return (
                      <tr
                        key={user.id || `user-${idx}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        {/* # */}
                        <td className="py-3 px-4 text-xs font-mono text-gray-400">{globalIdx}</td>

                        {/* User name + avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-lg ${rBadge.bg} flex items-center justify-center flex-shrink-0`}>
                                <span className={`text-xs font-bold ${rBadge.text}`}>{getInitials(user)}</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {user.prenom || user.name} {user.nom || user.last_name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                          {user.email}
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${rBadge.bg} ${rBadge.text}`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${sBadge.bg} ${sBadge.text}`}>
                            {sBadge.label}
                          </span>
                        </td>

                        {/* Account type */}
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {user.hasEmployeeProfile ? 'Employé' : 'Compte'}
                          </span>
                        </td>

                        {/* Contract */}
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {user.typeContrat || '—'}
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {user.telephone || '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {user.hasEmployeeProfile && (
                              <button
                                onClick={() => handleShowDossier(user)}
                                className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              >
                                Dossier
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* ─── Pagination ─── */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredUsers.length === 0
                  ? 'Aucun résultat'
                  : `${(page - 1) * ROWS_PER_PAGE + 1}–${Math.min(page * ROWS_PER_PAGE, filteredUsers.length)} sur ${filteredUsers.length}`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`dots-${i}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                          p === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
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
          onCancel={() => { setShowDeleteConfirm(false); setUserToDelete(null) }}
        />
      )}
    </div>
  )
}