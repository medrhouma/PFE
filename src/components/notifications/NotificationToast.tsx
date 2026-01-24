"use client"

import { useState, useEffect } from "react"
import { FiX, FiCheck, FiAlertTriangle, FiInfo } from "react-icons/fi"

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
    setTimeout(() => onClose(id), 300)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-500/30 shadow-2xl shadow-green-500/20',
          icon: 'text-green-600 bg-green-100 p-3 rounded-xl',
          iconBg: 'bg-green-500',
          title: 'text-green-900 font-bold',
          message: 'text-green-700'
        }
      case 'error':
        return {
          container: 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-500/30 shadow-2xl shadow-red-500/20',
          icon: 'text-red-600 bg-red-100 p-3 rounded-xl',
          iconBg: 'bg-red-500',
          title: 'text-red-900 font-bold',
          message: 'text-red-700'
        }
      case 'warning':
        return {
          container: 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-500/30 shadow-2xl shadow-amber-500/20',
          icon: 'text-amber-600 bg-amber-100 p-3 rounded-xl',
          iconBg: 'bg-amber-500',
          title: 'text-amber-900 font-bold',
          message: 'text-amber-700'
        }
      case 'info':
        return {
          container: 'bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-500/30 shadow-2xl shadow-violet-500/20',
          icon: 'text-violet-600 bg-violet-100 p-3 rounded-xl',
          iconBg: 'bg-violet-500',
          title: 'text-violet-900 font-bold',
          message: 'text-violet-700'
        }
      default:
        return {
          container: 'bg-gray-800 border-gray-600',
          icon: 'text-gray-300',
          iconBg: 'bg-gray-500',
          title: 'text-white',
          message: 'text-gray-300'
        }
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success': return <FiCheck className="w-5 h-5" />
      case 'error': return <FiAlertTriangle className="w-5 h-5" />
      case 'warning': return <FiAlertTriangle className="w-5 h-5" />
      case 'info': return <FiInfo className="w-5 h-5" />
      default: return <FiInfo className="w-5 h-5" />
    }
  }

  const styles = getTypeStyles()

  return (
    <div 
      className={`relative transform transition-all duration-500 ease-out ${
        isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`
        relative flex items-start gap-4 p-6 rounded-2xl border
        backdrop-blur-sm max-w-md w-full overflow-hidden
        ${styles.container}
      `}>
        {/* Animated background decoration */}
        <div className={`absolute inset-0 ${styles.iconBg} opacity-5`}>
          <div className="absolute inset-0 animate-pulse"></div>
        </div>
        
        {/* Icon with animation */}
        <div className={`flex-shrink-0 mt-0.5 ${styles.icon} transform transition-transform duration-500 hover:scale-110`}>
          {getIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 relative z-10">
          <h4 className={`text-lg mb-1.5 ${styles.title}`}>
            {title}
          </h4>
          <p className={`text-sm leading-relaxed ${styles.message}`}>
            {message}
          </p>
          
          {/* Enhanced Progress bar */}
          <div className="mt-4">
            <div className={`h-1.5 bg-white/30 rounded-full overflow-hidden relative`}>
              <div 
                className={`h-full rounded-full ${styles.iconBg} shadow-lg`}
                style={{
                  animation: `progress-${id} ${duration}ms linear forwards`
                }}
              ></div>
              <div className={`absolute inset-0 ${styles.iconBg} opacity-20 animate-pulse`}></div>
            </div>
          </div>
        </div>
        
        {/* Close button with hover effect */}
        <button
          onClick={handleClose}
          className={`flex-shrink-0 p-2 rounded-lg hover:bg-white/20 transition-all duration-200 hover:scale-110 relative z-10 ${styles.title}`}
          aria-label="Fermer la notification"
        >
          <FiX className="w-5 h-5" />
        </button>
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