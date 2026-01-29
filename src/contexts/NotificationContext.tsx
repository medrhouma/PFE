"use client"

import { createContext, useContext, useState } from "react"
import { NotificationToast } from "@/components/notifications/NotificationToast"

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }
    
    setNotifications(prev => [...prev, newNotification])
    
    // Remove notification after it's closed
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, (notification.duration || 5000) + 500)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Notification Container - More visible positioning */}
      <div 
        className="fixed top-24 right-6 z-[9999] flex flex-col gap-4 pointer-events-none max-w-md"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
        suppressHydrationWarning
      >
        {notifications.map((notification, index) => (
          <div 
            key={notification.id} 
            className="pointer-events-auto animate-slide-in"
            style={{ 
              animationDelay: `${index * 100}ms`,
              transform: `translateY(${index * 4}px)` 
            }}
            suppressHydrationWarning
          >
            <NotificationToast
              {...notification}
              onClose={removeNotification}
            />
          </div>
        ))}
      </div>
      
      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}