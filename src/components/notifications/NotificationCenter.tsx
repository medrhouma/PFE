/**
 * NotificationCenter Component
 * Advanced notification dropdown with real-time updates, categories, and role-based filtering
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useRealTimeNotifications, Notification } from "@/hooks/useNotifications";
import { 
  Bell, 
  Check, 
  CheckCircle, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Sparkles,
  Clock,
  Calendar,
  User,
  X,
  Filter,
  ChevronDown,
} from "lucide-react";

type FilterType = 'all' | 'unread' | 'conges' | 'pointage' | 'profils';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className = "" }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useRealTimeNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter notifications based on category
  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'conges':
        return notifications.filter(n => 
          n.type === 'LEAVE_REQUEST' || 
          n.type.toLowerCase().includes('leave') ||
          n.type.toLowerCase().includes('conge')
        );
      case 'pointage':
        return notifications.filter(n => 
          n.type.toLowerCase().includes('pointage') ||
          n.type.toLowerCase().includes('check')
        );
      case 'profils':
        return notifications.filter(n => 
          n.type.toLowerCase().includes('profile') ||
          n.type.toLowerCase().includes('profil') ||
          n.type === 'RH_ACTION_REQUIRED'
        );
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  // Count by category
  const countByCategory = {
    conges: notifications.filter(n => 
      n.type === 'LEAVE_REQUEST' || 
      n.type.toLowerCase().includes('leave') ||
      n.type.toLowerCase().includes('conge')
    ).length,
    pointage: notifications.filter(n => 
      n.type.toLowerCase().includes('pointage') ||
      n.type.toLowerCase().includes('check')
    ).length,
    profils: notifications.filter(n => 
      n.type.toLowerCase().includes('profile') ||
      n.type.toLowerCase().includes('profil') ||
      n.type === 'RH_ACTION_REQUIRED'
    ).length,
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return {
          border: 'border-l-red-500',
          bg: 'bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-900/10',
          badge: 'bg-red-500 text-white',
        };
      case 'HIGH':
        return {
          border: 'border-l-orange-500',
          bg: 'bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-900/10',
          badge: 'bg-orange-500 text-white',
        };
      case 'NORMAL':
        return {
          border: 'border-l-blue-500',
          bg: 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10',
          badge: 'bg-blue-500 text-white',
        };
      case 'LOW':
        return {
          border: 'border-l-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-800/50',
          badge: 'bg-gray-400 text-white',
        };
      default:
        return {
          border: 'border-l-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-800/50',
          badge: 'bg-gray-400 text-white',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROFILE_APPROVED':
        return { icon: '✅', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' };
      case 'PROFILE_REJECTED':
        return { icon: '❌', color: 'bg-red-100 text-red-600 dark:bg-red-900/30' };
      case 'PROFILE_SUBMITTED':
        return { icon: '📄', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' };
      case 'POINTAGE_ANOMALY':
        return { icon: '⚠️', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' };
      case 'POINTAGE_SUCCESS':
        return { icon: '✓', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' };
      case 'LEAVE_REQUEST':
        return { icon: '🏖️', color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30' };
      case 'SYSTEM_ALERT':
        return { icon: '🔔', color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30' };
      case 'RH_ACTION_REQUIRED':
        return { icon: '👤', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' };
      case 'DOCUMENT_REQUIRED':
        return { icon: '📁', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' };
      default:
        return { icon: '📬', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const categoryTabs = [
    { id: 'all' as FilterType, label: 'Toutes', icon: '📋', count: notifications.length },
    { id: 'unread' as FilterType, label: 'Non lues', icon: '🔔', count: unreadCount },
    { id: 'conges' as FilterType, label: 'Congés', icon: '🏖️', count: countByCategory.conges },
    { id: 'pointage' as FilterType, label: 'Pointage', icon: '⏰', count: countByCategory.pointage },
    { id: 'profils' as FilterType, label: 'Profils', icon: '👤', count: countByCategory.profils },
  ];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/30 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection indicator */}
        <span className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${
          isConnected ? 'bg-emerald-500' : 'bg-red-500'
        }`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[420px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 opacity-10"></div>
            <div className="relative px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          En temps réel
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <WifiOff className="w-3 h-3" />
                          Déconnecté
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refresh()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    title="Rafraîchir"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all shadow-sm"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Category filter tabs */}
            <div className="relative px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                      filter === tab.id
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`min-w-4 h-4 flex items-center justify-center text-[10px] rounded-full ${
                        filter === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">Aucune notification</p>
                <p className="text-sm text-center max-w-[200px] mt-1">
                  {filter === 'unread' 
                    ? 'Toutes vos notifications sont lues !' 
                    : filter === 'all'
                    ? 'Vous êtes à jour !'
                    : `Aucune notification de type "${categoryTabs.find(t => t.id === filter)?.label}"`
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    getPriorityStyles={getPriorityStyles}
                    getTypeIcon={getTypeIcon}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <a
                href="/notifications"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
              >
                Voir toutes les notifications
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <X className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
                <p className="font-medium">Aucune notification</p>
                <p className="text-sm">
                  {filter === 'unread' ? 'Toutes les notifications sont lues' : 'Vous êtes à jour !'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    getPriorityColor={getPriorityColor}
                    getTypeIcon={getTypeIcon}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <a
                href="/notifications"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Voir toutes les notifications
                <FiExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual notification item with modern styling
 */
function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  getPriorityStyles,
  getTypeIcon,
  formatDate,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  getPriorityStyles: (priority: string) => { border: string; bg: string; badge: string };
  getTypeIcon: (type: string) => { icon: string; color: string };
  formatDate: (date: string) => string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const priorityStyles = getPriorityStyles(notification.priority);
  const typeIcon = getTypeIcon(notification.type);

  return (
    <div
      className={`relative px-4 py-3.5 border-l-4 transition-all duration-200 cursor-pointer ${priorityStyles.border} ${priorityStyles.bg} ${
        !notification.isRead ? 'opacity-100' : 'opacity-75 hover:opacity-100'
      } hover:translate-x-1`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (!notification.isRead) {
          onMarkAsRead(notification.id);
        }
        // Navigate to link if available
        if (notification.metadata?.link) {
          window.location.href = notification.metadata.link;
        }
      }}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-11 h-11 rounded-xl shadow-sm flex items-center justify-center text-lg ${typeIcon.color}`}>
          {typeIcon.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold text-sm truncate ${
              !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
            }`}>
              {notification.title}
            </p>
            <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">
              {formatDate(notification.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          {/* Priority badge for urgent/high */}
          {['URGENT', 'HIGH'].includes(notification.priority) && (
            <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-xs font-semibold rounded-lg ${priorityStyles.badge} shadow-sm`}>
              {notification.priority === 'URGENT' ? '🔥 Urgent' : '⚡ Important'}
            </span>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="flex-shrink-0 w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 mt-2 shadow-lg shadow-violet-500/50 animate-pulse" />
        )}
      </div>

      {/* Action buttons on hover */}
      {isHovered && (
        <div className="absolute right-2 top-2 flex gap-1 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-1.5 border border-gray-100 dark:border-gray-600">
          {!notification.isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
              title="Marquer comme lu"
            >
              <Check className="w-4 h-4 text-emerald-600" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}
