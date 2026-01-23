"use client"
import { useEffect, useState } from "react"
import { FiUser, FiEdit3, FiTrash2, FiRefreshCcw } from "react-icons/fi"
import AddUserModal from "@/components/users/AddUserModal"
import EditUserModal from "@/components/users/EditUserModal"

function UserProviderBadges({ providers = [] }: { providers: string[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {providers.map((p, i) => (
        <span key={i}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5
            ${p === "Google" 
              ? "border-blue-200 text-blue-700 bg-blue-50" 
              : "border-gray-200 text-gray-700 bg-gray-50"}
          `}>
          {p === "Google" ? (
            <svg width="14" height="14" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  const [selectedUser, setSelectedUser] = useState<any>(null)

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data)
        } else {
          console.error("API response is not an array:", data)
          setUsers([])
        }
      })
      .catch(err => {
        console.error("Error fetching users:", err)
        setUsers([])
      })
  }, [])

  const filteredUsers = users.filter(u =>
    (u.name + ' ' + (u.last_name || '') + u.email).toLowerCase().includes(search.toLowerCase())
  )

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId))
        alert("Utilisateur supprimé avec succès!")
      } else {
        const error = await response.json()
        alert(error.message || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Erreur lors de la suppression de l'utilisateur")
    }
  }

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] dark:bg-gray-900">
      {/* Main Content */}
      <div className="p-8">
        {/* Top Section with Title and Button */}
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl border border-gray-200 dark:border-gray-700 border-b-0 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="border-b-2 border-blue-600 pb-3">
              <h2 className="text-base font-semibold text-blue-600">Users</h2>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New User
            </button>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="bg-white dark:bg-gray-800 border-x border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="relative max-w-md">
            <input
              className="w-full pl-10 pr-20 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Recherche"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg
              className="absolute left-3 top-3 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <kbd className="absolute right-3 top-2.5 px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-500 rounded">
              ⌘ K
            </kbd>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-b-2xl border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">Last_Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">Provider</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => (
                  <tr key={user.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                    <td className="py-3.5 px-4 text-sm text-gray-900 dark:text-gray-100">{idx + 1}</td>
                    <td className="py-3.5 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{user.name || '-'}</td>
                    <td className="py-3.5 px-4 text-sm text-gray-900 dark:text-gray-100">{user.last_name || '-'}</td>
                    <td className="py-3.5 px-4 text-sm text-gray-700 dark:text-gray-300">{user.email}</td>
                    <td className="py-3.5 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{user.role}</td>
                    <td className="py-3.5 px-4">
                      <UserProviderBadges providers={user.providers || ["Credentials"]} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors" 
                          title="Modifier"
                        >
                          <FiEdit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors" 
                          title="Supprimer"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Page actuelle</span>
                <input 
                  value={page} 
                  readOnly 
                  className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  Previous
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg">
                  1
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  Next
                </button>
              </div>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total Users : <span className="font-semibold text-gray-900 dark:text-white">{filteredUsers.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  )
}