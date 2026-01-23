"use client"

interface Permission {
  label: string
  checked: boolean
}

interface PermissionModule {
  title: string
  badge?: string
  permissions: {
    base: Permission[]
    advanced?: Permission[]
  }
}

interface RoleCardProps {
  roleName: string
  description: string
  modules: PermissionModule[]
  onEdit?: () => void
}

export function RoleCard({ roleName, description, modules, onEdit }: RoleCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{roleName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 p-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {modules.map((module, idx) => (
          <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{module.title}</span>
              {module.badge && (
                <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs rounded">
                  {module.badge}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {module.permissions.base.map((perm, pidx) => (
                <div key={pidx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={perm.checked}
                    readOnly
                    className="w-3 h-3 rounded accent-violet-600"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{perm.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
