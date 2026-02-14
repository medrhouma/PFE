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
  UserCheck,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
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
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamDate, setTeamDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [teamSearch, setTeamSearch] = useState("");

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today status
  const fetchStatus = useCallback(async () => {
    if (isAdmin) {
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
  }, [isAdmin]);

  // Fetch team attendance (RH only)
  const fetchTeamData = useCallback(async (date: string) => {
    if (!isRH) return;
    setTeamLoading(true);
    try {
      const res = await fetch(`/api/attendance/team?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setTeamData(data);
      }
    } catch {
      console.error("Failed to fetch team data");
    } finally {
      setTeamLoading(false);
    }
  }, [isRH]);

  useEffect(() => {
    if (!isAdmin) fetchStatus();
    if (isRH) fetchTeamData(teamDate);
    const interval = isAdmin ? null : setInterval(fetchStatus, 60000);
    return () => { if (interval) clearInterval(interval); };
  }, [fetchStatus, fetchTeamData, isRH, isAdmin, teamDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (!isAdmin) await fetchStatus();
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
  const progressPercent = Math.min(100, Math.round((totalMinutes / 480) * 100));

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
                {isAdmin ? "Suivi du pointage" : "Pointage du jour"}
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
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 text-white/60 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                      <Users className="w-3.5 h-3.5" />
                      Vue administrateur
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
        {!isAdmin && error && (
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
        {!isAdmin && success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm shadow-sm animate-in slide-in-from-top-2">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* ============ STATS GRID (employees only) ============ */}
        {!isAdmin && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Timer className="w-5 h-5" />} label="Aujourd'hui" value={totalMinutes > 0 ? formatDuration(totalMinutes) : "0h00"} color="indigo" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Objectif" value="8h00" color="violet" />
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

        {/* ============ SESSION CARDS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SessionCard
            label="Matin"
            subtitle="08:00 – 13:00"
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
          <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-2xl rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-black/20 border border-gray-100 dark:border-gray-800/60 overflow-hidden">
            {/* Header */}
            <div className="px-7 py-5 border-b border-gray-100 dark:border-gray-800/60">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30">
                    <Users className="w-4 h-4" />
                  </div>
                  Pointage de l&apos;équipe
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Date Navigation */}
                  <div className="flex items-center gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1 border border-gray-200/60 dark:border-gray-700/60">
                    <button
                      onClick={() => {
                        const d = new Date(teamDate);
                        d.setDate(d.getDate() - 1);
                        setTeamDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                      }}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 active:scale-95 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <div className="flex items-center gap-1.5 px-2">
                      <Calendar className="w-3.5 h-3.5 text-violet-500" />
                      <input
                        type="date"
                        value={teamDate}
                        onChange={(e) => setTeamDate(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 border-0 focus:outline-none focus:ring-0 w-[130px]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const d = new Date(teamDate);
                        d.setDate(d.getDate() + 1);
                        setTeamDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                      }}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 active:scale-95 transition-all"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un employé..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="pl-10 pr-4 py-2.5 text-sm bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 text-gray-700 dark:text-gray-200 w-56 placeholder:text-gray-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Team Stats */}
              {teamData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <TeamStatCard icon={<Users className="w-4.5 h-4.5" />} label="Total" value={teamData.totalEmployees} gradient="from-indigo-500 to-blue-600" bgClass="bg-indigo-50 dark:bg-indigo-900/20" textClass="text-indigo-600 dark:text-indigo-400" />
                  <TeamStatCard icon={<UserCheck className="w-4.5 h-4.5" />} label="Présents" value={teamData.present} gradient="from-emerald-500 to-teal-600" bgClass="bg-emerald-50 dark:bg-emerald-900/20" textClass="text-emerald-600 dark:text-emerald-400" />
                  <TeamStatCard icon={<UserX className="w-4.5 h-4.5" />} label="Absents" value={teamData.absent} gradient="from-red-500 to-rose-600" bgClass="bg-red-50 dark:bg-red-900/20" textClass="text-red-600 dark:text-red-400" />
                  <TeamStatCard icon={<CheckCircle className="w-4.5 h-4.5" />} label="Complets" value={teamData.complete} gradient="from-violet-500 to-purple-600" bgClass="bg-violet-50 dark:bg-violet-900/20" textClass="text-violet-600 dark:text-violet-400" />
                </div>
              )}
            </div>

            {/* Team Table */}
            {teamLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin w-8 h-8 border-[3px] border-violet-500 border-t-transparent rounded-full" />
                <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">Chargement de l&apos;équipe...</span>
              </div>
            ) : teamData && teamData.employees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60 dark:bg-gray-800/40">
                      <th className="text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-7 py-4">Employé</th>
                      <th className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-4">Matin Entrée</th>
                      <th className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-4">Matin Sortie</th>
                      <th className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-4">PM Entrée</th>
                      <th className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-4">PM Sortie</th>
                      <th className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-4">Total</th>
                      <th className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 py-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80 dark:divide-gray-800/50">
                    {teamData.employees
                      .filter((emp) => {
                        if (!teamSearch) return true;
                        const q = teamSearch.toLowerCase();
                        return emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q);
                      })
                      .map((emp, idx) => {
                        const statusConfig = {
                          absent:   { label: "Absent",   cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
                          partial:  { label: "En cours",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
                          present:  { label: "Présent",   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
                          complete: { label: "Complet",   cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", dot: "bg-indigo-500" },
                        };
                        const st = statusConfig[emp.dayStatus];
                        const avatarColors = [
                          "from-indigo-400 to-violet-500",
                          "from-emerald-400 to-teal-500",
                          "from-amber-400 to-orange-500",
                          "from-rose-400 to-pink-500",
                          "from-cyan-400 to-blue-500",
                          "from-fuchsia-400 to-purple-500",
                        ];
                        const avatarGrad = avatarColors[idx % avatarColors.length];

                        return (
                          <tr key={emp.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors group">
                            <td className="px-7 py-4">
                              <div className="flex items-center gap-3.5">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                                  {emp.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{emp.name}</p>
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate font-medium">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-center px-3 py-4"><TimeDisplay time={emp.morning?.checkIn} /></td>
                            <td className="text-center px-3 py-4"><TimeDisplay time={emp.morning?.checkOut} /></td>
                            <td className="text-center px-3 py-4"><TimeDisplay time={emp.afternoon?.checkIn} /></td>
                            <td className="text-center px-3 py-4"><TimeDisplay time={emp.afternoon?.checkOut} /></td>
                            <td className="text-center px-3 py-4">
                              <span className={`text-sm font-bold tabular-nums ${emp.totalMinutes > 0 ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                {emp.totalMinutes > 0 ? formatDuration(emp.totalMinutes) : "-"}
                              </span>
                            </td>
                            <td className="text-center px-3 py-4">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg ${st.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Aucune donnée disponible pour cette date</p>
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

function TeamStatCard({ icon, label, value, gradient, bgClass, textClass }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient: string;
  bgClass: string;
  textClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${bgClass} rounded-xl border border-gray-100/50 dark:border-gray-700/30`}>
      <div className={`w-8 h-8 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center text-white shadow-md`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{label}</p>
        <p className={`text-xl font-black ${textClass}`}>{value}</p>
      </div>
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

function TimeDisplay({ time }: { time: string | null | undefined }) {
  if (!time) return <span className="text-sm text-gray-200 dark:text-gray-700 font-mono font-bold">--:--</span>;
  return <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300 tabular-nums">{formatTime(time)}</span>;
}

