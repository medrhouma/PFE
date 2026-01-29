"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { 
  Maximize2, 
  Minimize2, 
  X, 
  Plus, 
  LayoutGrid, 
  Columns, 
  Layers, 
  Move,
  RefreshCw,
  ChevronDown
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

// Panel configuration type
interface PanelConfig {
  id: string
  title: string
  component: React.ReactNode
  minWidth?: number
  minHeight?: number
}

// Available layouts
type LayoutType = 'single' | 'split-2h' | 'split-2v' | 'split-3' | 'split-4'

interface SplitScreenProviderProps {
  children: React.ReactNode
  availablePanels: PanelConfig[]
  defaultLayout?: LayoutType
}

// Layout definitions
const LAYOUTS: Record<LayoutType, { name: string; icon: React.ReactNode; grid: string; areas: string[] }> = {
  'single': { 
    name: 'Simple', 
    icon: <Maximize2 />, 
    grid: 'grid-cols-1 grid-rows-1',
    areas: ['a']
  },
  'split-2h': { 
    name: '2 Horizontal', 
    icon: <Columns />, 
    grid: 'grid-cols-2 grid-rows-1',
    areas: ['a', 'b']
  },
  'split-2v': { 
    name: '2 Vertical', 
    icon: <Layers />, 
    grid: 'grid-cols-1 grid-rows-2',
    areas: ['a', 'b']
  },
  'split-3': { 
    name: '3 Panneaux', 
    icon: <LayoutGrid />, 
    grid: 'grid-cols-2 grid-rows-2',
    areas: ['a', 'b', 'c']
  },
  'split-4': { 
    name: '4 Panneaux', 
    icon: <LayoutGrid />, 
    grid: 'grid-cols-2 grid-rows-2',
    areas: ['a', 'b', 'c', 'd']
  },
}

// Context for split screen
interface SplitScreenContextType {
  layout: LayoutType
  setLayout: (layout: LayoutType) => void
  activePanel: string | null
  setActivePanel: (id: string | null) => void
  maximizedPanel: string | null
  toggleMaximize: (id: string) => void
  panelAssignments: Record<string, string>
  assignPanel: (slot: string, panelId: string) => void
  availablePanels: PanelConfig[]
  refreshPanel: (slot: string) => void
}

const SplitScreenContext = React.createContext<SplitScreenContextType | null>(null)

export function useSplitScreen() {
  const context = React.useContext(SplitScreenContext)
  if (!context) {
    throw new Error('useSplitScreen must be used within SplitScreenProvider')
  }
  return context
}

// Main Provider Component
export function SplitScreenProvider({ 
  children, 
  availablePanels, 
  defaultLayout = 'single' 
}: SplitScreenProviderProps) {
  const [layout, setLayout] = useState<LayoutType>(defaultLayout)
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null)
  const [panelAssignments, setPanelAssignments] = useState<Record<string, string>>({})
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({})

  // Toggle maximize
  const toggleMaximize = useCallback((id: string) => {
    setMaximizedPanel(prev => prev === id ? null : id)
  }, [])

  // Assign panel to slot
  const assignPanel = useCallback((slot: string, panelId: string) => {
    setPanelAssignments(prev => ({ ...prev, [slot]: panelId }))
  }, [])

  // Refresh specific panel
  const refreshPanel = useCallback((slot: string) => {
    setRefreshKeys(prev => ({ ...prev, [slot]: (prev[slot] || 0) + 1 }))
  }, [])

  const value = {
    layout,
    setLayout,
    activePanel,
    setActivePanel,
    maximizedPanel,
    toggleMaximize,
    panelAssignments,
    assignPanel,
    availablePanels,
    refreshPanel,
  }

  return (
    <SplitScreenContext.Provider value={value}>
      {children}
    </SplitScreenContext.Provider>
  )
}

// Layout Selector Component
export function LayoutSelector() {
  const { layout, setLayout } = useSplitScreen()
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getText = (fr: string, en: string) => language === 'en' ? en : fr

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
      >
        {LAYOUTS[layout].icon}
        <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">
          {getText('Disposition', 'Layout')}
        </span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
              {getText('Choisir une disposition', 'Choose layout')}
            </p>
          </div>
          <div className="p-2 space-y-1">
            {(Object.entries(LAYOUTS) as [LayoutType, typeof LAYOUTS[LayoutType]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setLayout(key)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
                  layout === key 
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                )}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  {config.icon}
                </div>
                <span className="text-sm font-medium">{config.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Panel Wrapper Component
interface PanelSlotProps {
  slotId: string
  className?: string
}

export function PanelSlot({ slotId, className }: PanelSlotProps) {
  const { 
    panelAssignments, 
    assignPanel, 
    availablePanels, 
    maximizedPanel, 
    toggleMaximize,
    refreshPanel,
    setActivePanel 
  } = useSplitScreen()
  const { language } = useLanguage()
  const [showSelector, setShowSelector] = useState(false)

  const getText = (fr: string, en: string) => language === 'en' ? en : fr
  const assignedPanelId = panelAssignments[slotId]
  const panel = availablePanels.find(p => p.id === assignedPanelId)
  const isMaximized = maximizedPanel === slotId

  // If maximized but not this panel, hide it
  if (maximizedPanel && maximizedPanel !== slotId) {
    return null
  }

  return (
    <div 
      className={cn(
        "relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm transition-all",
        isMaximized && "fixed inset-4 z-50",
        className
      )}
      onMouseEnter={() => setActivePanel(slotId)}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
            {panel?.title || getText('Sélectionner un panneau', 'Select a panel')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {panel && (
            <>
              <button
                onClick={() => refreshPanel(slotId)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={getText('Actualiser', 'Refresh')}
              >
                <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => toggleMaximize(slotId)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isMaximized ? getText('Réduire', 'Minimize') : getText('Agrandir', 'Maximize')}
              >
                {isMaximized ? (
                  <Minimize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            </>
          )}
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={getText('Changer de panneau', 'Change panel')}
          >
            <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className={cn("overflow-auto", isMaximized ? "h-[calc(100%-52px)]" : "h-[calc(100%-52px)] max-h-[600px]")}>
        {panel ? (
          panel.component
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {getText('Panneau vide', 'Empty Panel')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {getText('Cliquez pour ajouter du contenu', 'Click to add content')}
            </p>
            <button
              onClick={() => setShowSelector(true)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {getText('Choisir un panneau', 'Choose panel')}
            </button>
          </div>
        )}
      </div>

      {/* Panel Selector Overlay */}
      {showSelector && (
        <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm z-10 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getText('Sélectionner un panneau', 'Select a panel')}
            </span>
            <button
              onClick={() => setShowSelector(false)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 grid grid-cols-1 gap-2">
            {availablePanels.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  assignPanel(slotId, p.id)
                  setShowSelector(false)
                }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                  assignedPanelId === p.id
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {p.title.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {p.title}
                  </p>
                </div>
                {assignedPanelId === p.id && (
                  <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Main Split Screen Container
export function SplitScreenContainer() {
  const { layout, maximizedPanel } = useSplitScreen()
  const layoutConfig = LAYOUTS[layout]

  // If a panel is maximized, only show that one
  if (maximizedPanel) {
    return (
      <div className="h-full">
        <PanelSlot slotId={maximizedPanel} />
      </div>
    )
  }

  return (
    <div className={cn("grid gap-4 h-full", layoutConfig.grid)}>
      {layoutConfig.areas.map((area, index) => (
        <PanelSlot 
          key={area} 
          slotId={area} 
          className={layout === 'split-3' && index === 2 ? 'col-span-2' : ''}
        />
      ))}
    </div>
  )
}

// Toolbar Component
export function SplitScreenToolbar() {
  const { layout, setLayout } = useSplitScreen()
  const { language } = useLanguage()

  const getText = (fr: string, en: string) => language === 'en' ? en : fr

  return (
    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
        {getText('Vue:', 'View:')}
      </span>
      {(Object.entries(LAYOUTS) as [LayoutType, typeof LAYOUTS[LayoutType]][]).map(([key, config]) => (
        <button
          key={key}
          onClick={() => setLayout(key)}
          className={cn(
            "p-2 rounded-lg transition-all",
            layout === key 
              ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" 
              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          )}
          title={config.name}
        >
          {config.icon}
        </button>
      ))}
    </div>
  )
}

export default {
  SplitScreenProvider,
  SplitScreenContainer,
  SplitScreenToolbar,
  LayoutSelector,
  PanelSlot,
  useSplitScreen,
}
