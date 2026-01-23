"use client"
import { useState, useEffect } from "react"
import { RoleCard } from "@/components/roles/RoleCard"
import RoleEditModal from "@/components/roles/RoleEditModal"
import { usePermissions } from "@/contexts/PermissionsContext"

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { hasPermission } = usePermissions()

  const canEdit = hasPermission('parametres', 'EDIT')

  // Fetch roles from database
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
      } else {
        console.error('Failed to fetch roles')
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleUpdated = () => {
    // Refresh roles list after update
    fetchRoles()
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Gestion des rôles</h1>
          <p className="text-gray-600 dark:text-gray-400">Configurez les permissions et accès pour chaque rôle</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des rôles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                roleName={role.name}
                description={role.description}
                modules={role.modules}
                onEdit={canEdit ? () => {
                  setSelectedRole(role)
                  setModalOpen(true)
                } : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale éditer */}
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