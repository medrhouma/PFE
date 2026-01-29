"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, Check, X, User, Eye, MessageSquare, FileText } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  duration: number
  reason: string
  status: string
  createdAt: string
  user?: {
    name: string
    email: string
  }
}

// Leave Details Modal Component
function LeaveDetailsModal({ request, onClose, onApprove, onReject, processing, language }: {
  request: LeaveRequest
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  processing: boolean
  language: string
}) {
  const isRTL = language === 'ar'
  
  const t = {
    title: { fr: 'Détails de la demande', en: 'Request Details', ar: 'تفاصيل الطلب' },
    employee: { fr: 'Employé', en: 'Employee', ar: 'الموظف' },
    type: { fr: 'Type de congé', en: 'Leave Type', ar: 'نوع الإجازة' },
    period: { fr: 'Période', en: 'Period', ar: 'الفترة' },
    duration: { fr: 'Durée', en: 'Duration', ar: 'المدة' },
    days: { fr: 'jour(s)', en: 'day(s)', ar: 'يوم/أيام' },
    reason: { fr: 'Motif', en: 'Reason', ar: 'السبب' },
    noReason: { fr: 'Aucun motif fourni', en: 'No reason provided', ar: 'لم يتم تقديم سبب' },
    requestedOn: { fr: 'Demandé le', en: 'Requested on', ar: 'تم الطلب في' },
    approve: { fr: 'Approuver', en: 'Approve', ar: 'موافقة' },
    reject: { fr: 'Rejeter', en: 'Reject', ar: 'رفض' },
    close: { fr: 'Fermer', en: 'Close', ar: 'إغلاق' },
  }
  const getText = (key: keyof typeof t) => t[key][language as keyof typeof t.title] || t[key].fr

  const leaveTypes: Record<string, Record<string, string>> = {
    VACATION: { fr: 'Congé payé', en: 'Paid Leave', ar: 'إجازة مدفوعة' },
    SICK: { fr: 'Congé maladie', en: 'Sick Leave', ar: 'إجازة مرضية' },
    PERSONAL: { fr: 'Congé personnel', en: 'Personal Leave', ar: 'إجازة شخصية' },
    UNPAID: { fr: 'Congé sans solde', en: 'Unpaid Leave', ar: 'إجازة بدون راتب' },
  }

  const getLeaveType = (type: string) => leaveTypes[type]?.[language] || leaveTypes[type]?.fr || type

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{getText('title')}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  #{request.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Employee Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getText('employee')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {request.user?.name || request.user?.email || 'Employé'}
              </p>
              {request.user?.email && request.user?.name && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{request.user.email}</p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leave Type */}
            <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl">
              <p className="text-sm text-violet-600 dark:text-violet-400 font-medium mb-1">{getText('type')}</p>
              <p className="text-lg font-bold text-violet-900 dark:text-violet-200">{getLeaveType(request.type)}</p>
            </div>

            {/* Duration */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">{getText('duration')}</p>
              <p className="text-lg font-bold text-green-900 dark:text-green-200">
                {request.duration} {getText('days')}
              </p>
            </div>
          </div>

          {/* Period */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">{getText('period')}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(request.startDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR')}
                </span>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(request.endDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR')}
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{getText('reason')}</p>
            </div>
            <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
              {request.reason || <span className="text-gray-400 italic">{getText('noReason')}</span>}
            </p>
          </div>

          {/* Request Date */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{getText('requestedOn')}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {new Date(request.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR')}{' '}
              {new Date(request.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onApprove}
            disabled={processing}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/25"
          >
            <Check className="w-5 h-5" />
            {getText('approve')}
          </button>
          <button
            onClick={onReject}
            disabled={processing}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/25"
          >
            <X className="w-5 h-5" />
            {getText('reject')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            {getText('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PendingLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const { language } = useLanguage()

  const t = {
    pending: { fr: 'Demandes en attente', en: 'Pending Requests', ar: 'الطلبات المعلقة' },
    noRequests: { fr: 'Aucune demande en attente', en: 'No pending requests', ar: 'لا توجد طلبات معلقة' },
    approved: { fr: 'Demande approuvée', en: 'Request approved', ar: 'تمت الموافقة على الطلب' },
    rejected: { fr: 'Demande rejetée', en: 'Request rejected', ar: 'تم رفض الطلب' },
    error: { fr: 'Erreur lors du traitement', en: 'Processing error', ar: 'خطأ في المعالجة' },
    viewDetails: { fr: 'Voir détails', en: 'View details', ar: 'عرض التفاصيل' },
    approve: { fr: 'Approuver', en: 'Approve', ar: 'موافقة' },
    reject: { fr: 'Rejeter', en: 'Reject', ar: 'رفض' },
    enterReason: { fr: 'Raison du rejet (optionnel):', en: 'Rejection reason (optional):', ar: 'سبب الرفض (اختياري):' }
  }
  const getText = (key: keyof typeof t) => t[key][language as keyof typeof t.pending] || t[key].fr

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/conges/pending")
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (requestId: string, status: "APPROVED" | "REJECTED", comments?: string) => {
    setProcessing(requestId)
    try {
      const response = await fetch(`/api/conges/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comments }),
      })

      if (response.ok) {
        await fetchRequests()
        setSelectedRequest(null)
        alert(status === "APPROVED" ? getText('approved') : getText('rejected'))
      } else {
        alert(getText('error'))
      }
    } catch (error) {
      console.error("Error processing request:", error)
      alert(getText('error'))
    } finally {
      setProcessing(null)
    }
  }

  const leaveTypes: Record<string, Record<string, string>> = {
    VACATION: { fr: 'Congé payé', en: 'Paid Leave', ar: 'إجازة مدفوعة' },
    SICK: { fr: 'Congé maladie', en: 'Sick Leave', ar: 'إجازة مرضية' },
    PERSONAL: { fr: 'Congé personnel', en: 'Personal Leave', ar: 'إجازة شخصية' },
    UNPAID: { fr: 'Congé sans solde', en: 'Unpaid Leave', ar: 'إجازة بدون راتب' },
  }

  const getLeaveTypeLabel = (type: string) => leaveTypes[type]?.[language] || leaveTypes[type]?.fr || type

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{getText('noRequests')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {request.user?.name || request.user?.email || "Employé"}
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 mt-1">
                      {getLeaveTypeLabel(request.type)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Du</span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {new Date(request.startDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Au</span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {new Date(request.endDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <Clock className="w-5 h-5 text-green-500" />
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Durée</span>
                      <span className="font-bold text-green-700 dark:text-green-300 text-sm">
                        {request.duration} jour(s)
                      </span>
                    </div>
                  </div>
                </div>

                {request.reason && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Motif:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {request.reason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                {/* View Details Button */}
                <button
                  onClick={() => setSelectedRequest(request)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors font-medium"
                >
                  <Eye className="w-4 h-4" />
                  {getText('viewDetails')}
                </button>
                <button
                  onClick={() => handleDecision(request.id, "APPROVED")}
                  disabled={processing === request.id}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md"
                >
                  <Check className="w-4 h-4" />
                  {getText('approve')}
                </button>
                <button
                  onClick={() => {
                    const comments = prompt(getText('enterReason'))
                    if (comments !== null) {
                      handleDecision(request.id, "REJECTED", comments)
                    }
                  }}
                  disabled={processing === request.id}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md"
                >
                  <X className="w-4 h-4" />
                  {getText('reject')}
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Demandé le {new Date(request.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR')} à{" "}
                {new Date(request.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <LeaveDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => handleDecision(selectedRequest.id, "APPROVED")}
          onReject={() => {
            const comments = prompt(getText('enterReason'))
            if (comments !== null) {
              handleDecision(selectedRequest.id, "REJECTED", comments)
            }
          }}
          processing={processing === selectedRequest.id}
          language={language}
        />
      )}
    </>
  )
}
