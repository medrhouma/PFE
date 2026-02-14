"use client"

import { useState, useEffect } from "react"
import { useNotification } from "@/contexts/NotificationContext"
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
      errors.startDate = "Date de début invalide"
    } else if (startDate < today && !editingRequest) {
      errors.startDate = "La date de début ne peut pas être dans le passé"
    }

    if (leaveMode === "half") {
      // Half-day: endDate = startDate
    } else if (leaveMode === "split") {
      // Split: endDate = startDate + 1 day (auto-set)
    } else {
      // Full day mode
      const endDate = new Date(formData.endDate)
      if (isNaN(endDate.getTime())) {
        errors.endDate = "Date de fin invalide"
      } else if (endDate < startDate) {
        errors.endDate = "La date de fin doit être après la date de début"
      }

      // Check duration
      if (!errors.startDate && !errors.endDate) {
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        if (duration > 365) {
          errors.general = "La durée du congé ne peut pas dépasser 365 jours"
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
        title: "Erreur",
        message: "Impossible de charger les demandes de congé"
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
        title: "Formulaire invalide",
        message: "Veuillez corriger les erreurs dans le formulaire"
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
          title: "Succès",
          message: editingRequest ? "Demande modifiée avec succès" : "Demande de congé soumise avec succès"
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
          title: "Erreur",
          message: data.error || "Erreur lors de la soumission"
        })
      }
    } catch (error) {
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de soumettre la demande"
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) {
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
          title: "Succès",
          message: "Demande supprimée avec succès"
        })
        fetchRequests()
      } else {
        showNotification({
          type: "error",
          title: "Erreur",
          message: data.error || "Erreur lors de la suppression"
        })
      }
    } catch (error) {
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de supprimer la demande"
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
      case "VALIDE": return "Approuvé"
      case "REFUSE": return "Refusé"
      case "EN_ATTENTE": return "En attente"
      default: return status
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PAID": return "Congé payé"
      case "UNPAID": return "Congé sans solde"
      case "MATERNITE": return "Congé maternité"
      case "MALADIE": return "Congé maladie"
      case "PREAVIS": return "Préavis"
      default: return type
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Demandes de congé
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gérez vos demandes de congé et absences
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {showForm ? "Annuler" : "Nouvelle demande"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingRequest ? "Modifier la demande de congé" : "Nouvelle demande de congé"}
          </h2>
          
          {formErrors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{formErrors.general}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de congé
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700"
                required
              >
                <option value="PAID">Congé payé</option>
                <option value="MALADIE">Congé maladie</option>
                <option value="UNPAID">Congé sans solde</option>
                <option value="MATERNITE">Congé maternité</option>
                <option value="PREAVIS">Préavis</option>
              </select>
            </div>

            {/* Mode selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mode de congé
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
                  Journée complète
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
                  Demi-journée
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
                  Jour séparé
                </button>
              </div>
              {leaveMode === "split" && (
                <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                  Après-midi du jour sélectionné + Matin du jour suivant = 1 jour de congé
                </p>
              )}
              {leaveMode === "half" && (
                <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                  Choisissez matin ou après-midi = 0.5 jour de congé
                </p>
              )}
            </div>

            {/* Date fields - conditional on mode */}
            {leaveMode === "full" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de début
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
                    Date de fin
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
                    Date
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
                    Session
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
                      ☀️ Matin
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
                      🌙 Après-midi
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Split mode */
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Premier jour (après-midi)
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
                      <span className="font-medium">Après-midi</span> du {new Date(formData.startDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      {" + "}
                      <span className="font-medium">Matin</span> du {(() => { const d = new Date(formData.startDate); d.setDate(d.getDate() + 1); return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); })()}
                    </p>
                    <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">= 1 jour de congé</p>
                  </div>
                )}
              </div>
            )}

            {/* Duration preview */}
            {formData.startDate && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Durée :</strong>{" "}
                  {leaveMode === "half"
                    ? "0.5 jour"
                    : leaveMode === "split"
                    ? "1 jour (séparé)"
                    : formData.endDate
                    ? `${Math.max(1, Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} jour(s)`
                    : "—"}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Raison / Motif
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
                {loading ? (editingRequest ? "Modification..." : "Envoi...") : (editingRequest ? "Modifier" : "Soumettre la demande")}
              </Button>
              <Button type="button" onClick={handleCancelEdit} className="bg-gray-300 hover:bg-gray-400 text-gray-700">
                Annuler
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
              Aucune demande de congé pour le moment
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Période</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Durée</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Demandé le</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm">{getTypeLabel(request.type)}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(request.startDate).toLocaleDateString('fr-FR')} - {new Date(request.endDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {request.isHalfDay ? (
                      request.duration === 1 ? (
                        <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                          <Calendar className="w-3.5 h-3.5" />
                          1 jour (séparé)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          ½ jour ({request.halfDaySession === "MORNING" ? "Matin" : "Après-midi"})
                        </span>
                      )
                    ) : (
                      <>{request.duration} jour(s)</>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{new Date(request.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-sm">
                    {request.status === "EN_ATTENTE" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(request)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer"
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
