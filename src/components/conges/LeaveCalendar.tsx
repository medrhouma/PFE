"use client"

import { useState, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Check,
  X,
  Info,
  Star,
  Flag,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react"

interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  duration: number
  reason: string
  status: string
  createdAt: string
  userName: string
  userEmail: string
}

interface LeaveCalendarProps {
  requests: LeaveRequest[]
  onSelectRequest?: (request: LeaveRequest) => void
}

// ========================================
// CONSTANTS
// ========================================
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string; border: string }> = {
  PAID:      { label: "Congé payé",       color: "text-blue-700 dark:text-blue-300",    dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20",      border: "border-blue-200 dark:border-blue-800" },
  UNPAID:    { label: "Sans solde",        color: "text-gray-700 dark:text-gray-300",    dot: "bg-gray-500",    bg: "bg-gray-50 dark:bg-gray-800/50",      border: "border-gray-200 dark:border-gray-700" },
  MALADIE:   { label: "Maladie",           color: "text-red-700 dark:text-red-300",      dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-900/20",        border: "border-red-200 dark:border-red-800" },
  MATERNITE: { label: "Maternité",         color: "text-pink-700 dark:text-pink-300",    dot: "bg-pink-500",    bg: "bg-pink-50 dark:bg-pink-900/20",      border: "border-pink-200 dark:border-pink-800" },
  PREAVIS:   { label: "Préavis",           color: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500",  bg: "bg-purple-50 dark:bg-purple-900/20",  border: "border-purple-200 dark:border-purple-800" },
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  EN_ATTENTE: { label: "En attente", icon: <Clock className="w-3 h-3" />, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
  VALIDE:     { label: "Approuvé",   icon: <Check className="w-3 h-3" />, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
  REFUSE:     { label: "Refusé",     icon: <X className="w-3 h-3" />,     color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400" },
}

// ========================================
// JOURS FÉRIÉS TUNISIENS
// ========================================
interface Holiday {
  name: string
  type: "national" | "religious"
  icon: "flag" | "star" | "sun" | "moon" | "sparkles"
}

// Jours fériés fixes (présidentiels/nationaux)
const FIXED_HOLIDAYS: Record<string, Holiday> = {
  "01-01": { name: "Nouvel An",                          type: "national",  icon: "sparkles" },
  "01-14": { name: "Anniversaire de la Révolution",      type: "national",  icon: "flag" },
  "03-20": { name: "Fête de l'Indépendance",             type: "national",  icon: "flag" },
  "04-09": { name: "Journée des Martyrs",                type: "national",  icon: "flag" },
  "05-01": { name: "Fête du Travail",                    type: "national",  icon: "sun" },
  "07-25": { name: "Fête de la République",              type: "national",  icon: "flag" },
  "08-13": { name: "Journée de la Femme",                type: "national",  icon: "sparkles" },
  "10-15": { name: "Fête de l'Évacuation",               type: "national",  icon: "flag" },
}

// Jours fériés religieux (dates approximatives, basées sur le calendrier hégirien)
// Les dates changent chaque année (~10-11 jours plus tôt par an grégorien)
const RELIGIOUS_HOLIDAYS: Record<number, Record<string, Holiday>> = {
  2025: {
    "03-30": { name: "Aïd el-Fitr (1er jour)",           type: "religious", icon: "moon" },
    "03-31": { name: "Aïd el-Fitr (2ème jour)",          type: "religious", icon: "moon" },
    "06-06": { name: "Aïd el-Adha (1er jour)",           type: "religious", icon: "star" },
    "06-07": { name: "Aïd el-Adha (2ème jour)",          type: "religious", icon: "star" },
    "06-27": { name: "Ras el-Am el-Hijri",               type: "religious", icon: "moon" },
    "09-05": { name: "Mouled (Mawlid Ennabi)",           type: "religious", icon: "star" },
  },
  2026: {
    "03-20": { name: "Aïd el-Fitr (1er jour)",           type: "religious", icon: "moon" },
    "03-21": { name: "Aïd el-Fitr (2ème jour)",          type: "religious", icon: "moon" },
    "05-27": { name: "Aïd el-Adha (1er jour)",           type: "religious", icon: "star" },
    "05-28": { name: "Aïd el-Adha (2ème jour)",          type: "religious", icon: "star" },
    "06-17": { name: "Ras el-Am el-Hijri",               type: "religious", icon: "moon" },
    "08-26": { name: "Mouled (Mawlid Ennabi)",           type: "religious", icon: "star" },
  },
  2027: {
    "03-10": { name: "Aïd el-Fitr (1er jour)",           type: "religious", icon: "moon" },
    "03-11": { name: "Aïd el-Fitr (2ème jour)",          type: "religious", icon: "moon" },
    "05-16": { name: "Aïd el-Adha (1er jour)",           type: "religious", icon: "star" },
    "05-17": { name: "Aïd el-Adha (2ème jour)",          type: "religious", icon: "star" },
    "06-07": { name: "Ras el-Am el-Hijri",               type: "religious", icon: "moon" },
    "08-16": { name: "Mouled (Mawlid Ennabi)",           type: "religious", icon: "star" },
  },
}

function getHoliday(date: Date): Holiday | null {
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const key = `${mm}-${dd}`
  const year = date.getFullYear()

  // Check fixed holidays first
  if (FIXED_HOLIDAYS[key]) return FIXED_HOLIDAYS[key]

  // Check religious holidays for this year
  if (RELIGIOUS_HOLIDAYS[year] && RELIGIOUS_HOLIDAYS[year][key]) {
    return RELIGIOUS_HOLIDAYS[year][key]
  }

  return null
}

// ========================================
// HELPERS
// ========================================
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return d >= s && d <= e
}

// ========================================
// COMPONENT
// ========================================
export function LeaveCalendar({ requests, onSelectRequest }: LeaveCalendarProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [hoveredRequest, setHoveredRequest] = useState<string | null>(null)

  // Navigate months
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDay(null)
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDay(today)
  }

  // Get leaves for a specific day
  const getLeavesForDay = (day: Date): LeaveRequest[] => {
    return requests.filter(req => {
      const start = new Date(req.startDate)
      const end = new Date(req.endDate)
      return isDateInRange(day, start, end)
    })
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth === 0 ? 11 : currentMonth - 1)
    
    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      days.push({
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true,
      })
    }

    // Next month days to fill grid (6 rows)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
      days.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false,
      })
    }

    return days
  }, [currentYear, currentMonth])

  // Leaves for selected day
  const selectedDayLeaves = selectedDay ? getLeavesForDay(selectedDay) : []

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    
    const monthRequests = requests.filter(req => {
      const start = new Date(req.startDate)
      const end = new Date(req.endDate)
      return start <= monthEnd && end >= monthStart
    })

    return {
      total: monthRequests.length,
      pending: monthRequests.filter(r => r.status === "EN_ATTENTE").length,
      approved: monthRequests.filter(r => r.status === "VALIDE").length,
      rejected: monthRequests.filter(r => r.status === "REFUSE").length,
      uniqueEmployees: new Set(monthRequests.map(r => r.userEmail)).size,
    }
  }, [requests, currentYear, currentMonth])

  const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.PAID
  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.EN_ATTENTE

  const HolidayIcon = ({ holiday, size = "sm" }: { holiday: Holiday; size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"
    const containerSize = size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-5 h-5"
    const isNational = holiday.type === "national"
    const containerClasses = isNational
      ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-200 dark:shadow-emerald-900/50"
      : "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200 dark:shadow-amber-900/50"

    const iconMap: Record<string, React.ReactNode> = {
      flag:     <Flag className={`${sizeClasses} text-white drop-shadow-sm`} />,
      star:     <Star className={`${sizeClasses} text-white drop-shadow-sm`} fill="white" fillOpacity={0.3} />,
      sun:      <Sun className={`${sizeClasses} text-white drop-shadow-sm`} />,
      moon:     <Moon className={`${sizeClasses} text-white drop-shadow-sm`} fill="white" fillOpacity={0.3} />,
      sparkles: <Sparkles className={`${sizeClasses} text-white drop-shadow-sm`} />,
    }

    return (
      <div className={`${containerSize} rounded-lg ${containerClasses} shadow-md flex items-center justify-center flex-shrink-0`}>
        {iconMap[holiday.icon] || iconMap.flag}
      </div>
    )
  }

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-5 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3 relative">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shadow-lg shadow-black/10 backdrop-blur-sm border border-white/20">
              <CalendarIcon className="w-6 h-6 text-white drop-shadow-sm" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Calendrier des Congés</h3>
              <p className="text-white/70 text-xs">Vue mensuelle des absences</p>
            </div>
          </div>
          <button
            onClick={goToToday}
            className="relative px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-black/10 backdrop-blur-sm border border-white/20 hover:scale-105 active:scale-95"
          >
            Aujourd&apos;hui
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between relative z-10">
          <button
            onClick={goToPrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all duration-200 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-extrabold text-white tracking-wide drop-shadow-sm">
            {MONTHS_FR[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all duration-200 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Monthly Mini Stats */}
        <div className="grid grid-cols-4 gap-2.5 mt-4 relative z-10">
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm border border-white/10">
            <p className="text-xl font-extrabold text-white">{monthlyStats.total}</p>
            <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium">Total</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm border border-white/10">
            <p className="text-xl font-extrabold text-amber-300">{monthlyStats.pending}</p>
            <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium">En attente</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm border border-white/10">
            <p className="text-xl font-extrabold text-emerald-300">{monthlyStats.approved}</p>
            <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium">Approuvés</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm border border-white/10">
            <p className="text-xl font-extrabold text-white/90">{monthlyStats.uniqueEmployees}</p>
            <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium">Employés</p>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_FR.map((day, i) => (
            <div
              key={day}
              className={`text-center text-[11px] font-bold uppercase tracking-widest py-2.5 ${
                i >= 5 ? "text-red-400 dark:text-red-500" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const leaves = getLeavesForDay(date)
            const isToday = isSameDay(date, today)
            const isSelected = selectedDay ? isSameDay(date, selectedDay) : false
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const hasPending = leaves.some(l => l.status === "EN_ATTENTE")
            const holiday = isCurrentMonth ? getHoliday(date) : null

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : date)}
                className={`
                  relative min-h-[80px] p-1.5 rounded-xl text-left transition-all duration-200 group/cell
                  ${!isCurrentMonth ? "opacity-30" : ""}
                  ${isSelected
                    ? "bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500 shadow-md"
                    : isToday
                    ? "bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-300 dark:ring-violet-700"
                    : holiday
                    ? holiday.type === "national"
                      ? "bg-emerald-50/70 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800"
                      : "bg-amber-50/70 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800"
                    : isWeekend
                    ? "bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/40"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }
                  ${leaves.length > 0 && isCurrentMonth ? "cursor-pointer" : ""}
                `}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday
                        ? "bg-violet-600 text-white shadow-sm"
                        : isSelected
                        ? "bg-indigo-600 text-white"
                        : isWeekend
                        ? "text-red-400 dark:text-red-500"
                        : "text-gray-700 dark:text-gray-300"
                      }
                    `}
                  >
                    {date.getDate()}
                  </span>
                  {holiday && (
                    <HolidayIcon holiday={holiday} size="sm" />
                  )}
                  {hasPending && isCurrentMonth && !holiday && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Holiday Name Badge */}
                {holiday && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] leading-tight font-bold truncate ${
                    holiday.type === "national"
                      ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`} title={holiday.name}>
                    {holiday.name}
                  </div>
                )}

                {/* Leave Indicators */}
                {isCurrentMonth && leaves.length > 0 && (
                  <div className="space-y-0.5">
                    {leaves.slice(0, 2).map((leave) => {
                      const typeConf = getTypeConfig(leave.type)
                      return (
                        <div
                          key={leave.id}
                          onMouseEnter={() => setHoveredRequest(leave.id)}
                          onMouseLeave={() => setHoveredRequest(null)}
                          className={`
                            flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate
                            ${typeConf.bg} ${typeConf.color} ${typeConf.border} border
                            ${hoveredRequest === leave.id ? "ring-1 ring-indigo-400 scale-[1.02]" : ""}
                            transition-all duration-150
                          `}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeConf.dot} ${
                            leave.status === "EN_ATTENTE" ? "animate-pulse" : ""
                          }`} />
                          <span className="truncate">{leave.userName?.split(" ")[0] || "?"}</span>
                        </div>
                      )
                    })}
                    {leaves.length > 2 && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium pl-1">
                        +{leaves.length - 2} autre{leaves.length - 2 > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5">Légende</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2.5">
          {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${conf.dot} ring-2 ring-white dark:ring-gray-800 shadow-sm`} />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{conf.label}</span>
            </div>
          ))}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 self-center mx-1" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm flex items-center justify-center">
              <Flag className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Fête nationale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white" fill="white" fillOpacity={0.3} />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Fête religieuse</span>
          </div>
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDay && (
        <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 rounded-xl flex items-center justify-center shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
                <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">
                  {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedDayLeaves.length} congé{selectedDayLeaves.length !== 1 ? "s" : ""} ce jour
                </p>
                {(() => {
                  const selHoliday = getHoliday(selectedDay)
                  return selHoliday ? (
                    <div className={`inline-flex items-center gap-2.5 mt-2 px-3.5 py-2 rounded-xl text-sm font-bold shadow-sm ${
                      selHoliday.type === "national"
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200 dark:from-emerald-900/30 dark:to-teal-900/30 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-200 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-300 dark:border-amber-800"
                    }`}>
                      <HolidayIcon holiday={selHoliday} size="md" />
                      <span>{selHoliday.name}</span>
                    </div>
                  ) : null
                })()}
              </div>
            </div>

            {selectedDayLeaves.length === 0 ? (
              <div className="flex items-center gap-3 py-6 justify-center text-gray-400 dark:text-gray-500">
                <Info className="w-5 h-5" />
                <span className="text-sm">Aucun congé prévu ce jour</span>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayLeaves.map((leave) => {
                  const typeConf = getTypeConfig(leave.type)
                  const statusConf = getStatusConfig(leave.status)
                  return (
                    <div
                      key={leave.id}
                      onClick={() => onSelectRequest?.(leave)}
                      className={`
                        group p-4 rounded-xl border ${typeConf.border} ${typeConf.bg}
                        hover:shadow-md transition-all duration-200 cursor-pointer
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
                            {leave.userName?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {leave.userName || "Inconnu"}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {leave.userEmail}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${statusConf.color}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                        <span className={`inline-flex items-center gap-1 ${typeConf.color} font-medium`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeConf.dot}`} />
                          {typeConf.label}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(leave.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          {" → "}
                          {new Date(leave.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {leave.duration} jour{leave.duration > 1 ? "s" : ""}
                        </span>
                      </div>

                      {leave.reason && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic line-clamp-1">
                          &quot;{leave.reason}&quot;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveCalendar
