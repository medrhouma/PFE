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
  createdAt: string
}

interface FormErrors {
  startDate?: string
  endDate?: string
  general?: string
}

export default function CongesPage() {
  const { showNotification } = useNotification()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  
  const [formData, setFormData] = useState({
    type: "PAID",
    startDate: "",
    endDate: "",
    reason: ""
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
    const endDate = new Date(formData.endDate)

    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
      errors.startDate = "Date de début invalide"
    } else if (startDate < today && !editingRequest) {
      errors.startDate = "La date de début ne peut pas être dans le passé"
    }

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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
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
        setFormData({ type: "PAID", startDate: "", endDate: "", reason: "" })
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
    setFormData({
      type: request.type,
      startDate: request.startDate.split('T')[0],
      endDate: request.endDate.split('T')[0],
      reason: request.reason
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
    setFormData({ type: "PAID", startDate: "", endDate: "", reason: "" })
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
                  <td className="px-6 py-4 text-sm">{request.duration} jour(s)</td>
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
