"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useNotification } from "@/contexts/NotificationContext"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Star,
  Moon,
  DollarSign,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  Search,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface JourFerie {
  id: string
  nom: string
  date: string
  type: "NATIONAL" | "RELIGIEUX"
  recurrent: boolean
  paye: boolean
  description: string | null
  annee: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

type SortField = "date" | "nom" | "type"
type SortOrder = "asc" | "desc"
type FilterType = "all" | "NATIONAL" | "RELIGIEUX"

export default function JoursFeriesPage() {
  const { data: session } = useSession()
  const { showNotification } = useNotification()
  const { t, language, isRTL } = useLanguage()
  
  const [holidays, setHolidays] = useState<JourFerie[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingHoliday, setEditingHoliday] = useState<JourFerie | null>(null)
  const [saving, setSaving] = useState(false)

  // Table controls
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  
  // Form state
  const [formData, setFormData] = useState({
    nom: "",
    date: "",
    type: "NATIONAL" as "NATIONAL" | "RELIGIEUX",
    recurrent: true,
    paye: true,
    description: "",
  })

  // Duplicate form state
  const [duplicateData, setDuplicateData] = useState({
    fromYear: selectedYear,
    toYear: selectedYear + 1,
  })

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/holidays?annee=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setHolidays(Array.isArray(data) ? data : [])
      } else {
        showNotification({ type: "error", title: t("error"), message: t("error_loading_holidays") })
      }
    } catch (error) {
      console.error("Error fetching holidays:", error)
      showNotification({ type: "error", title: t("error"), message: t("error_loading_holidays") })
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const resetForm = () => {
    setFormData({
      nom: "",
      date: "",
      type: "NATIONAL",
      recurrent: true,
      paye: true,
      description: "",
    })
    setEditingHoliday(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (holiday: JourFerie) => {
    setEditingHoliday(holiday)
    const dateStr = new Date(holiday.date).toISOString().split("T")[0]
    setFormData({
      nom: holiday.nom,
      date: dateStr,
      type: holiday.type,
      recurrent: holiday.recurrent,
      paye: holiday.paye,
      description: holiday.description || "",
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        annee: selectedYear,
      }

      const url = editingHoliday
        ? `/api/holidays/${editingHoliday.id}`
        : "/api/holidays"
      const method = editingHoliday ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        showNotification({
          type: "success",
          title: t("success"),
          message: editingHoliday
            ? t("holiday_updated_success")
            : t("holiday_created_success"),
        })
        setShowModal(false)
        resetForm()
        fetchHolidays()
      } else {
        const error = await response.json()
        showNotification({
          type: "error",
          title: t("error"),
          message: error.error || t("error"),
        })
      }
    } catch (error) {
      console.error("Error saving holiday:", error)
      showNotification({ type: "error", title: t("error"), message: t("error") })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/holidays/${id}`, { method: "DELETE" })
      if (response.ok) {
        showNotification({ type: "success", title: t("success"), message: t("holiday_deleted_success") })
        setShowDeleteConfirm(null)
        fetchHolidays()
      } else {
        showNotification({ type: "error", title: t("error"), message: t("error") })
      }
    } catch (error) {
      console.error("Error deleting holiday:", error)
      showNotification({ type: "error", title: t("error"), message: t("error") })
    }
  }

  const handleDuplicate = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/holidays/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicateData),
      })

      if (response.ok) {
        const result = await response.json()
        showNotification({
          type: "success",
          title: t("success"),
          message: result.message,
        })
        setShowDuplicateModal(false)
        if (duplicateData.toYear !== selectedYear) {
          setSelectedYear(duplicateData.toYear)
        } else {
          fetchHolidays()
        }
      } else {
        const error = await response.json()
        showNotification({ type: "error", title: t("error"), message: error.error || t("error") })
      }
    } catch (error) {
      console.error("Error duplicating holidays:", error)
      showNotification({ type: "error", title: t("error"), message: t("error") })
    } finally {
      setSaving(false)
    }
  }

  // Filtered & sorted holidays
  const filteredHolidays = holidays
    .filter((h) => {
      if (filterType !== "all" && h.type !== filterType) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          h.nom.toLowerCase().includes(q) ||
          (h.description && h.description.toLowerCase().includes(q))
        )
      }
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      } else if (sortField === "nom") {
        cmp = a.nom.localeCompare(b.nom)
      } else if (sortField === "type") {
        cmp = a.type.localeCompare(b.type)
      }
      return sortOrder === "asc" ? cmp : -cmp
    })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(language === "ar" ? "ar-TN" : language === "en" ? "en-US" : "fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(language === "ar" ? "ar-TN" : language === "en" ? "en-US" : "fr-FR", {
      weekday: "long",
    })
  }

  const totalHolidays = holidays.length
  const paidHolidays = holidays.filter((h) => h.paye).length
  const religiousHolidays = holidays.filter((h) => h.type === "RELIGIEUX").length
  const nationalHolidays = holidays.filter((h) => h.type === "NATIONAL").length

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={`w-3.5 h-3.5 transition-colors ${
        sortField === field ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
      }`}
    />
  )

  return (
    <div className={`max-w-7xl mx-auto p-4 sm:p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            {t("public_holidays")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("manage_holidays_desc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t("add_holiday")}
          </button>
          <button
            onClick={() => {
              setDuplicateData({ fromYear: selectedYear, toYear: selectedYear + 1 })
              setShowDuplicateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            <Copy className="w-5 h-5" />
            {t("duplicate_year")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHolidays}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("total_holidays")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Star className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{nationalHolidays}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("national_holidays")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Moon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{religiousHolidays}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("religious_holidays")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{paidHolidays}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("paid_holidays")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Year selector + Search + Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Year navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="text-xl font-bold text-gray-900 dark:text-white min-w-[80px] text-center">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search") + "..."}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Filter by type */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterType === "all"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              {t("all")}
            </button>
            <button
              onClick={() => setFilterType("NATIONAL")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                filterType === "NATIONAL"
                  ? "bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              <Star className="w-3 h-3" />
              {t("national")}
            </button>
            <button
              onClick={() => setFilterType("RELIGIEUX")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                filterType === "RELIGIEUX"
                  ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              <Moon className="w-3 h-3" />
              {t("religious")}
            </button>
          </div>

          <button
            onClick={fetchHolidays}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={t("refresh")}
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-gray-400">
            <Calendar className="w-14 h-14 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{t("no_holidays")}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t("no_holidays_desc")}</p>
            <button
              onClick={() => openCreateModal()}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("add_holiday")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3.5">
                    <button
                      onClick={() => toggleSort("nom")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {t("holiday_name")}
                      <SortIcon field="nom" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3.5">
                    <button
                      onClick={() => toggleSort("date")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {t("date")}
                      <SortIcon field="date" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("day_name")}
                    </span>
                  </th>
                  <th className="text-left px-5 py-3.5">
                    <button
                      onClick={() => toggleSort("type")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {t("type")}
                      <SortIcon field="type" />
                    </button>
                  </th>
                  <th className="text-center px-5 py-3.5 hidden md:table-cell">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("fixed_date")}
                    </span>
                  </th>
                  <th className="text-center px-5 py-3.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("paid_holiday")}
                    </span>
                  </th>
                  <th className="text-right px-5 py-3.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("actions")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredHolidays.map((holiday) => {
                  const isPast = new Date(holiday.date) < new Date(new Date().setHours(0, 0, 0, 0))
                  return (
                    <tr
                      key={holiday.id}
                      className={`group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        isPast ? "opacity-60" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg flex-shrink-0 ${
                              holiday.type === "RELIGIEUX"
                                ? "bg-emerald-100 dark:bg-emerald-900/30"
                                : "bg-red-100 dark:bg-red-900/30"
                            }`}
                          >
                            {holiday.type === "RELIGIEUX" ? (
                              <Moon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Star className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {holiday.nom}
                            </p>
                            {holiday.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                                {holiday.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(holiday.date)}
                        </span>
                      </td>

                      {/* Day name */}
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {getDayName(holiday.date)}
                        </span>
                      </td>

                      {/* Type badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            holiday.type === "RELIGIEUX"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {holiday.type === "RELIGIEUX" ? (
                            <Moon className="w-3 h-3" />
                          ) : (
                            <Star className="w-3 h-3" />
                          )}
                          {holiday.type === "RELIGIEUX" ? t("religious") : t("national")}
                        </span>
                      </td>

                      {/* Fixed / Variable */}
                      <td className="px-5 py-4 text-center hidden md:table-cell">
                        {holiday.recurrent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {t("fixed_short")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                            <AlertTriangle className="w-3 h-3" />
                            {t("variable_short")}
                          </span>
                        )}
                      </td>

                      {/* Paid */}
                      <td className="px-5 py-4 text-center">
                        {holiday.paye ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {t("paid")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            <XCircle className="w-3 h-3" />
                            {t("unpaid")}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(holiday)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title={t("edit")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(holiday.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title={t("delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {filteredHolidays.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filteredHolidays.length} {t("total_holidays").toLowerCase()}
              {filterType !== "all" && ` (${filterType === "NATIONAL" ? t("national") : t("religious")})`}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {nationalHolidays} {t("national").toLowerCase()}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {religiousHolidays} {t("religious").toLowerCase()}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" />
                {paidHolidays} {t("paid").toLowerCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal - Slide-over panel */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm() }} />
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md transform transition-transform duration-300 ease-in-out">
              <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-2xl">
                {/* Panel header with colored accent */}
                <div className={`relative px-6 py-5 ${
                  formData.type === "RELIGIEUX"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                    : "bg-gradient-to-r from-red-600 to-rose-600"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        {formData.type === "RELIGIEUX" ? (
                          <Moon className="w-6 h-6 text-white" />
                        ) : (
                          <Star className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {editingHoliday ? t("edit_holiday") : t("add_holiday")}
                        </h2>
                        <p className="text-sm text-white/70">
                          {selectedYear}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowModal(false); resetForm() }}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Panel body - scrollable */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">

                    {/* Type selector - horizontal cards */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        {t("type")}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: "NATIONAL" })}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                            formData.type === "NATIONAL"
                              ? "border-red-500 bg-red-50 dark:bg-red-950/40 shadow-lg shadow-red-500/10 scale-[1.02]"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className={`p-3 rounded-xl transition-colors ${
                            formData.type === "NATIONAL"
                              ? "bg-red-100 dark:bg-red-900/40"
                              : "bg-gray-100 dark:bg-gray-800"
                          }`}>
                            <Star className={`w-6 h-6 ${
                              formData.type === "NATIONAL"
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`} />
                          </div>
                          <span className={`text-sm font-semibold ${
                            formData.type === "NATIONAL"
                              ? "text-red-700 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>{t("national")}</span>
                          {formData.type === "NATIONAL" && (
                            <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 rounded-full">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: "RELIGIEUX" })}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                            formData.type === "RELIGIEUX"
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className={`p-3 rounded-xl transition-colors ${
                            formData.type === "RELIGIEUX"
                              ? "bg-emerald-100 dark:bg-emerald-900/40"
                              : "bg-gray-100 dark:bg-gray-800"
                          }`}>
                            <Moon className={`w-6 h-6 ${
                              formData.type === "RELIGIEUX"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`} />
                          </div>
                          <span className={`text-sm font-semibold ${
                            formData.type === "RELIGIEUX"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>{t("religious")}</span>
                          {formData.type === "RELIGIEUX" && (
                            <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-emerald-500 rounded-full">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Name + Date side by side on larger screens */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          {t("holiday_name")} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            placeholder={t("holiday_name_placeholder")}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          {t("date")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                          required
                        />
                      </div>
                    </div>

                    {/* Toggle cards */}
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("settings")}
                      </label>

                      {/* Fixed/Variable toggle card */}
                      <div
                        onClick={() => setFormData({ ...formData, recurrent: !formData.recurrent })}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                          formData.recurrent
                            ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              formData.recurrent
                                ? "bg-blue-100 dark:bg-blue-900/40"
                                : "bg-orange-100 dark:bg-orange-900/40"
                            }`}>
                              {formData.recurrent ? (
                                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {formData.recurrent ? t("fixed_date") : t("variable_date")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {formData.recurrent ? t("fixed_date_desc") : t("variable_date_desc")}
                              </p>
                            </div>
                          </div>
                          <div className={`relative w-11 h-6 rounded-full transition-colors ${
                            formData.recurrent ? "bg-blue-600" : "bg-orange-500"
                          }`}>
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              formData.recurrent ? "translate-x-5" : "translate-x-0.5"
                            }`} />
                          </div>
                        </div>
                      </div>

                      {/* Paid/Unpaid toggle card */}
                      <div
                        onClick={() => setFormData({ ...formData, paye: !formData.paye })}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                          formData.paye
                            ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                            : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              formData.paye
                                ? "bg-green-100 dark:bg-green-900/40"
                                : "bg-gray-100 dark:bg-gray-800"
                            }`}>
                              <DollarSign className={`w-5 h-5 ${
                                formData.paye
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-gray-400 dark:text-gray-500"
                              }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {t("paid_holiday")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {formData.paye ? t("paid_holiday_desc") : t("unpaid_holiday_desc")}
                              </p>
                            </div>
                          </div>
                          <div className={`relative w-11 h-6 rounded-full transition-colors ${
                            formData.paye ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
                          }`}>
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              formData.paye ? "translate-x-5" : "translate-x-0.5"
                            }`} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        {t("description")} <span className="text-gray-400 normal-case font-normal">({t("optional")})</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t("holiday_description_placeholder")}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                      />
                    </div>

                    {/* Warning for religious variable dates */}
                    {formData.type === "RELIGIEUX" && !formData.recurrent && (
                      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            {t("religious_holiday_warning_title")}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                            {t("religious_holiday_warning_desc")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel footer - sticky */}
                  <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowModal(false); resetForm() }}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm shadow-lg disabled:opacity-50 ${
                          formData.type === "RELIGIEUX"
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25"
                            : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-500/25"
                        }`}
                      >
                        {saving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {editingHoliday ? t("save") : t("add")}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-blue-600" />
                {t("duplicate_holidays")}
              </h2>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("duplicate_holidays_desc")}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t("from_year")}
                  </label>
                  <input
                    type="number"
                    value={duplicateData.fromYear}
                    onChange={(e) =>
                      setDuplicateData({ ...duplicateData, fromYear: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t("to_year")}
                  </label>
                  <input
                    type="number"
                    value={duplicateData.toYear}
                    onChange={(e) =>
                      setDuplicateData({ ...duplicateData, toYear: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("duplicate_warning")}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  {t("duplicate")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t("confirm_delete")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t("confirm_delete_holiday_desc")}
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
