"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  FiBell, FiFilter, FiPrinter, FiCheckCircle, FiXCircle, 
  FiAlertCircle, FiClock, FiUser, FiCalendar, FiRefreshCw,
  FiEye, FiTrash2, FiAlertTriangle
} from "react-icons/fi";
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

export default function NotificationCenterPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "LEAVE_REQUEST" | "POINTAGE" | "PROFILE">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "URGENT" | "HIGH" | "NORMAL">("ALL");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllNotifications();
  }, []);

  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      // Fetch all notifications for RH/Admin
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
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      await fetchAllNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette notification ?")) return;
    
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      await fetchAllNotifications();
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
    const comments = status === "REJECTED" ? prompt("Raison du رفض (optionnel):") || "" : "";
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
        alert(data.error || "Erreur lors de la mise à jour de la demande");
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      alert("Erreur lors de la mise à jour de la demande");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":
        return <FiCalendar className="w-6 h-6 text-blue-500" />;
      case "LEAVE_APPROVED":
        return <FiCheckCircle className="w-6 h-6 text-green-500" />;
      case "LEAVE_REJECTED":
        return <FiXCircle className="w-6 h-6 text-red-500" />;
      case "POINTAGE_ANOMALY":
        return <FiAlertCircle className="w-6 h-6 text-orange-500" />;
      case "POINTAGE_SUCCESS":
        return <FiCheckCircle className="w-6 h-6 text-green-500" />;
      case "PROFILE_SUBMITTED":
        return <FiUser className="w-6 h-6 text-violet-500" />;
      case "PROFILE_APPROVED":
        return <FiCheckCircle className="w-6 h-6 text-green-500" />;
      case "PROFILE_REJECTED":
        return <FiXCircle className="w-6 h-6 text-red-500" />;
      default:
        return <FiBell className="w-6 h-6 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      URGENT: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Urgent" },
      HIGH: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", label: "Haute" },
      NORMAL: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Normal" },
      LOW: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-400", label: "Basse" }
    };
    const config = configs[priority as keyof typeof configs] || configs.NORMAL;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === "UNREAD" && notif.is_read) return false;
    if (filter === "LEAVE_REQUEST" && !notif.type.includes("LEAVE")) return false;
    if (filter === "POINTAGE" && !notif.type.includes("POINTAGE")) return false;
    if (filter === "PROFILE" && !notif.type.includes("PROFILE")) return false;
    if (priorityFilter !== "ALL" && notif.priority !== priorityFilter) return false;
    return true;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    urgent: notifications.filter(n => n.priority === "URGENT").length,
    leaveRequests: notifications.filter(n => n.type === "LEAVE_REQUEST").length
  };

  if (session?.user?.role !== "RH" && session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">Accès non autorisé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Centre de Notifications RH
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez toutes les notifications et demandes des employés
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={refreshData}
                disabled={refreshing}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
              >
                <FiRefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white print:hidden"
              >
                <FiPrinter className="w-5 h-5 mr-2" />
                Imprimer
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <FiBell className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Non lues</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.unread}</p>
              </div>
              <FiAlertCircle className="w-10 h-10 text-orange-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Urgentes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.urgent}</p>
              </div>
              <FiAlertTriangle className="w-10 h-10 text-red-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Demandes congés</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.leaveRequests}</p>
              </div>
              <FiCalendar className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Filtres</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {["ALL", "UNREAD", "LEAVE_REQUEST", "POINTAGE", "PROFILE"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {f === "ALL" ? "Tout" : f === "UNREAD" ? "Non lues" : f === "LEAVE_REQUEST" ? "Congés" : f === "POINTAGE" ? "Pointage" : "Profils"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {["ALL", "URGENT", "HIGH", "NORMAL"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  priorityFilter === p
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {p === "ALL" ? "Toutes priorités" : p === "URGENT" ? "🔴 Urgent" : p === "HIGH" ? "🟠 Haute" : "🔵 Normal"}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 p-5 text-white">
            <h3 className="text-lg font-bold">
              {filteredNotifications.length} notification{filteredNotifications.length > 1 ? 's' : ''}
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <FiRefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FiBell className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune notification</p>
              <p className="text-sm mt-1">Modifiez les filtres pour voir plus de résultats</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notif) => {
                const metadata = parseMetadata(notif.metadata);
                const requestId = metadata?.requestId;

                return (
                <div
                  key={notif.id}
                  className={`p-6 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !notif.is_read ? "bg-violet-50 dark:bg-violet-900/10" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`p-3 rounded-xl ${
                        !notif.is_read ? "bg-violet-100 dark:bg-violet-900/30" : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className={`font-bold text-lg ${
                            !notif.is_read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                          }`}>
                            {notif.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notif.message}
                          </p>
                        </div>
                        {getPriorityBadge(notif.priority)}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-3">
                        <span className="flex items-center gap-1">
                          <FiUser className="w-3 h-3" />
                          {notif.userName || notif.userEmail || "Utilisateur"}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {new Date(notif.created_at).toLocaleString('fr-FR')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          !notif.is_read 
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" 
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {notif.is_read ? "✓ Lue" : "Non lue"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {notif.type === "LEAVE_REQUEST" && requestId && (
                          <>
                            <button
                              onClick={() => handleLeaveDecision(requestId, "APPROVED")}
                              className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                              Approuver
                            </button>
                            <button
                              onClick={() => handleLeaveDecision(requestId, "REJECTED")}
                              className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-sm font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-1"
                            >
                              <FiXCircle className="w-4 h-4" />
                              Rejeter
                            </button>
                          </>
                        )}
                        {!notif.is_read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                          >
                            <FiCheckCircle className="w-4 h-4" />
                            Marquer comme lue
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .dark\\:bg-gray-800,
          .dark\\:bg-gray-900 {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
