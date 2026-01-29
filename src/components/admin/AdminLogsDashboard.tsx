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
  ChevronsLeft,
  ChevronsRight,
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
  Eye,
  Globe,
  Database,
  TrendingUp,
  Sparkles,
  ChevronDown,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
      {/* Professional Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-100 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Journal d'audit
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Suivi en temps réel de toutes les actions système
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  showStats 
                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30" 
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="hidden sm:inline">Statistiques</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  showFilters 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30" 
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <Filter className="h-5 w-5" />
                <span className="hidden sm:inline">Filtres</span>
              </button>
              <button
                onClick={() => fetchLogs()}
                disabled={loading}
                className="p-2.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition-all"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <div className="relative group">
                <button
                  disabled={exporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  Exporter
                </button>
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Export JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Stats Section */}
        {showStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">Total</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{stats.totalLogs.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Événements enregistrés</p>
              </div>
            </div>

            <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Info className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Info</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{(stats.bySeverity.INFO || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Logs informatifs</p>
              </div>
            </div>

            <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">Attention</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{(stats.bySeverity.WARNING || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avertissements</p>
              </div>
            </div>

            <div className="group bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                  {((stats.bySeverity.ERROR || 0) + (stats.bySeverity.CRITICAL || 0)) > 0 && (
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-full animate-pulse">Critique</span>
                  )}
                </div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{((stats.bySeverity.ERROR || 0) + (stats.bySeverity.CRITICAL || 0)).toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Erreurs & Critiques</p>
              </div>
            </div>
          </div>
        )}

        {/* Modern Filters Section */}
        {showFilters && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Filtres avancés</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Affinez votre recherche dans les logs</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Rechercher..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                >
                  <option value="">Toutes les actions</option>
                  {actionTypes.map(action => (
                    <option key={action} value={action}>
                      {formatActionLabel(action)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Type d'entité
                </label>
                <select
                  value={filters.entityType}
                  onChange={(e) => setFilters(f => ({ ...f, entityType: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                >
                  <option value="">Tous les types</option>
                  {entityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Sévérité
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                >
                  <option value="">Toutes</option>
                  <option value="INFO">🔵 Info</option>
                  <option value="WARNING">🟠 Warning</option>
                  <option value="ERROR">🟠 Error</option>
                  <option value="CRITICAL">🔴 Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Date début
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Date fin
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modern Logs Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Journal des activités</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {pagination.totalCount} entrées • Page {pagination.page} sur {pagination.totalPages}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Cliquez sur une ligne pour voir les détails
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Date/Heure
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Sévérité
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5" />
                      Action
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5" />
                      Entité
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Utilisateur
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" />
                      IP
                    </div>
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5" />
                      Détails
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
                          <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Chargement en cours</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Récupération des logs...</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center">
                          <FileText className="h-10 w-10 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Aucun log trouvé</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Essayez de modifier vos filtres</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr 
                      key={log.id}
                      className="group hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-purple-50/30 dark:hover:from-violet-900/10 dark:hover:to-purple-900/5 cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                            <Clock className="h-4 w-4 text-gray-500 group-hover:text-violet-600 transition-colors" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white block">
                              {formatDate(new Date(log.createdAt), "dd MMM yyyy", { locale: fr })}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(new Date(log.createdAt), "HH:mm:ss", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${SEVERITY_CONFIG[log.severity]?.bg}`}>
                          <SeverityIcon severity={log.severity} />
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatActionLabel(log.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
                            {log.entityType}
                          </span>
                          {log.entityId && (
                            <span className="text-xs text-gray-400 font-mono">
                              #{log.entityId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {log.user ? (
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {log.user.name?.[0]}{log.user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {log.user.name} {log.user.lastName}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                log.user.roleEnum === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                log.user.roleEnum === 'RH' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {log.user.roleEnum}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Système</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-300">
                          <Globe className="h-3 w-3" />
                          {log.ipAddress || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg text-xs font-semibold hover:from-violet-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md">
                          <Eye className="h-3.5 w-3.5" />
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modern Pagination */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 px-5 py-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                <FileText className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {((pagination.page - 1) * pagination.limit) + 1}
                </span>{" "}à{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                </span>{" "}sur{" "}
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {pagination.totalCount}
                </span>{" "}résultats
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPagination(p => ({ ...p, page: 1 }))}
                disabled={pagination.page <= 1}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-50 dark:hover:bg-gray-600 hover:border-violet-300 transition-all"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-50 dark:hover:bg-gray-600 hover:border-violet-300 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pagination.page}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {pagination.totalPages}
                </span>
              </div>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-50 dark:hover:bg-gray-600 hover:border-violet-300 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.totalPages }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-50 dark:hover:bg-gray-600 hover:border-violet-300 transition-all"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Log Detail Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden">
              {/* Modal Header with Gradient */}
              <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Détails du log
                      </h3>
                      <p className="text-violet-200 text-sm">
                        {formatDate(new Date(selectedLog.createdAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">ID</label>
                    <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white break-all">{selectedLog.id}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Sévérité</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${SEVERITY_CONFIG[selectedLog.severity]?.bg}`}>
                        <SeverityIcon severity={selectedLog.severity} />
                        {selectedLog.severity}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Action</label>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatActionLabel(selectedLog.action)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Entité</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg font-medium">
                        {selectedLog.entityType}
                      </span>
                      {selectedLog.entityId && (
                        <span className="ml-2 text-gray-500 font-mono text-xs">
                          {selectedLog.entityId}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Adresse IP</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-mono text-gray-900 dark:text-white">
                        {selectedLog.ipAddress || "Non disponible"}
                      </p>
                    </div>
                  </div>
                </div>
              
                {selectedLog.user && (
                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-violet-100 dark:border-violet-800/30">
                    <label className="text-xs text-violet-600 dark:text-violet-400 uppercase font-semibold tracking-wider">Utilisateur</label>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/30">
                        {selectedLog.user.name?.[0]}{selectedLog.user.lastName?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {selectedLog.user.name} {selectedLog.user.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedLog.user.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedLog.user.roleEnum === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        selectedLog.user.roleEnum === 'RH' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {selectedLog.user.roleEnum}
                      </span>
                    </div>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider flex items-center gap-2">
                      <Database className="h-3.5 w-3.5" />
                      Métadonnées
                    </label>
                    <pre className="mt-2 p-4 bg-gray-900 rounded-xl text-xs text-emerald-400 overflow-auto font-mono leading-relaxed">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.changes && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Modifications
                    </label>
                    <pre className="mt-2 p-4 bg-gray-900 rounded-xl text-xs text-amber-400 overflow-auto font-mono leading-relaxed">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">User Agent</label>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 break-all">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
