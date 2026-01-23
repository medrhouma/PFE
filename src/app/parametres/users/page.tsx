"use client"
import { useEffect, useState } from "react"
import { FiUser, FiPenTool, FiTrash2, FiRefreshCcw } from "react-icons/fi"

function UserProviderBadges({ providers = [] }: { providers: string[] }) {
  return (
    <div className="flex gap-2">
      {providers.map((p, i) => (
        <span key={i}
          className={`px-2 py-0.5 rounded-lg text-xs border flex items-center gap-1
            ${p === "Google" ? "border-blue-400 text-blue-600 bg-blue-50" : "border-gray-300 text-gray-700 bg-gray-100"}
          `}>
          {p === "Google" ? (
            <svg width="16" height="16" viewBox="0 0 24 24">
              <g>
                <path fill="#4285F4" d="M22.56 ..."/>
                {/* ... (raccourci, tu peux utiliser une icône Google ici) */}
              </g>
            </svg>
          ) : <FiUser className="w-4 h-4" />}
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

  useEffect(() => {
    // Remplace par ton API réelle !
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data))
  }, [])

  const filteredUsers = users.filter(u =>
    (u.name + u.last_name + u.email).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-[80vh] bg-[#F8FAFF] flex">
      {/* Sidebar (simplifiée) */}
      <div className="w-64 bg-white border-r flex flex-col py-8 px-4">
        <div className="text-2xl font-bold text-violet-600 mb-10">Santec AI</div>
        <nav>
          <div className="mb-4">
            <div className="uppercase text-gray-500 text-xs mb-1">PARAMÈTRES</div>
            <a href="/parametres/users" className="block font-semibold text-violet-700 bg-violet-50 px-4 py-2 rounded mb-2">Utilisateurs</a>
            <a href="/parametres/roles" className="block font-medium text-gray-700 hover:bg-gray-50 px-4 py-2 rounded">Rôles</a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Users</h1>
          <button className="bg-violet-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 ml-auto hover:bg-violet-700">
            <FiUser /> New User
          </button>
        </div>

        {/* Search / Refresh */}
        <div className="mb-6 flex items-center gap-2">
          <input
            className="border rounded-lg px-3 py-2 w-64 text-sm"
            placeholder="Recherche"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="rounded-lg border px-2 py-2 hover:bg-gray-50">
            <FiRefreshCcw />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl p-4 border">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="py-2 px-2 font-semibold">ID</th>
                <th className="py-2 px-2 font-semibold">Name</th>
                <th className="py-2 px-2 font-semibold">Last_Name</th>
                <th className="py-2 px-2 font-semibold">Email</th>
                <th className="py-2 px-2 font-semibold">Role</th>
                <th className="py-2 px-2 font-semibold">Provider</th>
                <th className="py-2 px-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">{user.id}</td>
                  <td className="py-2 px-2">{user.name}</td>
                  <td className="py-2 px-2">{user.last_name}</td>
                  <td className="py-2 px-2">{user.email}</td>
                  <td className="py-2 px-2">{user.role}</td>
                  <td className="py-2 px-2">
                    <UserProviderBadges providers={user.providers || ["Credentials"]} />
                  </td>
                  <td className="py-2 px-2 flex gap-2">
                    <button className="p-1 rounded hover:bg-gray-100 text-violet-700">
                      <FiPenTool />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100 text-red-500">
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm">Page actuelle <input value={page} readOnly className="mx-1 px-2 border rounded w-10 text-center"/></span>
            <div className="flex gap-2 items-center">
              <button className="px-3 py-1 border rounded-lg bg-white">Previous</button>
              <span className="px-3 py-1 border rounded-lg bg-violet-600 text-white">1</span>
              <button className="px-3 py-1 border rounded-lg bg-white">Next</button>
            </div>
            <span className="text-sm">Total Users : {filteredUsers.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}