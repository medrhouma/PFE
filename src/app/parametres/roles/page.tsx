"use client"
import { useState } from "react"
import { FiEdit2 } from "react-icons/fi"
import RoleEditModal from "@/components/roles/RoleEditModal"

const FAKE_ROLES = [
  { id: 1, name: "User", description: "Utilisateur standard", permissions: { /* ... */ } },
  { id: 2, name: "Super Admin", description: "Tous les accès", permissions: { /* ... */ } },
]

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex">
      {/* Sidebar ici */}
      <div className="w-64 bg-white border-r flex flex-col py-8 px-4">
        <div className="text-2xl font-bold text-violet-600 mb-10">Santec AI</div>
        <nav>
          <div className="mb-4">
            <div className="uppercase text-gray-500 text-xs mb-1">PARAMÈTRES</div>
            <a href="/parametres/users" className="block font-medium text-gray-700 hover:bg-gray-50 px-4 py-2 rounded">Utilisateurs</a>
            <a href="/parametres/roles" className="block font-semibold text-violet-700 bg-violet-50 px-4 py-2 rounded mb-2">Rôles</a>
          </div>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 p-8">
        <h1 className="text-xl font-bold mb-6">Gestion des rôles</h1>
        <div className="bg-white rounded-2xl p-4 border">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="py-2 px-2 font-semibold">Nom</th>
                <th className="py-2 px-2 font-semibold">Description</th>
                <th className="py-2 px-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {FAKE_ROLES.map((role) => (
                <tr key={role.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">{role.name}</td>
                  <td className="py-2 px-2">{role.description}</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => {setSelectedRole(role); setModalOpen(true)}}
                      className="p-2 rounded hover:bg-violet-50 text-violet-600 flex items-center gap-1"
                      title="Modifier le rôle"
                    >
                      <FiEdit2 /> Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale éditer */}
      {modalOpen && (
        <RoleEditModal
          role={selectedRole}
          onClose={() => setModalOpen(false)}
          // sauvegarder .
        />
      )}
    </div>
  )
}