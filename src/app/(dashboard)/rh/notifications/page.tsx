"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Bell, Filter, CheckCircle, XCircle, AlertCircle, Clock, 
  User, Calendar, RefreshCw, Eye, Trash2, AlertTriangle,
  FileText, CheckCheck, ChevronRight, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: string;
  created_at: string;
  userName?: string;
  userEmail?: string;
  metadata?: any;
}

type FilterType = "ALL" | "UNREAD" | "READ";
type TypeFilter = "ALL" | "LEAVE" | "POINTAGE" | "PROFILE" | "SYSTEM";
type PriorityFilter = "ALL" | "URGENT" | "HIGH" | "NORMAL" | "LOW";

// Format relative time in French
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "À l'instant";
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
  
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationCenterPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [readFilter, setReadFilter] = useState<FilterType>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/all");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllNotifications();
    setTimeout(() => setRefreshing(false), 500);
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const parseMetadata = (metadata: any) => {
    if (!metadata) return null;
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch {
        return null;
      }
    }
    return metadata;
  };

  const handleLeaveDecision = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    const comments = status === "REJECTED" ? prompt("Raison du rejet (optionnel):") || "" : "";
    try {
      const response = await fetch(`/api/conges/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comments })
      });

      if (response.ok) {
        await fetchAllNotifications();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":
        return <Calendar className="w-5 h-5" />;
      case "LEAVE_APPROVED":
      case "PROFILE_APPROVED":
      case "POINTAGE_SUCCESS":
        return <CheckCircle className="w-5 h-5" />;
      case "LEAVE_REJECTED":
      case "PROFILE_REJECTED":
        return <XCircle className="w-5 h-5" />;
      case "POINTAGE_ANOMALY":
        return <AlertTriangle className="w-5 h-5" />;
      case "PROFILE_SUBMITTED":
        return <User className="w-5 h-5" />;
      case "DOCUMENT_REQUIRED":
        return <FileText className="w-5 h-5" />;
      case "SYSTEM_ALERT":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: string, isRead: boolean) => {
    if (isRead) return "text-gray-400";
    switch (type) {
      case "LEAVE_APPROVED":
      case "PROFILE_APPROVED":
      case "POINTAGE_SUCCESS":
        return "text-green-600";
      case "LEAVE_REJECTED":
      case "PROFILE_REJECTED":
        return "text-red-600";
      case "POINTAGE_ANOMALY":
      case "SYSTEM_ALERT":
        return "text-amber-600";
      case "LEAVE_REQUEST":
      case "PROFILE_SUBMITTED":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getPriorityIndicator = (priority: string) => {
    const colors: Record<string, string> = {
      URGENT: "bg-red-500",
      HIGH: "bg-orange-500",
      NORMAL: "bg-blue-500",
      LOW: "bg-gray-400"
    };
    return colors[priority] || colors.NORMAL;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LEAVE_REQUEST: "Demande de congé",
      LEAVE_APPROVED: "Congé approuvé",
      LEAVE_REJECTED: "Congé rejeté",
      POINTAGE_ANOMALY: "Anomalie pointage",
      POINTAGE_SUCCESS: "Pointage validé",
      PROFILE_SUBMITTED: "Profil soumis",
      PROFILE_APPROVED: "Profil approuvé",
      PROFILE_REJECTED: "Profil rejeté",
      DOCUMENT_REQUIRED: "Document requis",
      SYSTEM_ALERT: "Alerte système",
      RH_ACTION_REQUIRED: "Action RH requise",
      GENERAL: "Général"
    };
    return labels[type] || type;
  };

  const getEntityLink = (entityType: string, entityId: string): string => {
    switch (entityType) {
      case "leave_request":
      case "conge":
        return `/rh/conges?id=${entityId}`;
      case "profile":
      case "employee":
        return `/rh/profiles?id=${entityId}`;
      case "pointage":
        return `/pointage?id=${entityId}`;
      default:
        return "#";
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    if (readFilter === "UNREAD" && notif.is_read) return false;
    if (readFilter === "READ" && !notif.is_read) return false;
    if (typeFilter === "LEAVE" && !notif.type.includes("LEAVE")) return false;
    if (typeFilter === "POINTAGE" && !notif.type.includes("POINTAGE")) return false;
    if (typeFilter === "PROFILE" && !notif.type.includes("PROFILE")) return false;
    if (typeFilter === "SYSTEM" && notif.type !== "SYSTEM_ALERT" && notif.type !== "GENERAL") return false;
    if (priorityFilter !== "ALL" && notif.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notif.title.toLowerCase().includes(query) ||
        notif.message.toLowerCase().includes(query) ||
        notif.userName?.toLowerCase().includes(query) ||
        notif.userEmail?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    urgent: notifications.filter(n => n.priority === "URGENT" && !n.is_read).length
  };

  // Access check
  if (session?.user?.role !== "RH" && session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-red-700 dark:text-red-400 font-medium">Accès non autorisé</p>
              <p className="text-red-600 dark:text-red-500 text-sm">Cette page est réservée au personnel RH.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Centre de Notifications
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {stats.unread > 0 
                  ? `${stats.unread} notification${stats.unread > 1 ? 's' : ''} non lue${stats.unread > 1 ? 's' : ''}`
                  : "Toutes les notifications sont lues"
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {stats.unread > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  className="text-sm"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Tout marquer comme lu
                </Button>
              )}
              <Button
                onClick={refreshData}
                variant="outline"
                disabled={refreshing}
                className="text-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white text-sm">Filtres</span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Statut</p>
                <div className="space-y-1">
                  {[
                    { value: "ALL", label: "Toutes", count: stats.total },
                    { value: "UNREAD", label: "Non lues", count: stats.unread },
                    { value: "READ", label: "Lues", count: stats.total - stats.unread }
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setReadFilter(item.value as FilterType)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        readFilter === item.value
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        readFilter === item.value
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      }`}>
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Type</p>
                <div className="space-y-1">
                  {[
                    { value: "ALL", label: "Tous les types" },
                    { value: "LEAVE", label: "Congés" },
                    { value: "POINTAGE", label: "Pointage" },
                    { value: "PROFILE", label: "Profils" },
                    { value: "SYSTEM", label: "Système" }
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setTypeFilter(item.value as TypeFilter)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        typeFilter === item.value
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Priorité</p>
                <div className="space-y-1">
                  {[
                    { value: "ALL", label: "Toutes", color: "bg-gray-400" },
                    { value: "URGENT", label: "Urgente", color: "bg-red-500" },
                    { value: "HIGH", label: "Haute", color: "bg-orange-500" },
                    { value: "NORMAL", label: "Normale", color: "bg-blue-500" },
                    { value: "LOW", label: "Basse", color: "bg-gray-400" }
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setPriorityFilter(item.value as PriorityFilter)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        priorityFilter === item.value
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {item.value !== "ALL" && (
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      )}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Filters */}
              {(readFilter !== "ALL" || typeFilter !== "ALL" || priorityFilter !== "ALL" || searchQuery) && (
                <button
                  onClick={() => {
                    setReadFilter("ALL");
                    setTypeFilter("ALL");
                    setPriorityFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="w-full mt-4 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          {/* Right - Notification List */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* List Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </span>
                {stats.urgent > 0 && (
                  <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
                    {stats.urgent} urgente{stats.urgent > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium mb-1">Aucune notification</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                    {searchQuery || readFilter !== "ALL" || typeFilter !== "ALL" || priorityFilter !== "ALL"
                      ? "Essayez de modifier vos filtres"
                      : "Vous n'avez pas encore de notifications"
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredNotifications.map((notif) => {
                    const metadata = parseMetadata(notif.metadata);
                    const requestId = metadata?.requestId;

                    return (
                      <div
                        key={notif.id}
                        className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          !notif.is_read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Priority Indicator & Icon */}
                          <div className="flex-shrink-0 relative">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              !notif.is_read 
                                ? "bg-gray-100 dark:bg-gray-800" 
                                : "bg-gray-50 dark:bg-gray-800/50"
                            }`}>
                              <span className={getIconColor(notif.type, notif.is_read)}>
                                {getNotificationIcon(notif.type)}
                              </span>
                            </div>
                            <span 
                              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${getPriorityIndicator(notif.priority)}`}
                              title={notif.priority}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={`text-sm font-medium truncate ${
                                !notif.is_read 
                                  ? "text-gray-900 dark:text-white" 
                                  : "text-gray-600 dark:text-gray-400"
                              }`}>
                                {notif.title}
                              </h4>
                              <span 
                                className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap"
                                title={new Date(notif.created_at).toLocaleString('fr-FR')}
                              >
                                {getRelativeTime(notif.created_at)}
                              </span>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                              {notif.message}
                            </p>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mb-3">
                              {notif.userName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {notif.userName}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                                {getTypeLabel(notif.type)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Leave request actions */}
                              {notif.type === "LEAVE_REQUEST" && requestId && !notif.is_read && (
                                <>
                                  <button
                                    onClick={() => handleLeaveDecision(requestId, "APPROVED")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Approuver
                                  </button>
                                  <button
                                    onClick={() => handleLeaveDecision(requestId, "REJECTED")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Rejeter
                                  </button>
                                </>
                              )}
                              
                              {/* Mark as read */}
                              {!notif.is_read && (
                                <button
                                  onClick={() => markAsRead(notif.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Marquer comme lue
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => deleteNotification(notif.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Supprimer
                              </button>

                              {/* View related entity */}
                              {metadata?.entityType && metadata?.entityId && (
                                <Link
                                  href={getEntityLink(metadata.entityType, metadata.entityId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                  Voir détails
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
