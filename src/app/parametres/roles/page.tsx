"use client"
import { useState, useEffect } from "react"
import { RoleCard } from "@/components/roles/RoleCard"
import RoleEditModal from "@/components/roles/RoleEditModal"
import { usePermissions } from "@/contexts/PermissionsContext"
import { Shield, Users, Search, RefreshCw } from "lucide-react"

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { hasPermission } = usePermissions()

  const canEdit = hasPermission('parametres', 'EDIT')

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/roles-db')
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleUpdated = () => {
    fetchRoles()
  }

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats
  const totalPermissions = roles.reduce((acc, role) => {
    const count = role.modules?.reduce((mAcc: number, mod: any) => {
      return mAcc + (mod.permissions?.base?.filter((p: any) => p.checked)?.length || 0) + (mod.permissions?.advanced?.filter((p: any) => p.checked)?.length || 0)
    }, 0) || 0
    return acc + count
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-violet-700 dark:from-violet-700 dark:to-violet-800 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Gestion des rôles</h1>
                  <p className="text-violet-200 text-sm mt-1">Configurez les permissions et accès pour chaque rôle</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchRoles}
                  disabled={loading}
                  className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all duration-200 disabled:opacity-50"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="px-6 md:px-8 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{roles.length}</span> rôles configurés
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{totalPermissions}</span> permissions actives
              </span>
            </div>
            <div className="ml-auto relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un rôle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all w-48 md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-violet-200 dark:border-violet-900/30 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-violet-600 dark:border-violet-400 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-400">Chargement des rôles...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Aucun rôle trouvé</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm ? "Essayez avec d'autres termes de recherche" : "Aucun rôle n'est configuré"}
            </p>
          </div>
        ) : (
          /* Roles Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRoles.map((role, index) => (
              <div 
                key={role.id}
                className="transform transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <RoleCard
                  roleName={role.name}
                  description={role.description}
                  modules={role.modules}
                  onEdit={canEdit ? () => {
                    setSelectedRole(role)
                    setModalOpen(true)
                  } : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {modalOpen && selectedRole && (
        <RoleEditModal
          role={selectedRole}
          onClose={() => {
            setModalOpen(false)
            setSelectedRole(null)
          }}
          onSave={handleRoleUpdated}
        />
      )}
    </div>
  )
}