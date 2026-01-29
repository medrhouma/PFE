/**
 * Admin Logs Dashboard
 * Comprehensive audit log viewer with filters, search, and export
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Shield,
  Search,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  Clock,
  User,
  Activity,
  FileText,
  BarChart3,
  Calendar,
  X,
} from "lucide-react";
import { format as formatDate, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    lastName: string | null;
    email: string;
    roleEnum: string;
  } | null;
}

interface LogStats {
  totalLogs: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byEntityType: Record<string, number>;
  recentActivity: { hour: string; count: number }[];
}

interface Filters {
  search: string;
  action: string;
  entityType: string;
  severity: string;
  startDate: string;
  endDate: string;
}

const SEVERITY_CONFIG = {
  INFO: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ERROR: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
  CRITICAL: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
  LOGIN_FAILED: "Échec connexion",
  COOKIE_CONSENT_ACCEPTED: "Cookies acceptés",
  COOKIE_CONSENT_REJECTED: "Cookies refusés",
  COOKIE_CONSENT_CUSTOMIZED: "Cookies personnalisés",
  FACE_VERIFY_SUCCESS: "Vérif. faciale OK",
  FACE_VERIFY_FAILED: "Vérif. faciale échouée",
  POINTAGE_ENTREE: "Pointage entrée",
  POINTAGE_SORTIE: "Pointage sortie",
  LEAVE_REQUEST_CREATED: "Demande congé créée",
  LEAVE_REQUEST_APPROVED: "Congé approuvé",
  LEAVE_REQUEST_REJECTED: "Congé refusé",
  EMPLOYEE_APPROVED: "Employé validé",
  EMPLOYEE_REJECTED: "Employé refusé",
  DOCUMENT_UPLOADED: "Document uploadé",
  SECURITY_RATE_LIMIT: "Rate limit atteint",
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
};

export default function AdminLogsDashboard() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<Filters>({
    search: "",
    action: "",
    entityType: "",
    severity: "",
    startDate: formatDate(subDays(new Date(), 7), "yyyy-MM-dd"),
    endDate: formatDate(new Date(), "yyyy-MM-dd"),
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [actionsRes, entitiesRes] = await Promise.all([
        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "actionTypes" }),
        }),
        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "entityTypes" }),
        }),
      ]);

      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setActionTypes(data.data || []);
      }
      if (entitiesRes.ok) {
        const data = await entitiesRes.json();
        setEntityTypes(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stats",
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [filters.startDate, filters.endDate]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.action && { action: filters.action }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.startDate && { startDate: startOfDay(new Date(filters.startDate)).toISOString() }),
        ...(filters.endDate && { endDate: endOfDay(new Date(filters.endDate)).toISOString() }),
      });

      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setPagination(prev => ({
          ...prev,
          totalCount: data.pagination?.totalCount || 0,
          totalPages: data.pagination?.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Export logs
  const handleExport = async (format: "json" | "csv") => {
    setExporting(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "export",
          format,
          ...filters,
          startDate: filters.startDate ? startOfDay(new Date(filters.startDate)).toISOString() : undefined,
          endDate: filters.endDate ? endOfDay(new Date(filters.endDate)).toISOString() : undefined,
        }),
      });

      if (res.ok) {
        if (format === "csv") {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `audit_logs_${formatDate(new Date(), "yyyy-MM-dd")}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `audit_logs_${formatDate(new Date(), "yyyy-MM-dd")}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error("Error exporting logs:", error);
    } finally {
      setExporting(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [showStats, fetchStats]);

  // Reset page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters]);

  const SeverityIcon = ({ severity }: { severity: string }) => {
    const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.INFO;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const formatActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Shield className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Journal d'audit
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Suivi de toutes les actions système
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`p-2 rounded-lg transition-colors ${
                  showStats 
                    ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30" 
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters 
                    ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30" 
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Filter className="h-5 w-5" />
              </button>
              <button
                onClick={() => fetchLogs()}
                disabled={loading}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <div className="relative group">
                <button
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exporter
                </button>
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Section */}
        {showStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Logs</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalLogs.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Info className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Info</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(stats.bySeverity.INFO || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(stats.bySeverity.WARNING || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Errors/Critical</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {((stats.bySeverity.ERROR || 0) + (stats.bySeverity.CRITICAL || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Rechercher..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Toutes</option>
                  {actionTypes.map(action => (
                    <option key={action} value={action}>
                      {formatActionLabel(action)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type d'entité
                </label>
                <select
                  value={filters.entityType}
                  onChange={(e) => setFilters(f => ({ ...f, entityType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Tous</option>
                  {entityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sévérité
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Toutes</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Error</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date début
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date fin
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date/Heure
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sévérité
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Entité
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">Aucun log trouvé</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr 
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_CONFIG[log.severity]?.bg}`}>
                          <SeverityIcon severity={log.severity} />
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {log.entityType}
                          {log.entityId && (
                            <span className="text-gray-400 ml-1">
                              #{log.entityId.slice(0, 8)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                              <User className="h-3 w-3 text-violet-600" />
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {log.user.name} {log.user.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{log.user.roleEnum}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {log.ipAddress || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-violet-600 hover:text-violet-700 text-sm font-medium">
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{" "}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} sur{" "}
              {pagination.totalCount} résultats
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Détails du log
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">ID</label>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Date</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Action</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatActionLabel(selectedLog.action)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Sévérité</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_CONFIG[selectedLog.severity]?.bg}`}>
                    <SeverityIcon severity={selectedLog.severity} />
                    {selectedLog.severity}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Entité</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedLog.entityType} {selectedLog.entityId && `(${selectedLog.entityId})`}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Adresse IP</label>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {selectedLog.ipAddress || "-"}
                  </p>
                </div>
              </div>
              
              {selectedLog.user && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Utilisateur</label>
                  <div className="mt-1 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedLog.user.name} {selectedLog.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{selectedLog.user.email}</p>
                      <span className="text-xs text-violet-600 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                        {selectedLog.user.roleEnum}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Métadonnées</label>
                  <pre className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.changes && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Modifications</label>
                  <pre className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 overflow-auto">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">User Agent</label>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
