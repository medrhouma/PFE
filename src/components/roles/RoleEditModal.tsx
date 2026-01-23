import { useState } from "react"
import { FiX } from "react-icons/fi"

export default function RoleEditModal({ role, onClose }: { role: any; onClose: () => void }) {
  const [name, setName] = useState(role.name)
  const [desc, setDesc] = useState(role.description)
  // Ici tu gères permissions
  const [permissions, setPermissions] = useState(role.permissions || {})

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative animate-fadein">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">🔒 Modifier le rôle</h2>
            <p className="text-gray-500 text-sm mt-1">Modifiez les informations et permissions du rôle</p>
          </div>
          <button className="text-gray-400 hover:text-red-500 text-xl" onClick={onClose}><FiX /></button>
        </div>

        <form className="p-6 space-y-6" onSubmit={e => {e.preventDefault(); /* handle save */}}>
          {/* Informations générales */}
          <div className="bg-[#f7fafd] rounded-lg p-5 space-y-2">
            <label className="block text-gray-700 text-sm font-bold">Nom du rôle *</label>
            <input className="w-full border rounded-lg p-2" value={name} onChange={e => setName(e.target.value)} />
            <label className="block text-gray-700 text-sm font-bold mt-2">Description</label>
            <textarea className="w-full border rounded-lg p-2 min-h-[56px]" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          {/* Permissions par module (exemple statique) */}
          <div>
            <label className="text-sm font-bold text-violet-600">Permissions par module</label>
            <div className="grid grid-cols-2 gap-5 mt-2">
              <div className="bg-gray-50 rounded-xl border p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-violet-700">Profils</span>
                  <button className="text-xs underline">Tout sélectionner</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" className="accent-violet-500" /> Ajouter
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" className="accent-violet-500" /> Modifier
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" className="accent-violet-500" /> Supprimer
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" className="accent-violet-500" /> Voir
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" className="accent-violet-400" /> Activation
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" className="accent-violet-400" /> Validation
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" className="accent-violet-400" /> Vérification
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" className="accent-violet-400" /> Traiter
                  </label>
                </div>
              </div>
              {/* Ajoute des modules Newsletter, Traitement, etc. comme sur ton image... */}
              <div className="bg-gray-50 rounded-xl border p-4">Module Newsletter ...</div>
              <div className="bg-gray-50 rounded-xl border p-4">Traitement Daemon ...</div>
              <div className="bg-gray-50 rounded-xl border p-4">Paramètres ...</div>
            </div>
          </div>
          {/* Footer */}
          <div className="flex mt-8 justify-end gap-3">
            <button type="button" className="px-5 py-2 rounded-lg border" onClick={onClose}>Annuler</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700">Enregistrer les modifications</button>
          </div>
        </form>
      </div>
    </div>
  )
}