"use client"
import { useEffect, useState } from "react"
import { FiUser, FiEdit3, FiTrash2, FiRefreshCcw } from "react-icons/fi"
import AddUserModal from "@/components/users/AddUserModal"
import EditUserModal from "@/components/users/EditUserModal"
import ConfirmationModal from "@/components/ui/ConfirmationModal"
import UserDossierModal from "@/components/users/UserDossierModal"
import { usePermissions } from "@/contexts/PermissionsContext"
import { useNotification } from "@/contexts/NotificationContext"

function UserProviderBadges({ providers = [] }: { providers: string[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {providers.map((p, i) => (
        <span key={i}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all duration-200
            ${p === "Google" 
              ? "bg-gradient-to-r from-red-100 to-yellow-100 dark:from-red-900/20 dark:to-yellow-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50" 
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"}
          `}>
          {p === "Google" ? (
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          )}
          {p}
        </span>
      ))}
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showDossierModal, setShowDossierModal] = useState(false)
  const { hasPermission, loading } = usePermissions()
  const { showNotification } = useNotification()

  const canAdd = hasPermission('parametres', 'ADD')
  const canEdit = hasPermission('parametres', 'EDIT')
  const canDelete = hasPermission('parametres', 'DELETE')

  useEffect(() => {
    const fetchUsers = async () => {
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
          title: 'Erreur de chargement',
          message: 'Impossible de charger la liste des utilisateurs',
          duration: 5000
        })
      }
    }
    
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(u =>
    (u.name + ' ' + (u.last_name || '') + u.email).toLowerCase().includes(search.toLowerCase())
  )

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
                  <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 ml-11">Gérez les comptes utilisateurs et leurs permissions</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full font-medium">
                {filteredUsers.length} utilisateurs
              </span>
            </div>
            {canAdd && (
              <button 
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowAddModal(true)}
                disabled={!canAdd}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un utilisateur
              </button>
            )}
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="relative max-w-md">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              className="w-full pl-12 pr-24 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <kbd className="px-2.5 py-1 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg">
                ⌘ K
              </kbd>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">ID</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Prénom</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Nom</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Rôle</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Authentification</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => (
                  <tr key={user.id || `user-${idx}`} className="border-b border-gray-100 dark:border-gray-700 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-all duration-200 group">
                    <td className="py-4 px-6 text-sm font-mono text-gray-500 dark:text-gray-400">#{idx + 1}</td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{user.name || '-'}</td>
                    <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-200">{user.last_name || '-'}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300 font-mono">{user.email}</td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-full">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <UserProviderBadges providers={user.providers || ["Credentials"]} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {user.statut === 'APPROUVE' && (
                          <button
                            onClick={() => handleShowDossier(user)}
                            className="p-2 rounded-lg bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-900/10 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30 transition-all duration-200 transform hover:scale-105"
                            title="Voir le dossier complet"
                          >
                            <FiUser className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-2 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/20 text-violet-600 dark:text-violet-400 transition-all duration-200 transform hover:scale-105" 
                            title="Modifier"
                            disabled={!canEdit}
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-all duration-200 transform hover:scale-105" 
                            title="Supprimer"
                            disabled={!canDelete}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Lecture seule</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Page</span>
                  <input 
                    value={page} 
                    readOnly 
                    className="w-12 px-3 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium"
                  />
                </div>
                <span className="text-gray-400">•</span>
                <span>Total: <span className="font-bold text-violet-600 dark:text-violet-400">{filteredUsers.length}</span> utilisateurs</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-sm">
                  Précédent
                </button>
                <button className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-violet-700 border border-violet-600 rounded-lg shadow-sm">
                  1
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-sm">
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </div>
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