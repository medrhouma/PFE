"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Clock,
  LogIn,
  LogOut,
  Sun,
  Sunset,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Timer,
  TrendingUp,
  Activity,
  RefreshCw,
  BarChart3,
  Coffee,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
  Star,
  Trophy,
  Flame,
  Target,
  Award,
  TrendingDown,
  Minus,
  Download,
  Phone,
  Briefcase,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

// ========================================
// TYPES
// ========================================
interface AttendanceSession {
  id: string;
  sessionType: "MORNING" | "AFTERNOON";
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

interface TeamEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  typeContrat: string | null;
  dateEmbauche: string | null;
  telephone: string | null;
  sexe: string | null;
  morning: {
    checkIn: string | null;
    checkOut: string | null;
    durationMinutes: number | null;
    status: string;
  } | null;
  afternoon: {
    checkIn: string | null;
    checkOut: string | null;
    durationMinutes: number | null;
    status: string;
  } | null;
  totalMinutes: number;
  dayStatus: "absent" | "partial" | "present" | "complete";
}

interface TeamData {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  complete: number;
  employees: TeamEmployee[];
}

interface PointsData {
  totalPoints: number;
  maxPossible: number;
  scorePercent: number;
  level: string;
  levelColor: string;
  breakdown: {
    presencePoints: number;
    absencePoints: number;
    latePoints: number;
    streakBonusPoints: number;
  };
  stats: {
    totalWorkDays: number;
    daysPresent: number;
    daysAbsent: number;
    daysLate: number;
    currentStreak: number;
    bestStreak: number;
  };
  rules: {
    fullDay: number;
    halfDay: number;
    absent: number;
    late: number;
    streakBonus: number;
  };
}

// ========================================
// HELPERS
// ========================================
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function PointagePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  const isRH = session?.user?.role === "RH" || isAdmin;
  // RH ne pointe pas personnellement — seuls les employés USER pointent
  const isPointeur = !isAdmin && !isRH;
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamDate, setTeamDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [teamSearch, setTeamSearch] = useState("");
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [teamPoints, setTeamPoints] = useState<Record<string, PointsData>>({});
  const [exportingTeam, setExportingTeam] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today status
  const fetchStatus = useCallback(async () => {
    if (!isPointeur) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/attendance/session");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      console.error("Failed to fetch attendance status");
    } finally {
      setLoading(false);
    }
  }, [isPointeur]);

  // Fetch attendance points
  const fetchPoints = useCallback(async () => {
    if (!isPointeur) return;
    try {
      const res = await fetch("/api/attendance/points");
      if (res.ok) {
        const data = await res.json();
        setPointsData(data);
      }
    } catch {
      console.error("Failed to fetch points");
    }
  }, [isPointeur]);

  // Fetch team attendance (RH only)
  const fetchTeamData = useCallback(async (date: string) => {
    if (!isRH) return;
    setTeamLoading(true);
    try {
      const res = await fetch(`/api/attendance/team?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setTeamData(data);

        // Fetch points for each team member
        if (data?.employees?.length) {
          const pointsMap: Record<string, PointsData> = {};
          await Promise.all(
            data.employees.map(async (emp: { id: string }) => {
              try {
                const pRes = await fetch(`/api/attendance/points?userId=${emp.id}`);
                if (pRes.ok) {
                  pointsMap[emp.id] = await pRes.json();
                }
              } catch { /* ignore individual failures */ }
            })
          );
          setTeamPoints(pointsMap);
        }
      }
    } catch {
      console.error("Failed to fetch team data");
    } finally {
      setTeamLoading(false);
    }
  }, [isRH]);

  useEffect(() => {
    if (isPointeur) { fetchStatus(); fetchPoints(); } else { setLoading(false); }
    if (isRH) fetchTeamData(teamDate);
    const interval = isPointeur ? setInterval(fetchStatus, 60000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [fetchStatus, fetchPoints, fetchTeamData, isRH, isPointeur, teamDate]);

  // Export team attendance + points (RH only)
  const handleExportTeam = useCallback(async () => {
    if (!teamData || !isRH) return;
    setExportingTeam(true);
    try {
      const now = new Date();
      const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const rows = teamData.employees.map((emp) => {
        const pts = teamPoints[emp.id];
        return [
          emp.name,
          emp.email,
          emp.morning?.checkIn ? formatTime(emp.morning.checkIn) : '-',
          emp.morning?.checkOut ? formatTime(emp.morning.checkOut) : '-',
          emp.afternoon?.checkIn ? formatTime(emp.afternoon.checkIn) : '-',
          emp.afternoon?.checkOut ? formatTime(emp.afternoon.checkOut) : '-',
          emp.totalMinutes > 0 ? formatDuration(emp.totalMinutes) : '0',
          emp.dayStatus === 'complete' ? 'Complet' : emp.dayStatus === 'present' ? 'Pr\u00e9sent' : emp.dayStatus === 'partial' ? 'Partiel' : 'Absent',
          pts ? String(pts.totalPoints) : '-',
          pts ? `${pts.scorePercent}%` : '-',
          pts ? pts.level : '-',
          pts ? String(pts.stats.daysPresent) : '-',
          pts ? String(pts.stats.daysAbsent) : '-',
          pts ? String(pts.stats.daysLate) : '-',
          pts ? String(pts.stats.currentStreak) : '-',
        ].join(';');
      });
      const header = 'Nom;Email;Entr\u00e9e Matin;Sortie Matin;Entr\u00e9e PM;Sortie PM;Total;Statut Jour;Points;Score%;Niveau;Jours Pr\u00e9sent;Jours Absent;Retards;Streak';
      const csv = '\uFEFF' + header + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pointage-equipe-${teamDate}-${monthName.replace(' ', '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error('Export failed');
    } finally {
      setExportingTeam(false);
    }
  }, [teamData, teamPoints, isRH, teamDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isPointeur) { await fetchStatus(); await fetchPoints(); }
    if (isRH) await fetchTeamData(teamDate);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleAction = async (action: "CHECK_IN" | "CHECK_OUT", sessionType: "MORNING" | "AFTERNOON") => {
    const key = `${action}_${sessionType}`;
    setActionLoading(key);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/attendance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors du pointage");
        return;
      }

      setSuccess(
        action === "CHECK_IN"
          ? `Entrée ${sessionType === "MORNING" ? "matin" : "après-midi"} enregistrée avec succès`
          : `Sortie ${sessionType === "MORNING" ? "matin" : "après-midi"} enregistrée avec succès`
      );
      await fetchStatus();
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setActionLoading(null);
    }
  };

  // Computed
  const now = currentTime;
  const currentHour = now.getHours();
  const isBeforeNoon = currentHour < 13;
  const morningComplete = !!(status?.morning?.checkIn && status?.morning?.checkOut);
  const afternoonComplete = !!(status?.afternoon?.checkIn && status?.afternoon?.checkOut);
  const totalMinutes = (status?.morning?.durationMinutes || 0) + (status?.afternoon?.durationMinutes || 0);
  const dayComplete = morningComplete && afternoonComplete;
  const userName = session?.user?.name?.split(" ")[0] || "Collaborateur";
  const progressPercent = Math.min(100, Math.round((totalMinutes / 420) * 100));

  if (loading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-3xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-80 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700" />
              <div className="h-80 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* ============ HERO HEADER ============ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/25 dark:shadow-indigo-900/40">
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
            <svg className="absolute top-0 right-0 w-full h-full opacity-[0.03]" viewBox="0 0 400 400"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <p className="text-white/70 text-sm font-medium tracking-wide">{getGreeting()}, {userName}</p>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                {isRH ? "Suivi du pointage" : "Pointage du jour"}
              </h1>
              <p className="text-white/50 text-sm font-medium">
                {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right space-y-2">
                <div className="text-5xl lg:text-6xl font-mono font-black tracking-wider tabular-nums bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                  {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  {isRH ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 text-white/60 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                      <Users className="w-3.5 h-3.5" />
                      {isAdmin ? "Vue administrateur" : "Vue RH"}
                    </span>
                  ) : dayComplete ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-200 px-4 py-1.5 rounded-full border border-emerald-400/20 backdrop-blur-sm">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Journée complète
                    </span>
                  ) : status?.morning?.checkIn || status?.afternoon?.checkIn ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 text-amber-200 px-4 py-1.5 rounded-full border border-amber-400/20 backdrop-blur-sm">
                      <Zap className="w-3.5 h-3.5" />
                      En cours
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 text-white/60 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                      <Clock className="w-3.5 h-3.5" />
                      Non pointé
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 border border-white/10 backdrop-blur-sm"
                title="Actualiser"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ============ ALERTS ============ */}
        {isPointeur && error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/50 rounded-2xl text-red-700 dark:text-red-400 text-sm shadow-sm animate-in slide-in-from-top-2">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500 dark:text-red-600 dark:hover:text-red-400 transition-colors p-1">
              <span className="text-lg font-bold">✕</span>
            </button>
          </div>
        )}
        {isPointeur && success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm shadow-sm animate-in slide-in-from-top-2">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* ============ STATS GRID (employees only) ============ */}
        {isPointeur && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Timer className="w-5 h-5" />} label="Aujourd'hui" value={totalMinutes > 0 ? formatDuration(totalMinutes) : "0h00"} color="indigo" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Objectif" value="7h00" color="violet" />
          <StatCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="Progression"
            value={`${progressPercent}%`}
            color="emerald"
            progress={progressPercent}
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Statut"
            value={dayComplete ? "Terminé" : morningComplete || afternoonComplete ? "Partiel" : status?.morning?.checkIn || status?.afternoon?.checkIn ? "En cours" : "Non pointé"}
            color="amber"
          />
        </div>

        {/* ============ POINTS CARD ============ */}
        {pointsData && (
          <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-2xl rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-black/20 border border-gray-100 dark:border-gray-800/60 overflow-hidden">
            <div className="px-7 py-5 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                  <Trophy className="w-4 h-4" />
                </div>
                Score du mois
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                pointsData.levelColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                pointsData.levelColor === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                pointsData.levelColor === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                pointsData.levelColor === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' :
                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
              }`}>
                {pointsData.level}
              </span>
            </div>

            <div className="p-7">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Circular Score */}
                <div className="relative flex-shrink-0">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-800" />
                    <circle
                      cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, pointsData.scorePercent) * 3.267} 326.7`}
                      className={
                        pointsData.levelColor === 'emerald' ? 'text-emerald-500' :
                        pointsData.levelColor === 'blue' ? 'text-blue-500' :
                        pointsData.levelColor === 'amber' ? 'text-amber-500' :
                        pointsData.levelColor === 'orange' ? 'text-orange-500' : 'text-red-500'
                      }
                      stroke="currentColor"
                      style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{pointsData.totalPoints}</span>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">/ {pointsData.maxPossible} pts</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                  <div className="flex items-center gap-3 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-2xl px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Star className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Présence</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{pointsData.breakdown.presencePoints} pts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-red-50/80 dark:bg-red-900/20 rounded-2xl px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                      <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Absences</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{pointsData.breakdown.absencePoints} pts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-orange-50/80 dark:bg-orange-900/20 rounded-2xl px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Retards</p>
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{pointsData.breakdown.latePoints} pts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-violet-50/80 dark:bg-violet-900/20 rounded-2xl px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Streak bonus</p>
                      <p className="text-sm font-bold text-violet-600 dark:text-violet-400">+{pointsData.breakdown.streakBonusPoints} pts</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-6 flex items-center justify-around py-3 px-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl">
                <div className="text-center">
                  <p className="text-lg font-black text-gray-900 dark:text-white">{pointsData.stats.daysPresent}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Présent</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="text-center">
                  <p className="text-lg font-black text-red-500">{pointsData.stats.daysAbsent}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Absent</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="text-center">
                  <p className="text-lg font-black text-orange-500">{pointsData.stats.daysLate}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Retards</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="text-center flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <p className="text-lg font-black text-gray-900 dark:text-white">{pointsData.stats.currentStreak}</p>
                  </div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Streak</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ SESSION CARDS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SessionCard
            label="Matin"
            subtitle="09:00 – 12:00"
            icon={<Sun className="w-6 h-6" />}
            gradient="from-amber-400 via-orange-400 to-orange-500"
            session={status?.morning || null}
            sessionType="MORNING"
            isActive={isBeforeNoon}
            actionLoading={actionLoading}
            onAction={handleAction}
          />
          <SessionCard
            label="Après-midi"
            subtitle="14:00 – 18:00"
            icon={<Sunset className="w-6 h-6" />}
            gradient="from-orange-500 via-rose-500 to-pink-500"
            session={status?.afternoon || null}
            sessionType="AFTERNOON"
            isActive={!isBeforeNoon}
            actionLoading={actionLoading}
            onAction={handleAction}
          />
        </div>

        {/* ============ TIMELINE ============ */}
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-2xl rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-black/20 border border-gray-100 dark:border-gray-800/60 overflow-hidden">
          <div className="px-7 py-5 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
                <Activity className="w-4 h-4" />
              </div>
              Chronologie du jour
            </h3>
            {totalMinutes > 0 && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">
                Total: {formatDuration(totalMinutes)}
              </span>
            )}
          </div>
          <div className="p-7">
            <div className="relative">
              <div className="absolute left-[19px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-emerald-300 via-violet-300 to-rose-300 dark:from-emerald-700 dark:via-violet-700 dark:to-rose-700 rounded-full" />
              <div className="space-y-1.5">
                <TimelineItem time={status?.morning?.checkIn ? formatTime(status.morning.checkIn) : "--:--"} label="Entrée matin" icon={<LogIn className="w-3.5 h-3.5" />} done={!!status?.morning?.checkIn} color="emerald" />
                <TimelineItem time={status?.morning?.checkOut ? formatTime(status.morning.checkOut) : "--:--"} label="Sortie matin" icon={<LogOut className="w-3.5 h-3.5" />} done={!!status?.morning?.checkOut} color="blue" duration={status?.morning?.durationMinutes ? formatDuration(status.morning.durationMinutes) : undefined} />
                <TimelineItem time="" label="Pause déjeuner" icon={<Coffee className="w-3.5 h-3.5" />} done={morningComplete} color="amber" isPause />
                <TimelineItem time={status?.afternoon?.checkIn ? formatTime(status.afternoon.checkIn) : "--:--"} label="Entrée après-midi" icon={<LogIn className="w-3.5 h-3.5" />} done={!!status?.afternoon?.checkIn} color="orange" />
                <TimelineItem time={status?.afternoon?.checkOut ? formatTime(status.afternoon.checkOut) : "--:--"} label="Sortie après-midi" icon={<LogOut className="w-3.5 h-3.5" />} done={!!status?.afternoon?.checkOut} color="rose" duration={status?.afternoon?.durationMinutes ? formatDuration(status.afternoon.durationMinutes) : undefined} />
              </div>
            </div>
          </div>
        </div>

        </>)}

        {/* ============ TEAM ATTENDANCE (RH ONLY) ============ */}
        {isRH && (
          <div className="space-y-6">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-300/40 dark:shadow-violet-900/40">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Suivi des employés</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Pointage & performance</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Date nav */}
                <div className="flex items-center bg-white dark:bg-gray-900 rounded-2xl p-1 border border-gray-200/80 dark:border-gray-700/60 shadow-sm">
                  <button
                    onClick={() => {
                      const d = new Date(teamDate);
                      d.setDate(d.getDate() - 1);
                      setTeamDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                    }}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <div className="flex items-center gap-1.5 px-2">
                    <Calendar className="w-3.5 h-3.5 text-violet-500" />
                    <input
                      type="date"
                      value={teamDate}
                      onChange={(e) => setTeamDate(e.target.value)}
                      className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 border-0 focus:outline-none w-[130px]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const d = new Date(teamDate);
                      d.setDate(d.getDate() + 1);
                      setTeamDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                    }}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-all"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-gray-700 dark:text-gray-200 w-48 placeholder:text-gray-400 shadow-sm transition-all"
                  />
                </div>
                {/* Export */}
                <button
                  onClick={handleExportTeam}
                  disabled={exportingTeam || !teamData}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-gray-300/30 dark:shadow-black/20"
                >
                  <Download className="w-4 h-4" />
                  {exportingTeam ? "Export..." : "Exporter CSV"}
                </button>
              </div>
            </div>

            {/* Summary Pills */}
            {teamData && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-black text-gray-900 dark:text-white">{teamData.totalEmployees}</span>
                  <span className="text-xs text-gray-400 font-medium">employés</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{teamData.present}</span>
                  <span className="text-xs text-emerald-600/70 dark:text-emerald-400/60 font-medium">présents</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200/60 dark:border-red-800/40">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-black text-red-700 dark:text-red-400">{teamData.absent}</span>
                  <span className="text-xs text-red-600/70 dark:text-red-400/60 font-medium">absents</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-200/60 dark:border-violet-800/40">
                  <CheckCircle className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-sm font-black text-violet-700 dark:text-violet-400">{teamData.complete}</span>
                  <span className="text-xs text-violet-600/70 dark:text-violet-400/60 font-medium">complets</span>
                </div>
              </div>
            )}

            {/* Employee Cards Grid */}
            {teamLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white dark:bg-gray-900/80 rounded-[28px] border border-gray-100 dark:border-gray-800 p-6 space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                      <div className="space-y-2 flex-1">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2" />
                      </div>
                      <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(4)].map((_, j) => <div key={j} className="h-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl" />)}
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full" />
                  </div>
                ))}
              </div>
            ) : teamData && teamData.employees.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {teamData.employees
                  .filter((emp) => {
                    if (!teamSearch) return true;
                    const q = teamSearch.toLowerCase();
                    return emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q);
                  })
                  .map((emp, idx) => {
                    const statusConfig = {
                      absent:   { label: "Absent",   icon: <Minus className="w-3 h-3" />,       bg: "bg-red-500",     glow: "shadow-red-500/20",     ringBg: "bg-red-50 dark:bg-red-950/40",     ringBorder: "border-red-200 dark:border-red-800/50",     text: "text-red-700 dark:text-red-400" },
                      partial:  { label: "En cours",  icon: <Clock className="w-3 h-3" />,       bg: "bg-amber-500",   glow: "shadow-amber-500/20",   ringBg: "bg-amber-50 dark:bg-amber-950/40", ringBorder: "border-amber-200 dark:border-amber-800/50", text: "text-amber-700 dark:text-amber-400" },
                      present:  { label: "Présent",   icon: <ArrowUpRight className="w-3 h-3" />,bg: "bg-emerald-500", glow: "shadow-emerald-500/20", ringBg: "bg-emerald-50 dark:bg-emerald-950/40", ringBorder: "border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-400" },
                      complete: { label: "Complet",   icon: <CheckCircle className="w-3 h-3" />, bg: "bg-indigo-500",  glow: "shadow-indigo-500/20",  ringBg: "bg-indigo-50 dark:bg-indigo-950/40", ringBorder: "border-indigo-200 dark:border-indigo-800/50", text: "text-indigo-700 dark:text-indigo-400" },
                    };
                    const st = statusConfig[emp.dayStatus];
                    const gradients = [
                      "from-violet-600 to-indigo-600",
                      "from-emerald-600 to-teal-600",
                      "from-orange-600 to-rose-600",
                      "from-cyan-600 to-blue-600",
                      "from-pink-600 to-fuchsia-600",
                      "from-amber-600 to-yellow-600",
                    ];
                    const grad = gradients[idx % gradients.length];
                    const pts = teamPoints[emp.id];
                    const progressPct = emp.totalMinutes > 0 ? Math.min(100, Math.round((emp.totalMinutes / 420) * 100)) : 0;
                    const morningDur = emp.morning?.durationMinutes || 0;
                    const afternoonDur = emp.afternoon?.durationMinutes || 0;
                    const contratLabel = emp.typeContrat === "CDI" ? "CDI" : emp.typeContrat === "CDD" ? "CDD" : emp.typeContrat === "STAGE" ? "Stage" : emp.typeContrat || null;
                    const dateFormatted = new Date(teamDate + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

                    return (
                      <div key={emp.id} className="group relative bg-white dark:bg-gray-900/80 backdrop-blur-xl rounded-[28px] border border-gray-200/70 dark:border-gray-800/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-2xl hover:shadow-gray-300/30 dark:hover:shadow-black/40 hover:border-gray-300/80 dark:hover:border-gray-700/80 transition-all duration-500 overflow-hidden">
                        {/* Top gradient accent */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${grad} opacity-90`} />
                        {/* Subtle background pattern */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-gray-50/50 dark:from-gray-800/20 to-transparent rounded-bl-full pointer-events-none" />

                        <div className="relative p-6 space-y-5">
                          {/* ── Header row: avatar + info + status ── */}
                          <div className="flex items-start gap-4">
                            <div className="relative flex-shrink-0">
                              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-lg font-black shadow-xl ${st.glow} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                {emp.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              {/* Online indicator */}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] border-white dark:border-gray-900 ${
                                emp.dayStatus === "absent" ? "bg-gray-300 dark:bg-gray-600" : "bg-emerald-500"
                              }`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-black text-gray-900 dark:text-white truncate leading-tight tracking-tight">{emp.name}</h4>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 font-medium">{emp.email}</p>
                              {/* Meta chips */}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {contratLabel && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/40">
                                    <Briefcase className="w-2.5 h-2.5" />
                                    {contratLabel}
                                  </span>
                                )}
                                {emp.telephone && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800/60">
                                    <Phone className="w-2.5 h-2.5" />
                                    {emp.telephone}
                                  </span>
                                )}
                                {emp.dateEmbauche && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800/60">
                                    <CalendarDays className="w-2.5 h-2.5" />
                                    {new Date(emp.dateEmbauche).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-bold border ${st.ringBg} ${st.ringBorder} ${st.text} shadow-sm`}>
                              {st.icon}
                              {st.label}
                            </div>
                          </div>

                          {/* ── Date row ── */}
                          <div className="flex items-center gap-2 px-3.5 py-2 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl">
                            <Calendar className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">{dateFormatted}</span>
                          </div>

                          {/* ── Attendance sessions ── */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Morning */}
                            <div className={`relative rounded-2xl p-4 space-y-2.5 border transition-colors ${
                              emp.morning?.checkIn
                                ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40"
                                : "bg-gray-50/80 dark:bg-gray-800/30 border-gray-200/40 dark:border-gray-700/30 border-dashed"
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                    emp.morning?.checkIn ? "bg-amber-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                                  }`}>
                                    <Sun className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matin</span>
                                </div>
                                {morningDur > 0 && (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md">
                                    {formatDuration(morningDur)}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <LogIn className={`w-3 h-3 ${emp.morning?.checkIn ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`} />
                                  <span className={`text-sm font-mono font-black tabular-nums ${emp.morning?.checkIn? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                    {emp.morning?.checkIn ? formatTime(emp.morning.checkIn) : "--:--"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <LogOut className={`w-3 h-3 ${emp.morning?.checkOut ? "text-blue-500" : "text-gray-300 dark:text-gray-600"}`} />
                                  <span className={`text-sm font-mono font-black tabular-nums ${emp.morning?.checkOut ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                    {emp.morning?.checkOut ? formatTime(emp.morning.checkOut) : "--:--"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Afternoon */}
                            <div className={`relative rounded-2xl p-4 space-y-2.5 border transition-colors ${
                              emp.afternoon?.checkIn
                                ? "bg-orange-50/60 dark:bg-orange-950/20 border-orange-200/60 dark:border-orange-800/40"
                                : "bg-gray-50/80 dark:bg-gray-800/30 border-gray-200/40 dark:border-gray-700/30 border-dashed"
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                    emp.afternoon?.checkIn ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                                  }`}>
                                    <Sunset className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Après-midi</span>
                                </div>
                                {afternoonDur > 0 && (
                                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-md">
                                    {formatDuration(afternoonDur)}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <LogIn className={`w-3 h-3 ${emp.afternoon?.checkIn ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`} />
                                  <span className={`text-sm font-mono font-black tabular-nums ${emp.afternoon?.checkIn ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                    {emp.afternoon?.checkIn ? formatTime(emp.afternoon.checkIn) : "--:--"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <LogOut className={`w-3 h-3 ${emp.afternoon?.checkOut ? "text-blue-500" : "text-gray-300 dark:text-gray-600"}`} />
                                  <span className={`text-sm font-mono font-black tabular-nums ${emp.afternoon?.checkOut ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                    {emp.afternoon?.checkOut ? formatTime(emp.afternoon.checkOut) : "--:--"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── Total progress ── */}
                          <div className="space-y-2 bg-gray-50/80 dark:bg-gray-800/30 rounded-2xl p-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Timer className="w-3.5 h-3.5 text-violet-500" />
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temps total</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-black tabular-nums ${emp.totalMinutes > 0 ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                  {emp.totalMinutes > 0 ? formatDuration(emp.totalMinutes) : "0h00"}
                                </span>
                                <span className="text-[10px] text-gray-400 font-semibold">/ 7h00</span>
                                <span className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                  progressPct >= 100 ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                  progressPct >= 50 ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" :
                                  progressPct > 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                                  "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                                }`}>{progressPct}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-gray-200/80 dark:bg-gray-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                  progressPct >= 100 ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" :
                                  progressPct >= 50 ? "bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" :
                                  progressPct > 0 ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" :
                                  "bg-gray-300 dark:bg-gray-600"
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* ── Stats row (points, streak, attendance) ── */}
                          <div className="grid grid-cols-3 gap-2">
                            {/* Points */}
                            <div className="text-center p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30">
                              <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                              {pts ? (
                                <>
                                  <p className="text-base font-black text-gray-900 dark:text-white tabular-nums leading-none">{pts.totalPoints}</p>
                                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">/ {pts.maxPossible} pts</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-base font-black text-gray-300 dark:text-gray-600 leading-none">—</p>
                                  <p className="text-[9px] text-gray-300 dark:text-gray-600 font-semibold mt-0.5">points</p>
                                </>
                              )}
                            </div>
                            {/* Streak */}
                            <div className="text-center p-2.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/40 dark:border-orange-800/30">
                              <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                              {pts ? (
                                <>
                                  <p className="text-base font-black text-gray-900 dark:text-white tabular-nums leading-none">{pts.stats.currentStreak}</p>
                                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">streak jours</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-base font-black text-gray-300 dark:text-gray-600 leading-none">—</p>
                                  <p className="text-[9px] text-gray-300 dark:text-gray-600 font-semibold mt-0.5">streak</p>
                                </>
                              )}
                            </div>
                            {/* Attendance rate */}
                            <div className="text-center p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30">
                              <Target className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                              {pts ? (
                                <>
                                  <p className="text-base font-black text-gray-900 dark:text-white tabular-nums leading-none">{pts.stats.daysPresent}</p>
                                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">/ {pts.stats.totalWorkDays} jours</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-base font-black text-gray-300 dark:text-gray-600 leading-none">—</p>
                                  <p className="text-[9px] text-gray-300 dark:text-gray-600 font-semibold mt-0.5">présence</p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* ── Footer: Level + extra stats ── */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/50">
                            <div className="flex items-center gap-3">
                              {pts ? (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                                  pts.levelColor === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40' :
                                  pts.levelColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40' :
                                  pts.levelColor === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40' :
                                  pts.levelColor === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200/60 dark:border-red-800/40'
                                }`}>
                                  <Trophy className="w-3.5 h-3.5" />
                                  {pts.level}
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">—</span>
                              )}
                              {pts && (
                                <span className={`text-xs font-black tabular-nums ${
                                  pts.scorePercent >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                                  pts.scorePercent >= 50 ? "text-violet-600 dark:text-violet-400" :
                                  "text-gray-400 dark:text-gray-500"
                                }`}>{pts.scorePercent}%</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {pts && pts.stats.daysLate > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200/40 dark:border-amber-800/30">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  {pts.stats.daysLate} retard{pts.stats.daysLate > 1 ? "s" : ""}
                                </span>
                              )}
                              {pts && pts.stats.daysAbsent > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg border border-red-200/40 dark:border-red-800/30">
                                  <Minus className="w-2.5 h-2.5" />
                                  {pts.stats.daysAbsent} abs.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 border-dashed">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Aucune donnée pour cette date</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Sélectionnez une autre date</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ========================================
// SUB-COMPONENTS
// ========================================

function StatCard({ icon, label, value, color, progress }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  progress?: number;
}) {
  const colors: Record<string, { bg: string; text: string; iconGrad: string; bar: string; border: string }> = {
    indigo:  { bg: "bg-white/80 dark:bg-gray-900/60",  text: "text-indigo-600 dark:text-indigo-400",  iconGrad: "from-indigo-500 to-blue-600",  bar: "bg-gradient-to-r from-indigo-500 to-blue-500", border: "border-indigo-100 dark:border-indigo-900/40" },
    violet:  { bg: "bg-white/80 dark:bg-gray-900/60",  text: "text-violet-600 dark:text-violet-400",  iconGrad: "from-violet-500 to-purple-600",  bar: "bg-gradient-to-r from-violet-500 to-purple-500", border: "border-violet-100 dark:border-violet-900/40" },
    emerald: { bg: "bg-white/80 dark:bg-gray-900/60", text: "text-emerald-600 dark:text-emerald-400", iconGrad: "from-emerald-500 to-teal-600", bar: "bg-gradient-to-r from-emerald-500 to-teal-500", border: "border-emerald-100 dark:border-emerald-900/40" },
    amber:   { bg: "bg-white/80 dark:bg-gray-900/60",   text: "text-amber-600 dark:text-amber-400",   iconGrad: "from-amber-500 to-orange-600",   bar: "bg-gradient-to-r from-amber-500 to-orange-500", border: "border-amber-100 dark:border-amber-900/40" },
  };
  const c = colors[color] || colors.indigo;

  return (
    <div className={`${c.bg} backdrop-blur-2xl rounded-2xl p-5 border ${c.border} shadow-lg shadow-gray-200/30 dark:shadow-black/10 hover:shadow-xl transition-shadow duration-300`}>
      <div className="flex items-center gap-3.5">
        <div className={`w-10 h-10 bg-gradient-to-br ${c.iconGrad} rounded-xl flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-widest">{label}</p>
          <p className={`text-xl font-black ${c.text} tracking-tight`}>{value}</p>
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full ${c.bar} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}



function SessionCard({ label, subtitle, icon, gradient, session, sessionType, isActive, actionLoading, onAction }: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  session: AttendanceSession | null;
  sessionType: "MORNING" | "AFTERNOON";
  isActive: boolean;
  actionLoading: string | null;
  onAction: (action: "CHECK_IN" | "CHECK_OUT", st: "MORNING" | "AFTERNOON") => void;
}) {
  const hasCheckedIn = !!session?.checkIn;
  const hasCheckedOut = !!session?.checkOut;
  const isComplete = hasCheckedIn && hasCheckedOut;
  const isCheckInLoading = actionLoading === `CHECK_IN_${sessionType}`;
  const isCheckOutLoading = actionLoading === `CHECK_OUT_${sessionType}`;

  return (
    <div className={`relative overflow-hidden bg-white/80 dark:bg-gray-900/60 backdrop-blur-2xl rounded-3xl shadow-xl border transition-all duration-300 group ${
      isActive
        ? "border-indigo-200/80 dark:border-indigo-800/50 shadow-indigo-100/40 dark:shadow-indigo-900/20"
        : "border-gray-100 dark:border-gray-800/60 shadow-gray-200/30 dark:shadow-black/10"
    }`}>
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      )}

      <div className="p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl transition-shadow duration-300`}>
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{label}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-200/80 dark:border-indigo-800/50">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Active
              </span>
            )}
            {isComplete ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/50">
                <CheckCircle className="w-3 h-3" />
                Terminé
              </span>
            ) : hasCheckedIn ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-200/80 dark:border-amber-800/50">
                <Clock className="w-3 h-3" />
                En cours
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-200/80 dark:border-gray-700/50">
                Non pointé
              </span>
            )}
          </div>
        </div>

        {/* Check-in / Check-out Boxes */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
            hasCheckedIn
              ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40"
              : "bg-gray-50/80 dark:bg-gray-800/30 border-gray-200/60 dark:border-gray-700/30 border-dashed"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                hasCheckedIn ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
              }`}>
                <LogIn className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Entrée</span>
            </div>
            <p className={`text-2xl font-black tabular-nums ${hasCheckedIn ? "text-emerald-600 dark:text-emerald-400" : "text-gray-200 dark:text-gray-700"}`}>
              {hasCheckedIn ? formatTime(session!.checkIn!) : "--:--"}
            </p>
          </div>
          <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
            hasCheckedOut
              ? "bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-800/40"
              : "bg-gray-50/80 dark:bg-gray-800/30 border-gray-200/60 dark:border-gray-700/30 border-dashed"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                hasCheckedOut ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
              }`}>
                <LogOut className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sortie</span>
            </div>
            <p className={`text-2xl font-black tabular-nums ${hasCheckedOut ? "text-blue-600 dark:text-blue-400" : "text-gray-200 dark:text-gray-700"}`}>
              {hasCheckedOut ? formatTime(session!.checkOut!) : "--:--"}
            </p>
          </div>
        </div>

        {/* Duration */}
        {session?.durationMinutes && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-violet-50/80 dark:bg-violet-950/20 rounded-xl border border-violet-200/80 dark:border-violet-800/40">
            <Timer className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">Durée: {formatDuration(session.durationMinutes)}</span>
          </div>
        )}

        {/* Anomaly */}
        {session?.anomalyDetected && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-amber-50/80 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-800/40">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{session.anomalyReason}</span>
          </div>
        )}

        {/* Actions */}
        {!isComplete ? (
          <div className="flex gap-3">
            {!hasCheckedIn && (
              <button
                onClick={() => onAction("CHECK_IN", sessionType)}
                disabled={isCheckInLoading || !!actionLoading}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:shadow-2xl active:scale-[0.97]"
              >
                <LogIn className="w-5 h-5" />
                {isCheckInLoading ? "Enregistrement..." : "Pointer Entrée"}
              </button>
            )}
            {hasCheckedIn && !hasCheckedOut && (
              <button
                onClick={() => onAction("CHECK_OUT", sessionType)}
                disabled={isCheckOutLoading || !!actionLoading}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl shadow-rose-200/50 dark:shadow-rose-900/30 hover:shadow-2xl active:scale-[0.97]"
              >
                <LogOut className="w-5 h-5" />
                {isCheckOutLoading ? "Enregistrement..." : "Pointer Sortie"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2.5 px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Session terminée</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ time, label, icon, done, color, duration, isPause }: {
  time: string;
  label: string;
  icon: React.ReactNode;
  done: boolean;
  color: string;
  duration?: string;
  isPause?: boolean;
}) {
  const dotColors: Record<string, string> = {
    emerald: "bg-emerald-500 shadow-emerald-200",
    blue: "bg-blue-500 shadow-blue-200",
    amber: "bg-amber-400 shadow-amber-200",
    orange: "bg-orange-500 shadow-orange-200",
    rose: "bg-rose-500 shadow-rose-200",
  };
  const iconBgColors: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="relative flex items-center gap-4 pl-2">
      <div className={`relative z-10 w-[18px] h-[18px] rounded-full border-[3px] border-white dark:border-gray-900 ${
        done ? `${dotColors[color] || "bg-gray-400"} shadow-md` : "bg-gray-200 dark:bg-gray-700"
      }`} />
      <div className={`flex-1 flex items-center justify-between py-3 ${isPause ? "opacity-40" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            done ? (iconBgColors[color] || "bg-gray-100 text-gray-400") : "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
          }`}>
            {icon}
          </div>
          <span className={`text-sm font-semibold ${done ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {duration && (
            <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-lg">
              {duration}
            </span>
          )}
          {!isPause && (
            <span className={`text-sm font-mono font-bold tabular-nums ${done ? "text-gray-900 dark:text-white" : "text-gray-200 dark:text-gray-700"}`}>
              {time}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}



