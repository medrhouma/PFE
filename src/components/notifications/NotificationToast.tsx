"use client"

import { useState, useEffect } from "react"
import { X, Check, AlertTriangle, Info, AlertCircle } from "lucide-react"

interface NotificationProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  onClose: (id: string) => void
}

export function NotificationToast({ 
  id, 
  type, 
  title, 
  message, 
  duration = 5000,
  onClose 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 50)
    
    // Auto close
    const autoCloseTimer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(autoCloseTimer)
    }
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => onClose(id), 400)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/40 dark:via-emerald-900/30 dark:to-teal-900/20 border-2 border-green-400/50 dark:border-green-500/30',
          iconContainer: 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30',
          icon: 'text-white',
          title: 'text-green-900 dark:text-green-100',
          message: 'text-green-800 dark:text-green-200',
          progress: 'from-green-500 via-emerald-500 to-teal-500',
          glow: 'shadow-2xl shadow-green-500/20'
        }
      case 'error':
        return {
          container: 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-red-900/40 dark:via-rose-900/30 dark:to-pink-900/20 border-2 border-red-400/50 dark:border-red-500/30',
          iconContainer: 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30',
          icon: 'text-white',
          title: 'text-red-900 dark:text-red-100',
          message: 'text-red-800 dark:text-red-200',
          progress: 'from-red-500 via-rose-500 to-pink-500',
          glow: 'shadow-2xl shadow-red-500/20'
        }
      case 'warning':
        return {
          container: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/40 dark:via-orange-900/30 dark:to-yellow-900/20 border-2 border-amber-400/50 dark:border-amber-500/30',
          iconContainer: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30',
          icon: 'text-white',
          title: 'text-amber-900 dark:text-amber-100',
          message: 'text-amber-800 dark:text-amber-200',
          progress: 'from-amber-500 via-orange-500 to-yellow-500',
          glow: 'shadow-2xl shadow-amber-500/20'
        }
      case 'info':
        return {
          container: 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-900/40 dark:via-purple-900/30 dark:to-indigo-900/20 border-2 border-violet-400/50 dark:border-violet-500/30',
          iconContainer: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30',
          icon: 'text-white',
          title: 'text-violet-900 dark:text-violet-100',
          message: 'text-violet-800 dark:text-violet-200',
          progress: 'from-violet-500 via-purple-500 to-indigo-500',
          glow: 'shadow-2xl shadow-violet-500/20'
        }
      default:
        return {
          container: 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600',
          iconContainer: 'bg-gray-500',
          icon: 'text-white',
          title: 'text-gray-900 dark:text-white',
          message: 'text-gray-700 dark:text-gray-300',
          progress: 'from-gray-500 to-gray-600',
          glow: 'shadow-2xl shadow-gray-500/20'
        }
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5" strokeWidth={3} />
      case 'error': return <AlertCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'info': return <Info className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const styles = getTypeStyles()

  return (
    <div 
      className={`transform transition-all duration-500 ease-out ${
        isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : isLeaving
          ? '-translate-x-8 opacity-0 scale-95'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`
        relative flex items-start gap-4 p-5 rounded-2xl
        backdrop-blur-xl w-[380px] overflow-hidden
        ${styles.container} ${styles.glow}
      `}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 dark:bg-white/5 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/15 dark:bg-white/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Icon with pulse animation */}
        <div className={`relative flex-shrink-0 p-3 rounded-xl ${styles.iconContainer}`}>
          <div className={`${styles.icon}`}>
            {getIcon()}
          </div>
          {/* Pulse ring */}
          <div className={`absolute inset-0 rounded-xl ${styles.iconContainer} animate-ping opacity-30`} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 relative z-10 pt-0.5">
          <h4 className={`text-base font-bold mb-1.5 ${styles.title}`}>
            {title}
          </h4>
          <p className={`text-sm leading-relaxed ${styles.message}`}>
            {message}
          </p>
        </div>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className={`flex-shrink-0 p-2 rounded-xl hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95 relative z-10 ${styles.title}`}
          aria-label="Fermer la notification"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30 dark:bg-black/20 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${styles.progress} rounded-full`}
            style={{
              animation: `progress-${id} ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>
      
      {/* Custom animation style */}
      <style jsx>{`
        @keyframes progress-${id} {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}