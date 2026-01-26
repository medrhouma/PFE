"use client"

import { useState, useEffect, useRef } from "react"
import { FiBell, FiCheck, FiX, FiAlertCircle, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi"
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

export function NotificationBell() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "border-l-4 border-red-500"
      case "HIGH":
        return "border-l-4 border-orange-500"
      case "NORMAL":
        return "border-l-4 border-blue-500"
      default:
        return "border-l-4 border-gray-300"
    }
  }

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 group"
        aria-label="Notifications"
      >
        <FiBell className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold shadow-lg animate-pulse px-1.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Notifications</h3>
                <p className="text-violet-100 text-sm">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "..." : "Tout marquer"}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <FiBell className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune notification</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Vous êtes à jour !</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`group relative transition-all duration-200 ${
                      !notif.is_read 
                        ? "bg-violet-50 dark:bg-violet-900/10 hover:bg-violet-100 dark:hover:bg-violet-900/20" 
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    } ${getPriorityColor(notif.priority)}`}
                  >
                    <div className="p-4">
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={`text-sm font-semibold ${
                                !notif.is_read 
                                  ? "text-gray-900 dark:text-white" 
                                  : "text-gray-700 dark:text-gray-300"
                              }`}>
                                {notif.title}
                                {!notif.is_read && (
                                  <span className="inline-block w-2 h-2 bg-violet-600 rounded-full ml-2"></span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-1">
                                <FiClock className="w-3 h-3" />
                                {formatTime(notif.created_at)}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notif.is_read && (
                                <button
                                  onClick={() => markAsRead(notif.id)}
                                  className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Marquer comme lu"
                                >
                                  <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notif.id)}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
              <a
                href={session?.user?.role === "RH" || session?.user?.role === "SUPER_ADMIN" ? "/rh/notifications" : "#"}
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20"
              >
                {session?.user?.role === "RH" || session?.user?.role === "SUPER_ADMIN" 
                  ? "Voir le centre de notifications" 
                  : "Voir toutes les notifications"}
              </a>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a5568;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-8px); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.2s ease-out, slide-in-from-top-2 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
