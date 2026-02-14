"use client";

/**
 * Admin Global Payroll Analytics
 * 
 * Yearly overview with monthly trends for:
 * - Payroll totals  
 * - Attendance rates
 * - Leave usage  
 * - Headcount
 */

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  DollarSign,
  Clock,
} from "lucide-react";

interface MonthlyTrend {
  month: number;
  year: number;
  totalPayroll: number;
  averageSalary: number;
  employeeCount: number;
  attendanceRate: number;
  leavesTaken: number;
  rewardDays: number;
}

interface YearOverview {
  year: number;
  totalPayroll: number;
  avgMonthlyCost: number;
  totalEmployees: number;
  avgAttendanceRate: number;
  totalLeavesTaken: number;
  totalRewardDays: number;
  monthlyTrends: MonthlyTrend[];
}

export default function AdminAnalytics() {
  const [data, setData] = useState<YearOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAnalytics();
  }, [selectedYear]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/analytics?type=admin-dashboard&year=${selectedYear}`);
      if (res.ok) {
        const raw = await res.json();
        setData({
          year: raw.year ?? selectedYear,
          totalPayroll: raw.totalPayroll ?? 0,
          avgMonthlyCost: raw.avgMonthlyCost ?? 0,
          totalEmployees: raw.totalEmployees ?? 0,
          avgAttendanceRate: raw.avgAttendanceRate ?? 0,
          totalLeavesTaken: raw.totalLeavesTaken ?? 0,
          totalRewardDays: raw.totalRewardDays ?? 0,
          monthlyTrends: (raw.monthlyTrends ?? []).map((t: any) => ({
            month: t.month ?? 0,
            year: t.year ?? selectedYear,
            totalPayroll: t.totalPayroll ?? 0,
            averageSalary: t.averageSalary ?? 0,
            employeeCount: t.employeeCount ?? 0,
            attendanceRate: t.attendanceRate ?? 0,
            leavesTaken: t.leavesTaken ?? 0,
            rewardDays: t.rewardDays ?? 0,
          })),
        });
      }
    } catch {
      console.error("Failed to fetch admin analytics");
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
    "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible pour cette année.</p>
      </div>
    );
  }

  const maxPayroll = Math.max(...(data.monthlyTrends?.map(t => t.totalPayroll) || [1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <PieChart className="w-7 h-7 text-indigo-600" />
          Analytique Globale
        </h2>

        <select
          value={selectedYear}
          onChange={e => setSelectedYear(parseInt(e.target.value))}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Year Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard
          label="Masse salariale annuelle"
          value={`${data.totalPayroll.toLocaleString("fr-FR")} TND`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard
          label="Coût mensuel moyen"
          value={`${data.avgMonthlyCost.toLocaleString("fr-FR")} TND`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard
          label="Effectif total"
          value={data.totalEmployees}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
        />
        <SummaryCard
          label="Taux de présence moy."
          value={`${data.avgAttendanceRate.toFixed(1)}%`}
          icon={<Clock className="w-5 h-5" />}
          color="emerald"
        />
        <SummaryCard
          label="Congés utilisés"
          value={`${data.totalLeavesTaken} j`}
          icon={<Calendar className="w-5 h-5" />}
          color="amber"
        />
        <SummaryCard
          label="Jours de prime"
          value={`${data.totalRewardDays} j`}
          icon={<TrendingDown className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Monthly Payroll Trend Chart */}
      {data.monthlyTrends && data.monthlyTrends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Évolution de la masse salariale — {selectedYear}
          </h3>

          {/* Bar Chart */}
          <div className="flex items-end gap-2 h-48">
            {data.monthlyTrends.map(trend => {
              const heightPct = maxPayroll > 0 ? (trend.totalPayroll / maxPayroll) * 100 : 0;
              return (
                <div key={trend.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {trend.totalPayroll > 0 ? `${(trend.totalPayroll / 1000).toFixed(0)}k` : "—"}
                  </span>
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t-md transition-all duration-500 min-h-[4px]"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${monthNames[trend.month - 1]}: ${trend.totalPayroll.toLocaleString("fr-FR")} TND`}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{monthNames[trend.month - 1]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Details Table */}
      {data.monthlyTrends && data.monthlyTrends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Détails mensuels
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Mois</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Effectif</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Masse salariale</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Salaire moy.</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Présence</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Congés</th>
                  <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Primes</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyTrends.map(trend => (
                  <tr key={trend.month} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{monthNames[trend.month - 1]} {trend.year}</td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{trend.employeeCount}</td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{trend.totalPayroll.toLocaleString("fr-FR")} TND</td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{trend.averageSalary.toLocaleString("fr-FR")} TND</td>
                    <td className="py-3 px-2 text-right">
                      <span className={trend.attendanceRate >= 90 ? "text-green-600" : trend.attendanceRate >= 75 ? "text-yellow-600" : "text-red-600"}>
                        {trend.attendanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{trend.leavesTaken}</td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{trend.rewardDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "amber" | "indigo" | "purple" | "emerald";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className={`p-2 rounded-lg ${colors[color]} w-fit mb-2`}>{icon}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
