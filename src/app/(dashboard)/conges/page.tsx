"use client"

import { useState, useEffect } from "react"
import { useNotification } from "@/contexts/NotificationContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/Button"
import { Calendar, Clock, Check, X, AlertCircle, Edit, Trash2 } from "lucide-react"
import { LoadingSpinner, EmptyState } from "@/components/ui"

interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  duration: number
  reason: string
  status: string
  isHalfDay: boolean
  halfDaySession: string | null
  createdAt: string
}

interface FormErrors {
  startDate?: string
  endDate?: string
  general?: string
}

type LeaveMode = "full" | "half" | "split";

export default function CongesPage() {
  const { showNotification } = useNotification()
  const { t, language } = useLanguage()
  const locale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR'
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [leaveMode, setLeaveMode] = useState<LeaveMode>("full")
  
  const [formData, setFormData] = useState({
    type: "PAID",
    startDate: "",
    endDate: "",
    reason: "",
    halfDaySession: "MORNING" as "MORNING" | "AFTERNOON",
  })

  useEffect(() => {
    fetchRequests()
  }, [])

  // Form validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startDate = new Date(formData.startDate)

    // Check if start date is valid
    if (isNaN(startDate.getTime())) {
      errors.startDate = t('invalid_start_date')
    } else if (startDate < today && !editingRequest) {
      errors.startDate = t('start_date_past')
    }

    if (leaveMode === "half") {
      // Half-day: endDate = startDate
    } else if (leaveMode === "split") {
      // Split: endDate = startDate + 1 day (auto-set)
    } else {
      // Full day mode
      const endDate = new Date(formData.endDate)
      if (isNaN(endDate.getTime())) {
        errors.endDate = t('invalid_end_date')
      } else if (endDate < startDate) {
        errors.endDate = t('end_before_start')
      }

      // Check duration
      if (!errors.startDate && !errors.endDate) {
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        if (duration > 365) {
          errors.general = t('max_duration')
        }
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/conges")
      if (response.ok) {
        const data = await response.json()
        setRequests(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      showNotification({
        type: "error",
        title: t('error'),
        message: t('cannot_load_requests')
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      showNotification({
        type: "error",
        title: t('invalid_form'),
        message: t('fix_form_errors')
      })
      return
    }
    
    setLoading(true)

    try {
      const url = editingRequest ? `/api/conges/${editingRequest.id}` : "/api/conges"
      const method = editingRequest ? "PUT" : "POST"

      // Build payload with half-day info
      const payload: Record<string, unknown> = { ...formData }
      if (leaveMode === "half") {
        payload.endDate = formData.startDate
        payload.isHalfDay = true
        payload.halfDaySession = formData.halfDaySession
      } else if (leaveMode === "split") {
        const nextDay = new Date(formData.startDate)
        nextDay.setDate(nextDay.getDate() + 1)
        payload.endDate = nextDay.toISOString().split("T")[0]
        payload.isHalfDay = true
        payload.halfDaySession = "AFTERNOON" // PM today + AM tomorrow
      } else {
        payload.isHalfDay = false
        payload.halfDaySession = null
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        showNotification({
          type: "success",
          title: t('success'),
          message: editingRequest ? t('request_modified') : t('request_submitted')
        })
        setShowForm(false)
        setEditingRequest(null)
        setFormData({ type: "PAID", startDate: "", endDate: "", reason: "", halfDaySession: "MORNING" })
        setLeaveMode("full")
        setFormErrors({})
        fetchRequests()
      } else {
        showNotification({
          type: "error",
          title: t('error'),
          message: data.error || t('submission_error')
        })
      }
    } catch (error) {
      showNotification({
        type: "error",
        title: t('error'),
        message: t('cannot_submit')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (request: LeaveRequest) => {
    setEditingRequest(request)
    // Determine leave mode from existing request
    if (request.isHalfDay && request.halfDaySession === "AFTERNOON" && request.duration === 1) {
      setLeaveMode("split")
    } else if (request.isHalfDay) {
      setLeaveMode("half")
    } else {
      setLeaveMode("full")
    }
    setFormData({
      type: request.type,
      startDate: request.startDate.split('T')[0],
      endDate: request.endDate.split('T')[0],
      reason: request.reason,
      halfDaySession: (request.halfDaySession as "MORNING" | "AFTERNOON") || "MORNING",
    })
    setShowForm(true)
  }

  const handleDelete = async (requestId: string) => {
    if (!confirm(t('confirm_delete_request'))) {
      return
    }

    try {
      const response = await fetch(`/api/conges/${requestId}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (response.ok) {
        showNotification({
          type: "success",
          title: t('success'),
          message: t('request_deleted')
        })
        fetchRequests()
      } else {
        showNotification({
          type: "error",
          title: t('error'),
          message: data.error || t('delete_error')
        })
      }
    } catch (error) {
      showNotification({
        type: "error",
        title: t('error'),
        message: t('cannot_delete')
      })
    }
  }

  const handleCancelEdit = () => {
    setShowForm(false)
    setEditingRequest(null)
    setFormData({ type: "PAID", startDate: "", endDate: "", reason: "", halfDaySession: "MORNING" })
    setLeaveMode("full")
    setFormErrors({})
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALIDE": return "text-green-600 bg-green-100"
      case "REFUSE": return "text-red-600 bg-red-100"
      case "EN_ATTENTE": return "text-yellow-600 bg-yellow-100"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "VALIDE": return t('approved')
      case "REFUSE": return t('rejected')
      case "EN_ATTENTE": return t('en_attente')
      default: return status
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PAID": return t('paid_leave')
      case "UNPAID": return t('unpaid_leave')
      case "MATERNITE": return t('maternity_leave')
      case "MALADIE": return t('sick_leave')
      case "PREAVIS": return t('notice_period')
      default: return type
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('leave_requests')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('manage_leave_desc')}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {showForm ? t('cancel') : t('new_request')}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingRequest ? t('edit_request') : t('new_leave_request')}
          </h2>
          
          {formErrors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{formErrors.general}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('leave_type')}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700"
                required
              >
                <option value="PAID">{t('paid_leave')}</option>
                <option value="MALADIE">{t('sick_leave')}</option>
                <option value="UNPAID">{t('unpaid_leave')}</option>
                <option value="MATERNITE">{t('maternity_leave')}</option>
                <option value="PREAVIS">{t('notice_period')}</option>
              </select>
            </div>

            {/* Mode selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('leave_mode')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveMode("full")}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    leaveMode === "full"
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-1.5" />
                  {t('full_day')}
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveMode("half")}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    leaveMode === "half"
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-1.5" />
                  {t('half_day')}
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveMode("split")}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    leaveMode === "split"
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-1.5" />
                  {t('split_day')}
                </button>
              </div>
              {leaveMode === "split" && (
                <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                  {t('split_desc')}
                </p>
              )}
              {leaveMode === "half" && (
                <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                  {t('half_desc')}
                </p>
              )}
            </div>

            {/* Date fields - conditional on mode */}
            {leaveMode === "full" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('start_date')}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value })
                      if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: undefined })
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 ${
                      formErrors.startDate 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                  />
                  {formErrors.startDate && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('end_date')}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => {
                      setFormData({ ...formData, endDate: e.target.value })
                      if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: undefined })
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 ${
                      formErrors.endDate 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                  />
                  {formErrors.endDate && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.endDate}</p>
                  )}
                </div>
              </div>
            ) : leaveMode === "half" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('date')}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })
                      if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: undefined })
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 ${
                      formErrors.startDate 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                  />
                  {formErrors.startDate && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('session_label')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, halfDaySession: "MORNING" })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.halfDaySession === "MORNING"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      ☀️ {t('morning')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, halfDaySession: "AFTERNOON" })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.halfDaySession === "AFTERNOON"
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      🌙 {t('afternoon')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Split mode */
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('first_day_afternoon')}
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    const nextDay = new Date(e.target.value)
                    nextDay.setDate(nextDay.getDate() + 1)
                    setFormData({
                      ...formData,
                      startDate: e.target.value,
                      endDate: nextDay.toISOString().split("T")[0],
                    })
                    if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: undefined })
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 ${
                    formErrors.startDate 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {formErrors.startDate && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.startDate}</p>
                )}
                {formData.startDate && (
                  <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                    <p className="text-sm text-violet-700 dark:text-violet-300">
                      <span className="font-medium">{t('afternoon_of')}</span> {new Date(formData.startDate).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                      {" + "}
                      <span className="font-medium">{t('morning_of')}</span> {(() => { const d = new Date(formData.startDate); d.setDate(d.getDate() + 1); return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }); })()}
                    </p>
                    <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">{t('one_leave_day')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Duration preview */}
            {formData.startDate && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>{t('duration_preview')} :</strong>{" "}
                  {leaveMode === "half"
                    ? t('half_day_duration')
                    : leaveMode === "split"
                    ? t('split_day_duration')
                    : formData.endDate
                    ? `${Math.max(1, Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} ${t('day_s')}`
                    : "—"}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reason_label')}
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
                {loading ? (editingRequest ? t('modifying') : t('sending')) : (editingRequest ? t('modify') : t('submit_request'))}
              </Button>
              <Button type="button" onClick={handleCancelEdit} className="bg-gray-300 hover:bg-gray-400 text-gray-700">
                {t('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des demandes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {t('no_leave_requests')}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('period')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('duration')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('requested_on')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm">{getTypeLabel(request.type)}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(request.startDate).toLocaleDateString(locale)} - {new Date(request.endDate).toLocaleDateString(locale)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {request.isHalfDay ? (
                      request.duration === 1 ? (
                        <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {t('split_one_day')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          {t('half_day_label')} ({request.halfDaySession === "MORNING" ? t('morning') : t('afternoon')})
                        </span>
                      )
                    ) : (
                      <>{request.duration} {t('day_s')}</>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{new Date(request.createdAt).toLocaleDateString(locale)}</td>
                  <td className="px-6 py-4 text-sm">
                    {request.status === "EN_ATTENTE" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(request)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('modify')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
