"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useNotification } from "@/contexts/NotificationContext"
import { Button } from "@/components/ui/Button"
import { FiCalendar, FiCheck, FiX, FiUser, FiClock, FiMessageSquare } from "react-icons/fi"

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

export default function RHCongesPage() {
  const { data: session } = useSession()
  const { showNotification } = useNotification()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED">("APPROVED")
  const [comments, setComments] = useState("")
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      console.log("📋 Fetching all leave requests for RH...")
      const response = await fetch("/api/conges/all")
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Received leave requests:", data)
        setRequests(Array.isArray(data) ? data : [])
      } else {
        console.error("❌ Failed to fetch requests:", response.status)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    }
  }

  const handleAction = async () => {
    if (!selectedRequest) return
    setLoading(true)

    try {
      const response = await fetch(`/api/conges/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionType, comments })
      })

      const data = await response.json()

      if (response.ok) {
        showNotification({
          type: "success",
          title: "Succès",
          message: data.message || "Demande traitée avec succès"
        })
        setShowModal(false)
        setSelectedRequest(null)
        setComments("")
        fetchRequests()
      } else {
        showNotification({
          type: "error",
          title: "Erreur",
          message: data.error || "Erreur lors du traitement"
        })
      }
    } catch (error) {
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de traiter la demande"
      })
    } finally {
      setLoading(false)
    }
  }

  const openModal = (request: LeaveRequest, action: "APPROVED" | "REJECTED") => {
    setSelectedRequest(request)
    setActionType(action)
    setShowModal(true)
    setComments("")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALIDE": return "text-green-600 bg-green-100"
      case "REFUSE": return "text-red-600 bg-red-100"
      case "EN_ATTENTE": return "text-amber-600 bg-amber-100"
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PAID": return "bg-blue-100 text-blue-700"
      case "MALADIE": return "bg-red-100 text-red-700"
      case "MATERNITE": return "bg-pink-100 text-pink-700"
      case "UNPAID": return "bg-gray-100 text-gray-700"
      case "PREAVIS": return "bg-purple-100 text-purple-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const filteredRequests = requests.filter(req => {
    if (filter === "all") return true
    if (filter === "pending") return req.status === "EN_ATTENTE"
    if (filter === "approved") return req.status === "VALIDE"
    if (filter === "rejected") return req.status === "REFUSE"
    return true
  })

  const pendingCount = requests.filter(r => r.status === "EN_ATTENTE").length
  const approvedCount = requests.filter(r => r.status === "VALIDE").length
  const rejectedCount = requests.filter(r => r.status === "REFUSE").length

  // Check if user is RH or SUPER_ADMIN
  if (session?.user?.role !== "RH" && session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400">
            Accès refusé - Cette page est réservée au personnel RH
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Gestion des congés
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Approuvez ou rejetez les demandes de congé des employés
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{requests.length}</p>
            </div>
            <FiCalendar className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-amber-500 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setFilter("pending")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
            <FiClock className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-500 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setFilter("approved")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approuvés</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <FiCheck className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-red-500 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setFilter("rejected")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Refusés</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <FiX className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-violet-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Toutes ({requests.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "pending"
                ? "bg-amber-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            En attente ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "approved"
                ? "bg-green-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Approuvés ({approvedCount})
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "rejected"
                ? "bg-red-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Refusés ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucune demande {filter !== "all" && `${filter === "pending" ? "en attente" : filter === "approved" ? "approuvée" : "refusée"}`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Employé</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Période</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Durée</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Motif</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Demandé le</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {request.userName?.charAt(0) || request.userEmail?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {request.userName || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">{request.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
                        {getTypeLabel(request.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{new Date(request.startDate).toLocaleDateString('fr-FR')}</span>
                        <span className="text-xs text-gray-500">au</span>
                        <span>{new Date(request.endDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {request.duration} jour{request.duration > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={request.reason}>
                        {request.reason || "Aucun motif"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      {request.status === "EN_ATTENTE" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(request, "APPROVED")}
                            className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                            title="Approuver"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal(request, "REJECTED")}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            title="Refuser"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {actionType === "APPROVED" ? "Approuver" : "Refuser"} la demande
            </h3>
            
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiUser className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{selectedRequest.userName}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <FiCalendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{getTypeLabel(selectedRequest.type)}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(selectedRequest.startDate).toLocaleDateString('fr-FR')} - {new Date(selectedRequest.endDate).toLocaleDateString('fr-FR')}
                <span className="ml-2">({selectedRequest.duration} jour{selectedRequest.duration > 1 ? 's' : ''})</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiMessageSquare className="w-4 h-4 inline mr-1" />
                Commentaire {actionType === "REJECTED" && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700"
                rows={3}
                placeholder={actionType === "APPROVED" ? "Message optionnel pour l'employé" : "Raison du refus (obligatoire)"}
                required={actionType === "REJECTED"}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAction}
                disabled={loading || (actionType === "REJECTED" && !comments.trim())}
                className={`flex-1 ${
                  actionType === "APPROVED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Traitement..." : actionType === "APPROVED" ? "Approuver" : "Refuser"}
              </Button>
              <Button
                onClick={() => {
                  setShowModal(false)
                  setSelectedRequest(null)
                  setComments("")
                }}
                disabled={loading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
