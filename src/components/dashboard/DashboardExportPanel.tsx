/**
 * Dashboard Export Panel
 * Quick export actions for dashboard pages
 */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuickExport } from "@/hooks/useExport";
import { Download, Calendar, Users, Clock, FileText, ChevronDown } from "lucide-react";

interface ExportPanelProps {
  className?: string;
  variant?: "compact" | "full";
}

export default function DashboardExportPanel({ 
  className = "", 
  variant = "compact" 
}: ExportPanelProps) {
  const { data: session } = useSession();
  const {
    exportMyPointages,
    exportMyConges,
    exportEmployees,
    exportMonthlyReport,
    exportAuditLogs,
    isExporting,
    error,
    canExport,
  } = useQuickExport();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExpanded, setIsExpanded] = useState(false);

  const userRole = (session?.user as any)?.role || "USER";

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (variant === "compact") {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">Exporter des données</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Téléchargez vos rapports
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700">
            {/* Date selector */}
            <div className="flex gap-2 pt-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Export buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => exportMyPointages(selectedMonth, selectedYear)}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
              >
                <Clock className="w-4 h-4" />
                Mes pointages
              </button>

              <button
                onClick={() => exportMyConges()}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
              >
                <Calendar className="w-4 h-4" />
                Mes congés
              </button>

              {["RH", "SUPER_ADMIN"].includes(userRole) && (
                <>
                  <button
                    onClick={() => exportEmployees()}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-sm font-medium"
                  >
                    <Users className="w-4 h-4" />
                    Employés
                  </button>

                  <button
                    onClick={() => exportMonthlyReport(selectedYear, selectedMonth)}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Rapport mensuel
                  </button>
                </>
              )}
            </div>

            {/* Loading/Error state */}
            {isExporting && (
              <div className="flex items-center justify-center gap-2 py-2 text-blue-600 dark:text-blue-400">
                <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                <span className="text-sm">Génération en cours...</span>
              </div>
            )}

            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Centre d'export
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Téléchargez vos rapports et données
            </p>
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Période
        </label>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-32 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Export grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* My Attendance */}
        <button
          onClick={() => exportMyPointages(selectedMonth, selectedYear)}
          disabled={isExporting}
          className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all group"
        >
          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white">
              Mes pointages
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Relevé personnel du mois
            </p>
          </div>
        </button>

        {/* My Leaves */}
        <button
          onClick={() => exportMyConges()}
          disabled={isExporting}
          className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all group"
        >
          <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white">
              Mes congés
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Historique des demandes
            </p>
          </div>
        </button>

        {/* RH/Admin exports */}
        {["RH", "SUPER_ADMIN"].includes(userRole) && (
          <>
            <button
              onClick={() => exportEmployees()}
              disabled={isExporting}
              className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Liste employés
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tous les employés actifs
                </p>
              </div>
            </button>

            <button
              onClick={() => exportMonthlyReport(selectedYear, selectedMonth)}
              disabled={isExporting}
              className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Rapport mensuel
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Synthèse complète du mois
                </p>
              </div>
            </button>
          </>
        )}

        {/* Admin only - Audit logs */}
        {userRole === "SUPER_ADMIN" && (
          <button
            onClick={() => {
              const startDate = new Date(selectedYear, selectedMonth - 1, 1);
              const endDate = new Date(selectedYear, selectedMonth, 0);
              exportAuditLogs(startDate, endDate);
            }}
            disabled={isExporting}
            className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all group sm:col-span-2"
          >
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">
                Logs d'audit
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Journal des actions système
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Loading state */}
      {isExporting && (
        <div className="mt-6 flex items-center justify-center gap-3 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <span className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            Génération de l'export en cours...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
