"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock, Calendar, TrendingUp, AlertTriangle, CheckCircle, Timer,
  ChevronLeft, ChevronRight, ArrowLeft, Download, Users, BarChart3,
  Sun, Sunset, Coffee, XCircle, Star, Award, Minus, Activity,
} from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ─────────────────────────────────────────────────

interface AttendanceSummary {
  totalWorkedDays: number;
  totalWorkedHours: number;
  totalWorkedMinutes: number;
  expectedWorkDays: number;
  expectedWorkHours: number;
  absentDays: number;
  absentHours: number;
  partialDays: number;
  fullDays: number;
  overtimeHours: number;
  totalLateMinutes: number;
  totalEarlyDepartureMinutes: number;
  lateDays: number;
  earlyDepartureDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  holidayDays: number;
  rewardDays: number;
  attendanceRate: number;
  punctualityRate: number;
}

interface ScheduleRules {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  lateTolerance: number;
  earlyDepartureTolerance: number;
  standardHoursPerDay: number;
}

interface DayDetail {
  date: string;
  dayStatus: string;
  workedMinutes: number;
  expectedMinutes: number;
  isWorkDay: boolean;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  isLate: boolean;
  isEarlyDeparture: boolean;
  holidayName?: string;
  leaveType?: string;
  morning: {
    checkIn: string | null;
    checkOut: string | null;
    duration: number | null;
    status: string;
  } | null;
  afternoon: {
    checkIn: string | null;
    checkOut: string | null;
    duration: number | null;
    status: string;
  } | null;
}

interface SummaryData {
  userId: string;
  year: number;
  month: number;
  summary: AttendanceSummary;
  rules: ScheduleRules;
  dailyDetails: DayDetail[];
}

// ─── Helpers ───────────────────────────────────────────────

function formatTime(dateStr: string | null, loc = 'fr-FR'): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "0min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function getDayStatusLabel(status: string, t: (key: string) => string): { label: string; color: string; bg: string } {
  switch (status) {
    case "FULL_DAY": return { label: t('full_day'), color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" };
    case "HALF_DAY_AM": return { label: t('half_day_am'), color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20" };
    case "HALF_DAY_PM": return { label: t('half_day_pm'), color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20" };
    case "ABSENT": return { label: t('absent_label'), color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" };
    case "LEAVE_FULL": return { label: t('leave_label'), color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" };
    case "LEAVE_HALF_AM": return { label: t('leave_morning'), color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" };
    case "LEAVE_HALF_PM": return { label: t('leave_afternoon'), color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" };
    case "REWARD": return { label: t('reward_day'), color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" };
    case "WEEKEND": return { label: t('weekend_label'), color: "text-gray-500 dark:text-gray-500", bg: "bg-gray-50 dark:bg-gray-800" };
    case "HOLIDAY": return { label: t('public_holiday'), color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" };
    default: return { label: status, color: "text-gray-600", bg: "bg-gray-50" };
  }
}

function getLeaveTypeLabel(type: string | undefined, t: (key: string) => string): string {
  switch (type) {
    case "PAID": return t('paid_leave');
    case "UNPAID": return t('unpaid_leave');
    case "MALADIE": return t('sick_leave');
    case "MATERNITE": return t('maternity_leave');
    case "PREAVIS": return t('notice_period');
    case "REWARD": return t('reward_day');
    default: return t('leave_label');
  }
}

// ─── Main Component ────────────────────────────────────────

export default function AttendanceResumePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const locale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR';

  const MONTH_NAMES_L = [t('january'), t('february'), t('march'), t('april'), t('may_month'), t('june'), t('july'), t('august'), t('september'), t('october'), t('november'), t('december')];
  const DAY_NAMES_L = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
  
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Month/year navigation
  const now = new Date();
  const initYear = parseInt(searchParams.get("year") || String(now.getFullYear()));
  const initMonth = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);
  const [targetUserId, setTargetUserId] = useState<string | null>(searchParams.get("userId"));

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  const isRH = session?.user?.role === "RH" || isAdmin;

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (targetUserId) params.set("userId", targetUserId);
      
      const res = await fetch(`/api/attendance/summary?${params}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || t('server_error'));
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('loading_error'));
    } finally {
      setLoading(false);
    }
  }, [year, month, targetUserId]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchSummary();
    }
  }, [sessionStatus, fetchSummary]);

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  if (sessionStatus === "loading") {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/pointage")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('attendance_summary')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {targetUserId && targetUserId !== session?.user?.id
                ? t('summary_for_employee')
                : t('your_monthly_summary')
              }
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 py-2 font-semibold text-gray-900 dark:text-white min-w-[160px] text-center">
            {MONTH_NAMES_L[month - 1]} {year}
          </span>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
          </div>
        </div>
      ) : data ? (
        <>
          {/* Schedule Rules Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('work_schedule')}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/20">
                <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-medium">{t('morning')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.rules.morningStart} — {data.rules.morningEnd}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/20">
                <Sunset className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-orange-600 dark:text-orange-400 font-medium">{t('afternoon')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.rules.afternoonStart} — {data.rules.afternoonEnd}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <Timer className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium">{t('tolerance')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.rules.lateTolerance} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-violet-50 dark:bg-violet-900/10 rounded-lg border border-violet-100 dark:border-violet-900/20">
                <Clock className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-violet-600 dark:text-violet-400 font-medium">{t('workday')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.rules.standardHoursPerDay}h / {t('day')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Worked */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-bl-[60px] -mr-2 -mt-2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('worked_days')}</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data.summary.totalWorkedDays}
                  <span className="text-sm font-normal text-gray-400"> / {data.summary.expectedWorkDays}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  {formatDuration(data.summary.totalWorkedMinutes)} {t('worked')}
                </p>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-bl-[60px] -mr-2 -mt-2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('attendance_rate')}</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data.summary.attendanceRate}%
                </p>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      data.summary.attendanceRate >= 90 ? "bg-green-500" :
                      data.summary.attendanceRate >= 75 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, data.summary.attendanceRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Late Minutes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-bl-[60px] -mr-2 -mt-2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Timer className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('late_arrivals')}</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatDuration(data.summary.totalLateMinutes)}
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  {data.summary.lateDays} {t('days_late')}
                </p>
              </div>
            </div>

            {/* Absences */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-bl-[60px] -mr-2 -mt-2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('absences')}</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data.summary.absentDays}
                  <span className="text-sm font-normal text-gray-400"> {t('days')}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  {formatDuration(Math.round(data.summary.absentHours * 60))} {t('not_worked')}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary Stats + Punctuality */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Punctuality Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('punctuality')}</span>
                </div>
                <span className={`text-2xl font-bold ${
                  data.summary.punctualityRate >= 90 ? "text-green-600" :
                  data.summary.punctualityRate >= 75 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {data.summary.punctualityRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    data.summary.punctualityRate >= 90 ? "bg-green-500" :
                    data.summary.punctualityRate >= 75 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, data.summary.punctualityRate)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                {t('based_on_tolerance')} {data.rules.lateTolerance} {t('minutes')}
              </p>
            </div>

            {/* Secondary Stats Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatMini icon={<TrendingUp className="w-4 h-4" />} label={t('overtime')} value={`${data.summary.overtimeHours}h`} color="green" />
              <StatMini icon={<Minus className="w-4 h-4" />} label={t('early_departure')} value={formatDuration(data.summary.totalEarlyDepartureMinutes)} color="amber" />
              <StatMini icon={<Calendar className="w-4 h-4" />} label={t('paid_leave')} value={`${data.summary.paidLeaveDays}j`} color="blue" />
              <StatMini icon={<Activity className="w-4 h-4" />} label={t('sick_leave')} value={`${data.summary.sickLeaveDays}j`} color="pink" />
              <StatMini icon={<Star className="w-4 h-4" />} label={t('public_holidays')} value={`${data.summary.holidayDays}j`} color="indigo" />
              <StatMini icon={<Award className="w-4 h-4" />} label={t('reward_days')} value={`${data.summary.rewardDays}j`} color="purple" />
            </div>
          </div>

          {/* Daily Details Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                {t('daily_detail')}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{t('day')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{t('status')}</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-1"><Sun className="w-3.5 h-3.5" /> {t('morning')}</div>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-1"><Sunset className="w-3.5 h-3.5" /> {t('afternoon')}</div>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">{t('duration')}</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">{t('late_arrivals')}</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">{t('early_departure')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.dailyDetails.map((day) => {
                    const status = getDayStatusLabel(day.dayStatus, t);
                    const dateObj = new Date(day.date + "T00:00:00");
                    const dayName = DAY_NAMES_L[dateObj.getDay()];
                    const dayNum = dateObj.getDate();
                    const isWeekend = day.dayStatus === "WEEKEND";
                    const isHoliday = day.dayStatus === "HOLIDAY";
                    const isNonWork = isWeekend || isHoliday;

                    return (
                      <tr
                        key={day.date}
                        className={`
                          ${isNonWork ? "bg-gray-50/50 dark:bg-gray-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}
                          ${day.isLate ? "border-l-2 border-l-orange-400" : ""}
                          transition-colors
                        `}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${isWeekend ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
                              {dayName}
                            </span>
                            <span className={`font-semibold ${isNonWork ? "text-gray-400" : "text-gray-900 dark:text-white"}`}>
                              {dayNum}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${status.color} ${status.bg}`}>
                            {status.label}
                          </span>
                          {day.holidayName && (
                            <span className="block text-xs text-indigo-500 mt-0.5">{day.holidayName}</span>
                          )}
                          {day.leaveType && (
                            <span className="block text-xs text-blue-500 mt-0.5">{getLeaveTypeLabel(day.leaveType, t)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {day.morning ? (
                            <div className="text-xs space-y-0.5">
                              <div className="text-gray-700 dark:text-gray-300">
                                {formatTime(day.morning.checkIn, locale)} → {formatTime(day.morning.checkOut, locale)}
                              </div>
                              {day.morning.duration !== null && (
                                <div className="text-gray-400">{formatDuration(day.morning.duration)}</div>
                              )}
                            </div>
                          ) : isNonWork ? (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          ) : (
                            <span className="text-gray-400 text-xs">{t('not_clocked')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {day.afternoon ? (
                            <div className="text-xs space-y-0.5">
                              <div className="text-gray-700 dark:text-gray-300">
                                {formatTime(day.afternoon.checkIn, locale)} → {formatTime(day.afternoon.checkOut, locale)}
                              </div>
                              {day.afternoon.duration !== null && (
                                <div className="text-gray-400">{formatDuration(day.afternoon.duration)}</div>
                              )}
                            </div>
                          ) : isNonWork ? (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          ) : (
                            <span className="text-gray-400 text-xs">{t('not_clocked')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isNonWork ? (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          ) : (
                            <span className={`text-sm font-medium ${
                              day.workedMinutes >= day.expectedMinutes ? "text-green-600" :
                              day.workedMinutes > 0 ? "text-yellow-600" : "text-red-500"
                            }`}>
                              {formatDuration(day.workedMinutes)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {day.isLate ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20">
                              +{day.lateMinutes}min
                            </span>
                          ) : isNonWork ? (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          ) : day.isWorkDay && (day.dayStatus !== "ABSENT" && day.dayStatus !== "LEAVE_FULL" && day.dayStatus !== "REWARD") ? (
                            <span className="text-green-500 text-xs">✓ {t('on_time')}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {day.isEarlyDeparture ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20">
                              -{day.earlyDepartureMinutes}min
                            </span>
                          ) : isNonWork ? (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Mini Stat Component ───────────────────────────────────

function StatMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    green: "bg-green-50 dark:bg-green-900/20 text-green-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    pink: "bg-pink-50 dark:bg-pink-900/20 text-pink-600",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-3">
      <div className={`p-1.5 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
