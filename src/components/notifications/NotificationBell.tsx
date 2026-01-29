"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { FiBell, FiCheck, FiX, FiAlertCircle, FiClock, FiCheckCircle, FiXCircle, FiInfo, FiGift, FiCalendar, FiUser } from "react-icons/fi"
import { useSession } from "next-auth/react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  priority: string
  created_at: string
}

// Toast notification for real-time updates
interface Toast {
  id: string
  title: string
  message: string
  type: string
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevUnreadRef = useRef(0)

  useEffect(() => {
    if (session?.user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  useEffect(() => {
    if (!session?.user) return

    const eventSource = new EventSource("/api/notifications/stream")

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data?.notifications) {
          setNotifications(data.notifications || [])
        }
        if (typeof data?.unreadCount === "number") {
          setUnreadCount(data.unreadCount)
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => eventSource.close()
  }, [session])

  useEffect(() => {
    if (!session?.user) return
    if (!("serviceWorker" in navigator)) return

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) return

    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
      const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
      const rawData = window.atob(base64)
      const outputArray = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
      }
      return outputArray
    }

    const setupPush = async () => {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== "granted") return

        const registration = await navigator.serviceWorker.register("/sw.js")
        const existing = await registration.pushManager.getSubscription()
        const subscription = existing || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        })

        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription })
        })
      } catch (error) {
        console.error("Push setup error:", error)
      }
    }

    setupPush()
  }, [session])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const isAdmin = session?.user?.role === "RH" || session?.user?.role === "SUPER_ADMIN"
      const response = await fetch(isAdmin ? "/api/notifications/all" : "/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      })
      await fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" })
      await fetchNotifications()
    } catch (error) {
      console.error("Error marking all as read:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" })
      await fetchNotifications()
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PROFILE_APPROVED":
        return <FiCheckCircle className="w-5 h-5 text-green-500" />
      case "PROFILE_REJECTED":
        return <FiXCircle className="w-5 h-5 text-red-500" />
      case "POINTAGE_ANOMALY":
        return <FiAlertCircle className="w-5 h-5 text-orange-500" />
      case "RH_ACTION_REQUIRED":
        return <FiClock className="w-5 h-5 text-blue-500" />
      case "PROFILE_SUBMITTED":
        return <FiClock className="w-5 h-5 text-violet-500" />
      case "POINTAGE_SUCCESS":
        return <FiCheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <FiBell className="w-5 h-5 text-gray-500" />
    }
  }

  // Add toast notification
  const addToast = useCallback((notification: Notification) => {
    const toast: Toast = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type
    }
    setToasts(prev => [...prev, toast])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, 5000)
  }, [])

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Animate bell when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && prevUnreadRef.current !== 0) {
      setIsAnimating(true)
      
      // Show toast for new notifications
      const newNotifs = notifications.filter(n => !n.is_read).slice(0, 1)
      newNotifs.forEach(addToast)
      
      setTimeout(() => setIsAnimating(false), 600)
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, notifications, addToast])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR')
  }

  const getToastIcon = (type: string) => {
    switch (type) {
      case "PROFILE_APPROVED":
      case "POINTAGE_SUCCESS":
        return <FiCheckCircle className="w-5 h-5 text-green-500" />
      case "PROFILE_REJECTED":
        return <FiXCircle className="w-5 h-5 text-red-500" />
      case "POINTAGE_ANOMALY":
        return <FiAlertCircle className="w-5 h-5 text-orange-500" />
      case "LEAVE_REQUEST":
      case "LEAVE_APPROVED":
        return <FiCalendar className="w-5 h-5 text-blue-500" />
      case "BIRTHDAY":
        return <FiGift className="w-5 h-5 text-pink-500" />
      case "NEW_EMPLOYEE":
        return <FiUser className="w-5 h-5 text-violet-500" />
      default:
        return <FiInfo className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-toast-in"
            style={{ 
              animationDelay: `${index * 50}ms`,
              transform: `translateY(${index * 4}px)`
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getToastIcon(toast.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {toast.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FiX className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 animate-toast-progress" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative" ref={dropdownRef}>
        {/* Bell Button with animations */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 group ${
            isAnimating ? 'animate-bell-ring' : ''
          }`}
          aria-label="Notifications"
        >
          <FiBell className={`w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-all duration-300 ${
            isAnimating ? 'text-violet-600 dark:text-violet-400' : ''
          }`} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold shadow-lg px-1.5 ${
              isAnimating ? 'animate-badge-pop' : ''
            }`}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          
          {/* Ripple effect on new notification */}
          {isAnimating && (
            <span className="absolute inset-0 rounded-xl animate-ripple bg-violet-500/20" />
          )}
        </button>

        {/* Dropdown Panel with improved animations */}
        <div className={`absolute right-0 mt-3 w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden transition-all duration-300 ease-out origin-top-right ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5 text-white relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl animate-float-slow" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl animate-float-slow-delayed" />
            </div>
            
            <div className="relative flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FiBell className="w-5 h-5" />
                  Notifications
                </h3>
                <p className="text-violet-100 text-sm mt-1">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour ✨'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 backdrop-blur-sm flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <FiCheck className="w-4 h-4" />
                  {loading ? "..." : "Tout lire"}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List with smooth scrolling */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar scroll-smooth">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mb-5 rotate-12 animate-float">
                  <FiBell className="w-10 h-10 text-gray-400 -rotate-12" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-semibold text-lg">Aucune notification</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Vous êtes à jour ! 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {notifications.map((notif, index) => (
                  <div
                    key={notif.id}
                    className={`group relative transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      !notif.is_read 
                        ? "bg-violet-50/50 dark:bg-violet-900/5" 
                        : ""
                    }`}
                    style={{ 
                      animationName: isOpen ? 'slideInRight' : 'none',
                      animationDuration: '0.3s',
                      animationTimingFunction: 'ease-out',
                      animationFillMode: 'forwards',
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {/* Priority indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${
                      notif.priority === 'URGENT' ? 'bg-gradient-to-b from-red-500 to-red-600' :
                      notif.priority === 'HIGH' ? 'bg-gradient-to-b from-orange-500 to-orange-600' :
                      notif.priority === 'NORMAL' ? 'bg-gradient-to-b from-blue-500 to-blue-600' :
                      'bg-gray-300 dark:bg-gray-600'
                    } ${!notif.is_read ? 'opacity-100' : 'opacity-50'}`} />
                    
                    <div className="p-4 pl-5">
                      <div className="flex gap-3">
                        {/* Animated Icon */}
                        <div className={`flex-shrink-0 mt-0.5 p-2 rounded-xl transition-all duration-300 ${
                          !notif.is_read 
                            ? 'bg-violet-100 dark:bg-violet-900/30' 
                            : 'bg-gray-100 dark:bg-gray-700'
                        } group-hover:scale-110`}>
                          {getNotificationIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={`text-sm font-semibold transition-colors duration-200 ${
                                !notif.is_read 
                                  ? "text-gray-900 dark:text-white" 
                                  : "text-gray-700 dark:text-gray-300"
                              }`}>
                                {notif.title}
                                {!notif.is_read && (
                                  <span className="inline-flex items-center justify-center w-2 h-2 bg-violet-600 rounded-full ml-2 animate-pulse" />
                                )}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2.5 flex items-center gap-1.5">
                                <FiClock className="w-3.5 h-3.5" />
                                {formatTime(notif.created_at)}
                              </p>
                            </div>

                            {/* Actions with smooth reveal */}
                            <div className="flex items-center gap-1 transition-all duration-300 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
                              {!notif.is_read && (
                                <button
                                  onClick={() => markAsRead(notif.id)}
                                  className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                                  title="Marquer comme lu"
                                >
                                  <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notif.id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                                title="Supprimer"
                              >
                                <FiX className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <a
                href={session?.user?.role === "RH" || session?.user?.role === "SUPER_ADMIN" ? "/rh/notifications" : "#"}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200 py-2.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 group"
              >
                <span>
                  {session?.user?.role === "RH" || session?.user?.role === "SUPER_ADMIN" 
                    ? "Voir le centre de notifications" 
                    : "Voir toutes les notifications"}
                </span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
            </div>
          )}
        </div>

        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #a78bfa, #8b5cf6);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, #8b5cf6, #7c3aed);
          }
          
          @keyframes bell-ring {
            0%, 100% { transform: rotate(0); }
            10%, 30%, 50%, 70%, 90% { transform: rotate(10deg); }
            20%, 40%, 60%, 80% { transform: rotate(-10deg); }
          }
          .animate-bell-ring {
            animation: bell-ring 0.6s ease-in-out;
          }
          
          @keyframes badge-pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
          }
          .animate-badge-pop {
            animation: badge-pop 0.3s ease-out;
          }
          
          @keyframes ripple {
            0% { transform: scale(1); opacity: 0.4; }
            100% { transform: scale(2); opacity: 0; }
          }
          .animate-ripple {
            animation: ripple 0.6s ease-out forwards;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(12deg); }
            50% { transform: translateY(-10px) rotate(12deg); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float-slow {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(10px, -10px); }
          }
          .animate-float-slow {
            animation: float-slow 6s ease-in-out infinite;
          }
          .animate-float-slow-delayed {
            animation: float-slow 6s ease-in-out infinite 3s;
          }
          
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          
          @keyframes toast-in {
            from { 
              opacity: 0; 
              transform: translateX(100%) scale(0.8);
            }
            to { 
              opacity: 1; 
              transform: translateX(0) scale(1);
            }
          }
          .animate-toast-in {
            animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          @keyframes toast-progress {
            from { width: 100%; }
            to { width: 0%; }
          }
          .animate-toast-progress {
            animation: toast-progress 5s linear forwards;
          }
        `}</style>
      </div>
    </>
  )
}
