"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { ModuleCard } from "@/components/dashboard/ModuleCard"

const DashboardIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3V3zM9 3v18M15 3v18M3 9h18M3 15h18" />
  </svg>
)

const WorkspaceIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardIcon />,
  workspace: <WorkspaceIcon />,
  settings: <SettingsIcon />,
}

interface ModuleData {
  id: string
  titleKey: string
  descriptionKey: string
  iconId: string
  href: string
  color: "blue" | "violet" | "orange" | "teal" | "pink" | "green"
}

interface HomeContentProps {
  firstName: string
  modules: ModuleData[]
}

export function HomeContent({ firstName, modules }: HomeContentProps) {
  const { t } = useLanguage()

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {t('welcome')}, <span className="text-violet-600 dark:text-violet-400">{firstName || t('user')}</span>
      </h1>

      <div className="mt-12 mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('available_modules')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{t('select_module_to_start')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            title={t(module.titleKey)}
            description={t(module.descriptionKey)}
            icon={iconMap[module.iconId] || <DashboardIcon />}
            href={module.href}
            color={module.color}
          />
        ))}
      </div>
    </div>
  )
}
