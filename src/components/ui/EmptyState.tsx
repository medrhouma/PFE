"use client"

import { ReactNode } from 'react'
import { Inbox, Users, Calendar, FileText, Bell, Folder, Clock, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateVariant = 
  | 'default' 
  | 'users' 
  | 'calendar' 
  | 'documents' 
  | 'notifications' 
  | 'folders' 
  | 'history' 
  | 'search'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

const variantConfig: Record<EmptyStateVariant, { 
  icon: ReactNode; 
  title: string; 
  description: string 
}> = {
  default: {
    icon: <Inbox className="w-12 h-12" />,
    title: 'Aucune donnée',
    description: 'Aucun élément à afficher pour le moment.'
  },
  users: {
    icon: <Users className="w-12 h-12" />,
    title: 'Aucun utilisateur',
    description: 'Aucun utilisateur trouvé. Les nouveaux utilisateurs apparaîtront ici.'
  },
  calendar: {
    icon: <Calendar className="w-12 h-12" />,
    title: 'Aucun congé',
    description: 'Vous n\'avez aucune demande de congé. Créez une nouvelle demande pour commencer.'
  },
  documents: {
    icon: <FileText className="w-12 h-12" />,
    title: 'Aucun document',
    description: 'Aucun document disponible. Uploadez vos premiers documents.'
  },
  notifications: {
    icon: <Bell className="w-12 h-12" />,
    title: 'Aucune notification',
    description: 'Vous êtes à jour ! Aucune notification pour le moment.'
  },
  folders: {
    icon: <Folder className="w-12 h-12" />,
    title: 'Dossier vide',
    description: 'Ce dossier ne contient aucun fichier.'
  },
  history: {
    icon: <Clock className="w-12 h-12" />,
    title: 'Aucun historique',
    description: 'Aucune activité enregistrée pour le moment.'
  },
  search: {
    icon: <Search className="w-12 h-12" />,
    title: 'Aucun résultat',
    description: 'Aucun résultat ne correspond à votre recherche. Essayez avec d\'autres termes.'
  }
}

export function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  action,
  className
}: EmptyStateProps) {
  const config = variantConfig[variant]
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
        {icon || config.icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {description || config.description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}

// Compact version for inline use
interface EmptyStateInlineProps {
  message?: string
  className?: string
}

export function EmptyStateInline({ 
  message = 'Aucune donnée disponible',
  className 
}: EmptyStateInlineProps) {
  return (
    <div className={cn(
      'flex items-center justify-center gap-2 py-4 px-3 text-gray-500 dark:text-gray-400 text-sm',
      className
    )}>
      <Inbox className="w-4 h-4" />
      <span>{message}</span>
    </div>
  )
}

export default EmptyState
