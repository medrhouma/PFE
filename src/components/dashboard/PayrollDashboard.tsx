"use client";

/**
 * RH Payroll Dashboard
 * 
 * Displays for RH/Admin:
 * - Salary preview for all employees
 * - Attendance anomalies
 * - Pending leave approvals
 * - Generate/approve payroll actions
 */

import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  AlertTriangle,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PendingLeave {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  duration: number;
  status: string;
}

interface Anomaly {
  id: string;
  userId: string;
  userName: string;
  date: string;
  sessionType: string;
  reason: string;
}

interface SalaryPreview {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  netSalary: number;
  deductions: number;
  status: string;
}

interface DashboardStats {
  totalActiveEmployees: number;
  pendingLeaveCount: number;
  anomalyCount: number;
  totalPayroll: number;
}

interface RHDashboardData {
  pendingLeaves: PendingLeave[];
  anomalies: Anomaly[];
  salaryPreview: SalaryPreview[];
  stats: DashboardStats;
}

export default function PayrollDashboard() {
  const { t, language } = useLanguage();
  const locale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR';
  const [data, setData] = useState<RHDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth, selectedYear]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/payroll/analytics?type=rh-dashboard&year=${selectedYear}&month=${selectedMonth}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      console.error("Failed to fetch RH dashboard");
    } finally {
      setLoading(false);
    }
  };

  const generatePayroll = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generateAll: true,
          year: selectedYear,
          month: selectedMonth,
        }),
      });

      if (res.ok) {
        await fetchDashboard();
      }
    } catch {
      console.error("Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleDateString(locale, { month: 'long' })
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          {t('pd_payroll_dashboard')}
        </h2>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {monthNames.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={generatePayroll}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? t('pd_calculating') : t('pd_generate_payroll')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label={t('pd_active_employees')}
            value={data.stats.totalActiveEmployees}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatsCard
            label={t('pd_pending_leaves')}
            value={data.stats.pendingLeaveCount}
            icon={<Calendar className="w-5 h-5" />}
            color="yellow"
          />
          <StatsCard
            label={t('pd_anomalies')}
            value={data.stats.anomalyCount}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
          <StatsCard
            label={t('pd_payroll_total')}
            value={`${data.stats.totalPayroll.toLocaleString(locale)} TND`}
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
          />
        </div>
      )}

      {/* Salary Preview Table */}
      {data?.salaryPreview && data.salaryPreview.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            {t('pd_salary_preview')} — {monthNames[selectedMonth - 1]} {selectedYear}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('pd_employee')}</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('pd_base')}</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('pd_deductions')}</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('pd_net')}</th>
                  <th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.salaryPreview.map(emp => (
                  <tr key={emp.employeeId} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{emp.employeeName}</td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{emp.baseSalary.toLocaleString(locale)} TND</td>
                    <td className="py-3 px-2 text-right text-red-600 dark:text-red-400">-{emp.deductions.toLocaleString(locale)}</td>
                    <td className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-white">{emp.netSalary.toLocaleString(locale)} TND</td>
                    <td className="py-3 px-2 text-center">
                      <StatusBadge status={emp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Leaves */}
      {data?.pendingLeaves && data.pendingLeaves.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            {t('pd_pending_leave_requests')} ({data.pendingLeaves.length})
          </h3>

          <div className="space-y-3">
            {data.pendingLeaves.map(leave => (
              <div
                key={leave.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{leave.userName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {leave.type} • {leave.duration} {t('pd_day')}{leave.duration !== 1 ? "s" : ""}
                    {leave.isHalfDay && ` (${t('pd_half_day')})`}
                    {" • "}
                    {new Date(leave.startDate).toLocaleDateString(locale)}
                    {leave.startDate !== leave.endDate && ` - ${new Date(leave.endDate).toLocaleDateString(locale)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {data?.anomalies && data.anomalies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            {t('pd_attendance_anomalies')} ({data.anomalies.length})
          </h3>

          <div className="space-y-2">
            {data.anomalies.map(anomaly => (
              <div
                key={anomaly.id}
                className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{anomaly.userName}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {anomaly.reason} — {new Date(anomaly.date).toLocaleDateString(locale)} ({anomaly.sessionType})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "yellow";
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
    CALCULATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    REVIEWED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    PAID: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  );
}
