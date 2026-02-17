'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  ChevronLeft, ChevronRight, Search, Eye,
  ArrowLeft, RefreshCw, TrendingDown, Phone, Briefcase,
  Calendar, Clock, DollarSign,
} from 'lucide-react';

/* ═══════════════════ TYPES ═══════════════════ */

interface DayInfo {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
}

interface DailyStatus {
  status: 'present' | 'partial' | 'absent' | 'leave' | 'weekend';
  morningIn: string | null;
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
  totalMinutes: number;
  hasAnomaly: boolean;
  leaveType?: string;
}

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  typeContrat: string | null;
  baseSalary: number | null;
  workedDays: number;
  absentDays: number;
  leaveDays: number;
  totalHours: number;
  totalMinutes: number;
  anomalies: number;
  attendanceRate: number;
  expectedDays: number;
  daily: Record<string, DailyStatus>;
}

interface OverviewData {
  year: number;
  month: number;
  daysInMonth: number;
  workingDaysCount: number;
  totalEmployees: number;
  days: DayInfo[];
  employees: EmployeeRow[];
}

/* Employee detail types */
interface DailyDetail {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  status: 'present' | 'partial' | 'absent' | 'leave' | 'weekend';
  morning: { checkIn: string | null; checkOut: string | null; duration: number | null } | null;
  afternoon: { checkIn: string | null; checkOut: string | null; duration: number | null } | null;
  totalMinutes: number;
  leaveType: string | null;
  anomaly: string | null;
}

interface EmployeeArchive {
  employee: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    telephone: string | null;
    typeContrat: string | null;
    dateEmbauche: string | null;
    baseSalary: number | null;
    hourlyRate: number | null;
    annualLeave: number;
    adresse: string | null;
    sexe: string | null;
    birthday: string | null;
    rib: string | null;
    status: string;
    createdAt: string;
  };
  year: number;
  month: number;
  daysInMonth: number;
  workingDaysCount: number;
  summary: {
    presentDays: number;
    partialDays: number;
    absentDays: number;
    leaveDays: number;
    totalWorkedHours: number;
    totalWorkedMinutes: number;
    anomalies: number;
    attendanceRate: number;
  };
  dailyBreakdown: DailyDetail[];
  leaveRequests: {
    id: string;
    type: string;
    dateDebut: string;
    dateFin: string;
    status: string;
    durationDays: number | null;
  }[];
  leaveBalance: {
    annualAllowance: number;
    used: number;
    pending: number;
    remaining: number;
  };
  salary: {
    baseSalary: number | null;
    grossSalary: number | null;
    netSalary: number | null;
    deductions: number | null;
    status: string;
  } | null;
}

/* ═══════════════════ HELPERS ═══════════════════ */

const MONTH_NAMES = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAY_NAMES_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TND';
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    present:  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Présent' },
    partial:  { bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400',     label: 'Partiel' },
    absent:   { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-700 dark:text-red-400',         label: 'Absent' },
    leave:    { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-400',       label: 'Congé' },
    weekend:  { bg: 'bg-gray-100 dark:bg-gray-800',          text: 'text-gray-400 dark:text-gray-500',       label: '—' },
  };
  const s = map[status] || map.absent;
  return s;
}

function cellLetter(status: string): { letter: string; bg: string; text: string } {
  const map: Record<string, { letter: string; bg: string; text: string }> = {
    present: { letter: 'P', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400' },
    partial: { letter: '½', bg: 'bg-amber-100 dark:bg-amber-900/40',   text: 'text-amber-700 dark:text-amber-400' },
    absent:  { letter: 'A', bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-400' },
    leave:   { letter: 'C', bg: 'bg-blue-100 dark:bg-blue-900/40',     text: 'text-blue-700 dark:text-blue-400' },
    weekend: { letter: '—', bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-400 dark:text-gray-500' },
  };
  return map[status] || map.absent;
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */

export default function RHAttendanceDashboard() {
  const { data: session } = useSession();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'anomaly'>('all');

  /* detail view */
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [archive, setArchive] = useState<EmployeeArchive | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveYear, setArchiveYear] = useState(now.getFullYear());
  const [archiveMonth, setArchiveMonth] = useState(now.getMonth() + 1);

  /* ─── Fetch overview ─── */
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rh/attendance-overview?year=${year}&month=${month}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Overview fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  /* ─── Fetch employee archive ─── */
  const fetchArchive = useCallback(async (empId: string, y: number, m: number) => {
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/rh/employee-archive/${empId}?year=${y}&month=${m}`);
      if (res.ok) setArchive(await res.json());
    } catch (e) {
      console.error('Archive fetch error:', e);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const openEmployee = (empId: string) => {
    setSelectedEmployee(empId);
    setArchiveYear(year);
    setArchiveMonth(month);
    fetchArchive(empId, year, month);
  };

  const changeArchiveMonth = (dir: -1 | 1) => {
    let newM = archiveMonth + dir;
    let newY = archiveYear;
    if (newM < 1) { newM = 12; newY--; }
    if (newM > 12) { newM = 1; newY++; }
    setArchiveMonth(newM);
    setArchiveYear(newY);
    if (selectedEmployee) fetchArchive(selectedEmployee, newY, newM);
  };

  /* ─── Month navigation ─── */
  const changeMonth = (dir: -1 | 1) => {
    let newM = month + dir;
    let newY = year;
    if (newM < 1) { newM = 12; newY--; }
    if (newM > 12) { newM = 1; newY++; }
    setMonth(newM);
    setYear(newY);
  };

  /* ─── Filter employees ─── */
  const filteredEmployees = data?.employees.filter((emp) => {
    const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;

    if (filterStatus === 'present') return emp.attendanceRate >= 80;
    if (filterStatus === 'absent') return emp.absentDays > 3;
    if (filterStatus === 'anomaly') return emp.anomalies > 0;
    return true;
  }) || [];

  /* ─── Summary stats ─── */
  const totalPresent = data?.employees.filter((e) => {
    const today = new Date().toISOString().split('T')[0];
    return e.daily[today]?.status === 'present' || e.daily[today]?.status === 'partial';
  }).length || 0;
  const totalAbsent = (data?.totalEmployees || 0) - totalPresent;

  /* ═══════════════════ EMPLOYEE DETAIL VIEW ═══════════════════ */
  if (selectedEmployee && archive) {
    return <EmployeeArchiveView
      archive={archive}
      loading={archiveLoading}
      year={archiveYear}
      month={archiveMonth}
      onBack={() => { setSelectedEmployee(null); setArchive(null); }}
      onChangeMonth={changeArchiveMonth}
      onRecalculate={async () => {
        try {
          await fetch('/api/payroll/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: selectedEmployee, year: archiveYear, month: archiveMonth }),
          });
          fetchArchive(selectedEmployee, archiveYear, archiveMonth);
        } catch (e) {
          console.error('Salary recalc error:', e);
        }
      }}
    />;
  }

  /* ═══════════════════ LOADING STATE ═══════════════════ */
  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Chargement des données de présence...</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════ OVERVIEW TABLE VIEW ═══════════════════ */
  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-950 dark:via-indigo-950 dark:to-blue-950 rounded-2xl shadow-xl">
        <div className="relative px-6 py-8 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-200 mb-1">Tableau de bord RH</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Suivi de Présence
              </h1>
              <p className="text-blue-100/80 mt-1">Vue globale du pointage de tous les employés</p>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-xl p-1.5">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 text-center min-w-[180px]">
                <p className="text-lg font-bold text-white">{MONTH_NAMES[month]} {year}</p>
                <p className="text-xs text-blue-200">{data?.workingDaysCount || 0} jours ouvrables</p>
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard symbol="#" label="Total Employés" value={data?.totalEmployees || 0} color="blue" />
        <StatCard symbol="P" label="Présents Aujourd'hui" value={totalPresent} color="emerald" />
        <StatCard symbol="A" label="Absents Aujourd'hui" value={totalAbsent} color="red" />
        <StatCard symbol="!" label="Anomalies (mois)" value={data?.employees.reduce((s, e) => s + e.anomalies, 0) || 0} color="amber" />
      </div>

      {/* ─── Filters ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            {([
              { key: 'all', label: 'Tous', sym: '∀' },
              { key: 'present', label: 'Assidus', sym: 'P' },
              { key: 'absent', label: 'Absences', sym: 'A' },
              { key: 'anomaly', label: 'Anomalies', sym: '!' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === f.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="text-xs font-bold w-4 text-center">{f.sym}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={fetchOverview} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Main Attendance Table ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80">
                <th className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800/80 px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[220px] border-r border-gray-200 dark:border-gray-700">
                  Employé
                </th>
                {data?.days.map((day) => {
                  const d = new Date(day.date);
                  const isToday = day.date === now.toISOString().split('T')[0];
                  return (
                    <th
                      key={day.date}
                      className={`px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wider min-w-[36px] ${
                        day.isWeekend
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                          : isToday
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <div>{DAY_NAMES_SHORT[day.dayOfWeek]}</div>
                      <div className={`text-sm font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {d.getUTCDate()}
                      </div>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-20 bg-gray-50 dark:bg-gray-800/80 px-3 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[80px] border-l border-gray-200 dark:border-gray-700">
                  Taux
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={100} className="py-16 text-center">
                    <span className="text-4xl text-gray-300 dark:text-gray-600 block mb-3">∅</span>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun employé trouvé</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">Modifiez vos filtres de recherche</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                    onClick={() => openEmployee(emp.id)}
                  >
                    {/* Employee name cell */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 px-4 py-3 border-r border-gray-100 dark:border-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{emp.typeContrat || 'N/A'}</p>
                        </div>
                        <span className="text-xs text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto">→</span>
                      </div>
                    </td>

                    {/* Daily attendance cells */}
                    {data?.days.map((day) => {
                      const dayData = emp.daily[day.date];
                      const status = dayData?.status || 'absent';
                      const isToday = day.date === now.toISOString().split('T')[0];
                      const isFuture = new Date(day.date) > now;

                      return (
                        <td
                          key={day.date}
                          className={`px-1 py-3 text-center ${
                            day.isWeekend
                              ? 'bg-gray-50 dark:bg-gray-800/40'
                              : isToday
                              ? 'bg-blue-50/50 dark:bg-blue-900/10'
                              : ''
                          }`}
                        >
                          {(() => {
                            const cl = cellLetter(day.isWeekend ? 'weekend' : isFuture ? 'weekend' : status);
                            return (
                              <div className="relative flex justify-center">
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${cl.bg} ${cl.text} ${
                                  isToday ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-900' : ''
                                } ${isFuture && !day.isWeekend ? 'opacity-30' : ''}`}>
                                  {isFuture && !day.isWeekend ? '·' : cl.letter}
                                </span>
                                {dayData?.hasAnomaly && (
                                  <span className="absolute -top-1 -right-1 text-[8px] font-bold text-red-600 dark:text-red-400">!</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      );
                    })}

                    {/* Attendance rate cell */}
                    <td className="sticky right-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 px-3 py-3 text-center border-l border-gray-100 dark:border-gray-800 transition-colors">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                        emp.attendanceRate >= 90
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : emp.attendanceRate >= 70
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {emp.attendanceRate}%
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-5 text-xs font-medium text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[11px] font-bold">P</span> Présent</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[11px] font-bold">½</span> Partiel</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 flex items-center justify-center text-[11px] font-bold">A</span> Absent</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[11px] font-bold">C</span> Congé</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 flex items-center justify-center text-[11px] font-bold">—</span> Weekend</span>
          <span className="flex items-center gap-1.5"><span className="text-sm font-bold text-red-600 dark:text-red-400">!</span> Anomalie</span>
          <span className="ml-auto text-gray-400 dark:text-gray-500">{filteredEmployees.length} employé(s)</span>
        </div>
      </div>

      {/* ─── Employee Summary Table ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Récapitulatif Mensuel
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Employé</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Contrat</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Jours travaillés</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-red-600 dark:text-red-400 uppercase">Absences</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Congés</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Heures</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Anomalies</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Taux</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                        <p className="text-[11px] text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                      {emp.typeContrat || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{emp.workedDays}</span>
                    <span className="text-xs text-gray-400">/{emp.expectedDays}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${emp.absentDays > 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {emp.absentDays}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{emp.leaveDays}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{emp.totalHours}h</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {emp.anomalies > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                        <span className="font-bold">!</span> {emp.anomalies}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="relative w-12 h-12 mx-auto">
                      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-gray-700" />
                        <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                          stroke={emp.attendanceRate >= 90 ? '#10b981' : emp.attendanceRate >= 70 ? '#f59e0b' : '#ef4444'}
                          strokeDasharray={`${(emp.attendanceRate / 100) * 88} 88`}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">{emp.attendanceRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEmployee(emp.id); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      Voir →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ STAT CARD ═══════════════════ */

function StatCard({ symbol, label, value, color }: { symbol: string; label: string; value: number; color: string }) {
  const colorMap: Record<string, { bg: string; sym: string; text: string }> = {
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       sym: 'bg-blue-600 text-white',     text: 'text-blue-700 dark:text-blue-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', sym: 'bg-emerald-600 text-white',  text: 'text-emerald-700 dark:text-emerald-400' },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',         sym: 'bg-red-600 text-white',      text: 'text-red-700 dark:text-red-400' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     sym: 'bg-amber-600 text-white',    text: 'text-amber-700 dark:text-amber-400' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-5 border border-gray-100 dark:border-gray-800`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className={`text-3xl font-extrabold ${c.text}`}>{value}</p>
        </div>
        <div className={`w-11 h-11 ${c.sym} rounded-xl flex items-center justify-center shadow-md text-lg font-extrabold`}>
          {symbol}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ EMPLOYEE ARCHIVE VIEW ═══════════════════ */

function EmployeeArchiveView({ archive, loading, year, month, onBack, onChangeMonth, onRecalculate }: {
  archive: EmployeeArchive;
  loading: boolean;
  year: number;
  month: number;
  onBack: () => void;
  onChangeMonth: (dir: -1 | 1) => void;
  onRecalculate: () => void;
}) {
  const emp = archive.employee;
  const sum = archive.summary;
  const sal = archive.salary;

  return (
    <div className="space-y-6">
      {/* ─── Back & Header ─── */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
          <button onClick={() => onChangeMonth(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="px-3 text-sm font-bold text-gray-900 dark:text-white min-w-[140px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={() => onChangeMonth(1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* ─── Employee Profile Card ─── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
                  <span className="text-2xl font-bold text-white">{emp.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{emp.name}</h2>
                  <p className="text-blue-100 text-sm">{emp.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-white/15 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-medium">{emp.typeContrat || 'N/A'}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${emp.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                      {emp.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoItem label="Téléphone" value={emp.telephone || 'N/A'} />
              <InfoItem label="Embauché le" value={emp.dateEmbauche ? new Date(emp.dateEmbauche).toLocaleDateString('fr-FR') : 'N/A'} />
              <InfoItem label="Salaire de base" value={fmtMoney(emp.baseSalary)} />
              <InfoItem label="Congé annuel" value={`${emp.annualLeave} jours`} />
            </div>
          </div>

          {/* ─── Summary Stats ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniStatCard label="Jours présent" value={`${sum.presentDays}`} sub={`/ ${archive.workingDaysCount}`} color="emerald" symbol="P" />
            <MiniStatCard label="Absences" value={`${sum.absentDays}`} sub="jours" color="red" symbol="A" />
            <MiniStatCard label="Heures totales" value={`${sum.totalWorkedHours}h`} sub="ce mois" color="blue" symbol="H" />
            <MiniStatCard label="Taux de présence" value={`${sum.attendanceRate}%`} sub="objectif 95%" color={sum.attendanceRate >= 90 ? 'emerald' : sum.attendanceRate >= 70 ? 'amber' : 'red'} symbol="%" />
          </div>

          {/* ─── Daily Detail Table ─── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Détail Journalier — {MONTH_NAMES[month]} {year}
              </h3>
              {sum.anomalies > 0 && (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                  ! {sum.anomalies} anomalie(s)
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Jour</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Matin Entrée</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Matin Sortie</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">A-midi Entrée</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">A-midi Sortie</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Durée</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {archive.dailyBreakdown.map((day) => {
                    const badge = statusBadge(day.status);
                    const isFuture = new Date(day.date) > new Date();
                    const isToday = day.date === new Date().toISOString().split('T')[0];
                    const hours = day.totalMinutes > 0 ? `${Math.floor(day.totalMinutes / 60)}h${(day.totalMinutes % 60).toString().padStart(2, '0')}` : '—';

                    return (
                      <tr
                        key={day.date}
                        className={`${
                          day.isWeekend
                            ? 'bg-gray-50/50 dark:bg-gray-800/20'
                            : isToday
                            ? 'bg-blue-50/30 dark:bg-blue-900/10'
                            : ''
                        } ${isFuture && !day.isWeekend ? 'opacity-40' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          {isToday && <span className="ml-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">Auj.</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                          {DAY_NAMES_SHORT[day.dayOfWeek]}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                            {day.leaveType && <span className="ml-1 opacity-70">({day.leaveType})</span>}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {fmtTime(day.morning?.checkIn || null)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {fmtTime(day.morning?.checkOut || null)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {fmtTime(day.afternoon?.checkIn || null)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {fmtTime(day.afternoon?.checkOut || null)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {hours}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {day.anomaly ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400" title={day.anomaly}>
                              <span className="font-bold">!</span> Anomalie
                            </span>
                          ) : day.status === 'leave' ? (
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">En congé</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Salary & Leave Row ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Salary Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Calcul de Salaire
                </h3>
                <button
                  onClick={onRecalculate}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Recalculer
                </button>
              </div>
              <div className="p-6">
                {sal ? (
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Salaire net {sal.status === 'ESTIMATE' ? '(estimé)' : ''}</p>
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{fmtMoney(sal.netSalary)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Salaire de base</p>
                        <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">{fmtMoney(sal.baseSalary)}</p>
                      </div>
                    </div>

                    {sal.deductions != null && sal.deductions > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">
                        <TrendingDown className="w-4 h-4" />
                        Déduction: {fmtMoney(sal.deductions)} (absences)
                      </div>
                    )}

                    {sal.grossSalary != null && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Salaire brut</span><span className="font-semibold text-gray-900 dark:text-white">{fmtMoney(sal.grossSalary)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Déductions</span><span className="font-semibold text-red-600">{fmtMoney(sal.deductions)}</span></div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-sm"><span className="font-bold text-gray-900 dark:text-white">Net à payer</span><span className="font-extrabold text-emerald-600">{fmtMoney(sal.netSalary)}</span></div>
                      </div>
                    )}

                    <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      sal.status === 'ESTIMATE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : sal.status === 'CALCULATED' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : sal.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {sal.status === 'ESTIMATE' ? 'Estimation' : sal.status === 'CALCULATED' ? 'Calculé' : sal.status === 'APPROVED' ? 'Approuvé' : sal.status}
                    </span>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="text-4xl text-gray-300 dark:text-gray-600 block mb-3">$</span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune donnée salariale disponible</p>
                    <button onClick={onRecalculate} className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                      Calculer maintenant
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Leave Balance Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Solde de Congés
                </h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <LeaveBox label="Droit annuel" value={archive.leaveBalance.annualAllowance} color="purple" />
                  <LeaveBox label="Utilisés" value={archive.leaveBalance.used} color="red" />
                  <LeaveBox label="En attente" value={archive.leaveBalance.pending} color="amber" />
                  <LeaveBox label="Restant" value={archive.leaveBalance.remaining} color="emerald" />
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div className="flex h-full rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${archive.leaveBalance.annualAllowance > 0 ? (archive.leaveBalance.used / archive.leaveBalance.annualAllowance) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${archive.leaveBalance.annualAllowance > 0 ? (archive.leaveBalance.pending / archive.leaveBalance.annualAllowance) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Leave requests list */}
                {archive.leaveRequests.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Demandes de congé</p>
                    <div className="space-y-2">
                      {archive.leaveRequests.slice(0, 5).map((lr) => (
                        <div key={lr.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5">
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{lr.type}</span>
                            <p className="text-[11px] text-gray-400">
                              {new Date(lr.dateDebut).toLocaleDateString('fr-FR')} — {new Date(lr.dateFin).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                            lr.status === 'VALIDE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : lr.status === 'EN_ATTENTE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {lr.status === 'VALIDE' ? 'Validé' : lr.status === 'EN_ATTENTE' ? 'En attente' : 'Refusé'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════ SUB-COMPONENTS ═══════════════════ */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function MiniStatCard({ label, value, sub, color, symbol }: { label: string; value: string; sub: string; color: string; symbol: string }) {
  const colorMap: Record<string, { bg: string; text: string; sym: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', sym: 'bg-emerald-600 text-white' },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-700 dark:text-red-400',         sym: 'bg-red-600 text-white' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',        text: 'text-blue-700 dark:text-blue-400',       sym: 'bg-blue-600 text-white' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',      text: 'text-amber-700 dark:text-amber-400',     sym: 'bg-amber-600 text-white' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-5 border border-gray-100 dark:border-gray-800`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <div className={`w-8 h-8 ${c.sym} rounded-lg flex items-center justify-center text-sm font-extrabold`}>
          {symbol}
        </div>
      </div>
      <p className={`text-2xl font-extrabold ${c.text}`}>{value}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

function LeaveBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    purple:  'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    red:     'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    amber:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  };
  return (
    <div className={`rounded-xl p-4 text-center ${colorMap[color] || colorMap.purple}`}>
      <p className="text-[11px] font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-extrabold">{value}<span className="text-xs font-normal ml-1">jours</span></p>
    </div>
  );
}
