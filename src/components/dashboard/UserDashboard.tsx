'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Award,
  Clock,
  Target,
  Activity,
  Calendar,
  FileText,
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  TrendingDown,
  Sun,
  Sunset,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  BarChart3,
  Sparkles,
  ChevronRight,
  Briefcase,
  Shield,
} from 'lucide-react';

/* ─── types ─── */
interface LeaveStats {
  approvedLeaves: number;
  pendingLeaves: number;
  totalDays: number;
  performance: number;
}

interface AttendanceSession {
  id: string;
  sessionType: 'MORNING' | 'AFTERNOON';
  checkIn: string | null;
  checkOut: string | null;
  durationMinutes: number | null;
  status: string;
  anomalyDetected: boolean;
  anomalyReason: string | null;
}

interface TodayStatus {
  morning: AttendanceSession | null;
  afternoon: AttendanceSession | null;
  dayStatus: string;
}

interface SalaryEstimate {
  baseSalary: number;
  estimatedNet: number;
  workedDays: number;
  expectedDays: number;
  attendanceRate: number;
}

interface LeaveBalance {
  annualAllowance: number;
  used: number;
  pending: number;
  remaining: number;
}

interface MonthProgress {
  year: number;
  month: number;
  workedDays: number;
  expectedDays: number;
  totalWorkedHours: number;
  progressPercent: number;
}

interface DashboardData {
  today: { date: string; morning: unknown; afternoon: unknown };
  monthProgress: MonthProgress;
  salaryEstimate: SalaryEstimate | null;
  leaveBalance: LeaveBalance | null;
}

/* ─── animated number counter ─── */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}{suffix}</>;
}

/* ─── circular progress ring ─── */
function CircularProgress({ percent, size = 48, stroke = 4, color = '#8b5cf6' }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-200 dark:text-gray-700" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

export default function UserDashboard() {
  const { data: session } = useSession();

  /* leave stats */
  const [stats, setStats] = useState<LeaveStats>({ approvedLeaves: 0, pendingLeaves: 0, totalDays: 0, performance: 0 });
  /* payroll dashboard */
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  /* attendance */
  const [attendance, setAttendance] = useState<TodayStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [attendanceMsg, setAttendanceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  /* fetch everything in parallel */
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const [congesRes, dashRes, attRes] = await Promise.allSettled([
          fetch('/api/conges'),
          fetch('/api/payroll/dashboard'),
          fetch('/api/attendance/session'),
        ]);

        // leaves
        if (congesRes.status === 'fulfilled' && congesRes.value.ok) {
          const data = await congesRes.value.json();
          const leaves = Array.isArray(data) ? data : [];
          const approved = leaves.filter((l: any) => l.status === 'VALIDE').length;
          const pending = leaves.filter((l: any) => l.status === 'EN_ATTENTE').length;
          const totalDaysUsed = leaves
            .filter((l: any) => l.status === 'VALIDE')
            .reduce((sum: number, l: any) => {
              if (!l.date_debut || !l.date_fin) return sum;
              const s = new Date(l.date_debut), e = new Date(l.date_fin);
              if (isNaN(s.getTime()) || isNaN(e.getTime())) return sum;
              return sum + Math.max(0, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
            }, 0);
          const perf = Math.min(100, Math.round((approved / Math.max(1, approved + pending)) * 100));
          setStats({ approvedLeaves: approved, pendingLeaves: pending, totalDays: totalDaysUsed || 0, performance: perf || 0 });
        }

        // payroll dashboard
        if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
          setDashData(await dashRes.value.json());
        }

        // attendance
        if (attRes.status === 'fulfilled' && attRes.value.ok) {
          setAttendance(await attRes.value.json());
        }
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
        setTimeout(() => setVisible(true), 50);
      }
    })();
  }, [session]);

  /* attendance action */
  const handleAttendanceAction = useCallback(async (action: 'CHECK_IN' | 'CHECK_OUT', sessionType: 'MORNING' | 'AFTERNOON') => {
    const key = `${action}_${sessionType}`;
    setActionLoading(key);
    setAttendanceMsg(null);
    try {
      const res = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionType }),
      });
      const data = await res.json();
      if (!res.ok) { setAttendanceMsg({ type: 'error', text: data.error || 'Erreur lors du pointage' }); return; }
      setAttendanceMsg({ type: 'success', text: data.message });
      // refresh attendance
      const r = await fetch('/api/attendance/session');
      if (r.ok) setAttendance(await r.json());
      setTimeout(() => setAttendanceMsg(null), 3000);
    } catch {
      setAttendanceMsg({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setActionLoading(null);
    }
  }, []);

  /* derived */
  const firstName = session?.user?.name?.split(' ')[0] || 'Utilisateur';
  const fullName = session?.user?.name || 'Non renseigné';
  const email = session?.user?.email || 'Non renseigné';
  const userStatus = (session?.user as any)?.status || 'ACTIVE';
  const isPending = userStatus === 'PENDING';
  const isActive = userStatus === 'ACTIVE';

  const statusConfig: Record<string, { color: string; text: string; bg: string; dot: string }> = {
    ACTIVE:    { color: 'text-emerald-400', text: 'Profil Actif',             bg: 'bg-emerald-500/20', dot: 'bg-emerald-400' },
    PENDING:   { color: 'text-amber-400',   text: 'En attente de validation', bg: 'bg-amber-500/20',   dot: 'bg-amber-400'   },
    INACTIVE:  { color: 'text-gray-400',    text: 'Profil Incomplet',         bg: 'bg-gray-500/20',    dot: 'bg-gray-400'     },
    REJECTED:  { color: 'text-red-400',     text: 'Profil Refusé',            bg: 'bg-red-500/20',     dot: 'bg-red-400'      },
    SUSPENDED: { color: 'text-red-400',     text: 'Compte Suspendu',          bg: 'bg-red-500/20',     dot: 'bg-red-400'      },
  };
  const currentStatus = statusConfig[userStatus] || statusConfig.ACTIVE;

  const salary = dashData?.salaryEstimate;
  const progress = dashData?.monthProgress;
  const leave = dashData?.leaveBalance;

  const now = new Date();
  const isBeforeNoon = now.getHours() < 12;

  /* ─── loading skeleton ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/40 dark:from-gray-950 dark:via-purple-950/20 dark:to-indigo-950/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 animate-spin" />
            <Sparkles className="w-6 h-6 text-purple-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/40 dark:from-gray-950 dark:via-purple-950/20 dark:to-indigo-950/20 transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <div className="relative overflow-hidden">
        {/* background layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 dark:from-violet-950 dark:via-purple-950 dark:to-indigo-950" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[80px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-4 sm:space-y-5">
              {/* status pill */}
              <div className={`inline-flex items-center gap-2.5 ${currentStatus.bg} backdrop-blur-xl rounded-full px-5 py-2.5 border border-white/10`}>
                <span className={`w-2.5 h-2.5 ${currentStatus.dot} rounded-full ${isActive ? 'animate-pulse' : ''} shadow-lg`} />
                <span className={`text-sm font-semibold ${currentStatus.color}`}>{currentStatus.text}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
                Bienvenue, <span className="bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">{firstName}</span>
              </h1>
              <p className="text-lg sm:text-xl text-purple-100/80 max-w-xl leading-relaxed">
                Gérez vos congés, consultez vos documents et suivez vos performances.
              </p>

              {isPending && (
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <div className="bg-amber-500/15 backdrop-blur-sm border border-amber-400/20 rounded-xl px-5 py-3">
                    <p className="text-sm text-amber-200 font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      En attente de validation RH
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* avatar area */}
            <div className="hidden lg:flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-28 h-28 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 hover:scale-105 transition-transform duration-300">
                  <User className="w-14 h-14 text-white/80" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${currentStatus.dot} rounded-full border-4 border-purple-700 dark:border-purple-950 shadow-lg`} />
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                <Shield className="w-3.5 h-3.5 text-purple-200" />
                <span className="text-xs text-purple-200 font-medium">Employé</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ─── Stat Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 -mt-12 relative z-10">
          {[
            { label: 'Congés Approuvés', value: stats.approvedLeaves, sub: 'Demandes acceptées', badge: 'Validé', icon: Award, gradFrom: 'from-emerald-500', gradTo: 'to-green-600', badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30', badgeText: 'text-emerald-700 dark:text-emerald-400', iconBg: 'from-emerald-500 to-green-600' },
            { label: 'Congés En Attente', value: stats.pendingLeaves, sub: 'En cours de validation', badge: 'En cours', icon: Clock, gradFrom: 'from-amber-500', gradTo: 'to-orange-600', badgeBg: 'bg-amber-50 dark:bg-amber-900/30', badgeText: 'text-amber-700 dark:text-amber-400', iconBg: 'from-amber-500 to-orange-600' },
            { label: 'Total Jours', value: stats.totalDays, sub: 'Jours de congé utilisés', badge: 'Total', icon: Target, gradFrom: 'from-purple-500', gradTo: 'to-indigo-600', badgeBg: 'bg-purple-50 dark:bg-purple-900/30', badgeText: 'text-purple-700 dark:text-purple-400', iconBg: 'from-purple-500 to-indigo-600' },
            { label: 'Performance', value: stats.performance, sub: "Taux d'approbation", badge: `${stats.performance}%`, icon: Activity, gradFrom: 'from-cyan-500', gradTo: 'to-blue-600', badgeBg: 'bg-cyan-50 dark:bg-cyan-900/30', badgeText: 'text-cyan-700 dark:text-cyan-400', iconBg: 'from-cyan-500 to-blue-600', isSuffix: '%' },
          ].map((card, i) => (
            <div key={i} className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 hover:shadow-xl hover:shadow-purple-200/30 dark:hover:shadow-purple-900/20 transition-all duration-500 hover:-translate-y-1 border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradFrom} ${card.gradTo} opacity-80`} />
              {/* decorative blob */}
              <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${card.gradFrom} ${card.gradTo} rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity`} />

              <div className="relative p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 bg-gradient-to-br ${card.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${card.badgeText} ${card.badgeBg} px-2.5 py-1 rounded-full`}>
                    {card.badge}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  <AnimatedNumber value={card.value} suffix={card.isSuffix || ''} />
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Attendance & Salary Row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ATTENDANCE CARD */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                Pointage du jour
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <div className="p-6 space-y-4">
              {attendanceMsg && (
                <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  attendanceMsg.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {attendanceMsg.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {attendanceMsg.text}
                </div>
              )}

              {/* Morning */}
              <AttendanceRow
                label="Matin"
                icon={<Sun className="w-5 h-5 text-amber-500" />}
                session={attendance?.morning || null}
                sessionType="MORNING"
                isActive={isBeforeNoon}
                actionLoading={actionLoading}
                onAction={handleAttendanceAction}
              />

              {/* Afternoon */}
              <AttendanceRow
                label="Après-midi"
                icon={<Sunset className="w-5 h-5 text-orange-500" />}
                session={attendance?.afternoon || null}
                sessionType="AFTERNOON"
                isActive={!isBeforeNoon}
                actionLoading={actionLoading}
                onAction={handleAttendanceAction}
              />
            </div>
          </div>

          {/* SALARY & MONTH PROGRESS */}
          <div className="space-y-6">
            {/* Month Progress */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  Progression du mois
                </h3>
              </div>
              <div className="p-6">
                {progress ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                      <MiniStat label="Jours travaillés" value={`${progress.workedDays}/${progress.expectedDays}`} icon={<Briefcase className="w-4 h-4" />} />
                      <MiniStat label="Heures totales" value={`${progress.totalWorkedHours}h`} icon={<Clock className="w-4 h-4" />} />
                      <MiniStat label="Taux de présence" value={`${progress.progressPercent}%`} icon={<Activity className="w-4 h-4" />} />
                      <MiniStat label="Jours restants" value={`${Math.max(0, progress.expectedDays - progress.workedDays)}`} icon={<Calendar className="w-4 h-4" />} />
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, progress.progressPercent)}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune donnée disponible</p>
                )}
              </div>
            </div>

            {/* Salary */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  Estimation de salaire
                </h3>
              </div>
              <div className="p-6">
                {salary ? (
                  <>
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Salaire net estimé</p>
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                          {salary.estimatedNet.toLocaleString('fr-FR')} <span className="text-base font-normal text-gray-400">TND</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Salaire de base</p>
                        <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">{salary.baseSalary.toLocaleString('fr-FR')} TND</p>
                      </div>
                    </div>
                    {salary.estimatedNet < salary.baseSalary ? (
                      <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                        <TrendingDown className="w-4 h-4" />
                        Déduction de {(salary.baseSalary - salary.estimatedNet).toLocaleString('fr-FR')} TND (absences)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                        <TrendingUp className="w-4 h-4" />
                        Aucune déduction ce mois
                      </div>
                    )}
                    <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">* Estimation basée sur le pointage actuel. Le montant final peut varier.</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune donnée disponible</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Leave Balance ─── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              Solde de congés
            </h3>
          </div>
          <div className="p-6">
            {leave ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <LeaveStatBox label="Droit annuel" value={leave.annualAllowance} unit="jours" color="purple" />
                  <LeaveStatBox label="Utilisés" value={leave.used} unit="jours" color="red" />
                  <LeaveStatBox label="En attente" value={leave.pending} unit="jours" color="amber" />
                  <LeaveStatBox label="Restant" value={leave.remaining} unit="jours" color="emerald" />
                </div>
                <div className="mt-5 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div className="flex h-full rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${leave.annualAllowance > 0 ? (leave.used / leave.annualAllowance) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full transition-all duration-700" style={{ width: `${leave.annualAllowance > 0 ? (leave.pending / leave.annualAllowance) * 100 : 0}%` }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* ─── Quick Actions ─── */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { href: '/conges', title: 'Demander un Congé', desc: 'Soumettre une nouvelle demande de congé', icon: Calendar, grad: 'from-violet-500 to-purple-600', hoverGrad: 'group-hover:from-violet-600 group-hover:to-purple-700' },
              { href: '/pointage', title: 'Pointage', desc: 'Gérer vos heures de travail', icon: Clock, grad: 'from-emerald-500 to-teal-600', hoverGrad: 'group-hover:from-emerald-600 group-hover:to-teal-700' },
              { href: '/profile', title: 'Mon Profil', desc: 'Modifier vos informations', icon: Settings, grad: 'from-cyan-500 to-blue-600', hoverGrad: 'group-hover:from-cyan-600 group-hover:to-blue-700' },
            ].map((a, i) => (
              <Link key={i} href={a.href} className="group relative overflow-hidden bg-gradient-to-br rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                <div className={`absolute inset-0 bg-gradient-to-br ${a.grad} ${a.hoverGrad} transition-all duration-500`} />
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
                <div className="relative">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <a.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5">{a.title}</h3>
                  <p className="text-sm text-white/70">{a.desc}</p>
                  <ChevronRight className="w-5 h-5 text-white/50 absolute top-6 right-0 group-hover:translate-x-1 group-hover:text-white/80 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ─── Personal Info ─── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              Informations Personnelles
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <InfoTile icon={<User className="w-5 h-5" />} label="Nom Complet" value={fullName} color="purple" />
              <InfoTile icon={<Mail className="w-5 h-5" />} label="Email" value={email} color="indigo" />
              <InfoTile icon={<Phone className="w-5 h-5" />} label="Téléphone" value="Non renseigné" color="emerald" />
              <InfoTile icon={<MapPin className="w-5 h-5" />} label="Localisation" value="Non renseigné" color="amber" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════ SUB-COMPONENTS ═══════════════════ */

function AttendanceRow({ label, icon, session, sessionType, isActive, actionLoading, onAction }: {
  label: string; icon: React.ReactNode; session: AttendanceSession | null; sessionType: 'MORNING' | 'AFTERNOON';
  isActive: boolean; actionLoading: string | null; onAction: (a: 'CHECK_IN' | 'CHECK_OUT', s: 'MORNING' | 'AFTERNOON') => void;
}) {
  const hasIn = !!session?.checkIn;
  const hasOut = !!session?.checkOut;
  const complete = hasIn && hasOut;
  const statusLabel = complete ? 'Terminé' : hasIn ? 'En cours' : 'Non pointé';
  const statusCls = complete
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : hasIn
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';

  return (
    <div className={`p-4 rounded-xl border transition-colors duration-200 ${isActive ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="font-semibold text-gray-900 dark:text-white">{label}</span>
          {isActive && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Session active</span>}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls}`}>{statusLabel}</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {hasIn && <span>Entrée: {fmtTime(session!.checkIn!)}</span>}
        {hasOut && <span>Sortie: {fmtTime(session!.checkOut!)}</span>}
        {session?.durationMinutes != null && <span className="font-medium">Durée: {Math.floor(session.durationMinutes / 60)}h{(session.durationMinutes % 60).toString().padStart(2, '0')}</span>}
      </div>

      {session?.anomalyDetected && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{session.anomalyReason}</div>
      )}

      {!complete && (
        <div className="mt-3 flex gap-2">
          {!hasIn && (
            <button onClick={() => onAction('CHECK_IN', sessionType)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
              <LogIn className="w-4 h-4" />
              {actionLoading === `CHECK_IN_${sessionType}` ? 'Enregistrement...' : 'Pointer entrée'}
            </button>
          )}
          {hasIn && !hasOut && (
            <button onClick={() => onAction('CHECK_OUT', sessionType)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
              <LogOut className="w-4 h-4" />
              {actionLoading === `CHECK_OUT_${sessionType}` ? 'Enregistrement...' : 'Pointer sortie'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 text-center">
      <div className="flex justify-center text-gray-400 dark:text-gray-500 mb-1.5">{icon}</div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function LeaveStatBox({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const colors: Record<string, string> = {
    purple:  'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    red:     'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    amber:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  };
  return (
    <div className={`rounded-xl p-4 text-center ${colors[color] || colors.purple}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-extrabold">{value}<span className="text-xs font-normal ml-1">{unit}</span></p>
    </div>
  );
}

function InfoTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bgMap: Record<string, string> = {
    purple:  'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    indigo:  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="flex items-center gap-3.5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bgMap[color] || bgMap.purple}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
