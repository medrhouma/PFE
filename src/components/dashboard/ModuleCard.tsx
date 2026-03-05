import Link from "next/link"

interface ModuleCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: "blue" | "violet" | "orange" | "teal" | "pink" | "green"
}

const colorClasses = {
  blue:  "bg-blue-500",
  violet: "bg-gradient-to-br from-violet-500 to-purple-600",
  orange: "bg-gradient-to-br from-orange-400 to-orange-500",
  teal:  "bg-gradient-to-br from-teal-400 to-teal-500",
  pink: "bg-gradient-to-br from-pink-500 to-rose-500",
  green: "bg-gradient-to-br from-green-400 to-green-500",
}

export function ModuleCard({ title, description, icon, href, color }: ModuleCardProps) {
  return (
    <Link href={href}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
        <div className="flex items-start justify-between">
          {/* Icon */}
          <div className={`w-14 h-14 ${colorClasses[color]} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
            {icon}
          </div>
          
          {/* Arrow */}
          <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
            <svg 
              className="w-5 h-5 text-gray-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}