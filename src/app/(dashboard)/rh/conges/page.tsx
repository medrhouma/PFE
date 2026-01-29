"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useNotification } from "@/contexts/NotificationContext"
import { Button } from "@/components/ui/Button"
import { Calendar, Check, X, User, Clock, MessageSquare } from "lucide-react"

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
  const [initialLoading, setInitialLoading] = useState(true)
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
        showNotification({
          type: "error",
          title: "Erreur",
          message: "Impossible de charger les demandes de congé"
        })
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Erreur de connexion au serveur"
      })
    } finally {
      setInitialLoading(false)
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

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
              <p className="text-gray-500 dark:text-gray-400">Chargement des demandes...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Gestion des Congés
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Gérez les demandes de congé des employés
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={fetchRequests}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
              >
                <Clock className="w-5 h-5 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div 
            onClick={() => setFilter("all")}
            className="group cursor-pointer bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">Total</span>
              </div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{requests.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Demandes</p>
            </div>
          </div>

          <div 
            onClick={() => setFilter("pending")}
            className="group cursor-pointer bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                {pendingCount > 0 && (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full animate-pulse">Action requise</span>
                )}
              </div>
              <p className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-1">{pendingCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
            </div>
          </div>

          <div 
            onClick={() => setFilter("approved")}
            className="group cursor-pointer bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Traité</span>
              </div>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{approvedCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approuvés</p>
            </div>
          </div>

          <div 
            onClick={() => setFilter("rejected")}
            className="group cursor-pointer bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
                  <X className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-full">Traité</span>
              </div>
              <p className="text-4xl font-bold text-rose-600 dark:text-rose-400 mb-1">{rejectedCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Refusés</p>
            </div>
          </div>
        </div>

        {/* Modern Filter Tabs */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Filtrer par statut</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sélectionnez un statut pour filtrer</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                filter === "all"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 scale-105"
                  : "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Toutes ({requests.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                filter === "pending"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105"
                  : "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              En attente ({pendingCount})
              {pendingCount > 0 && filter !== "pending" && (
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setFilter("approved")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                filter === "approved"
                  ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                  : "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Approuvés ({approvedCount})
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                filter === "rejected"
                  ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30 scale-105"
                  : "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Refusés ({rejectedCount})
            </button>
          </div>
        </div>

        {/* Professional Requests Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-gray-300 text-sm">Liste des demandes de congé</p>
                </div>
              </div>
              {pendingCount > 0 && (
                <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-full text-sm font-medium animate-pulse">
                  {pendingCount} en attente
                </span>
              )}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucune demande</p>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                {filter !== "all" ? `Aucune demande ${filter === "pending" ? "en attente" : filter === "approved" ? "approuvée" : "refusée"}` : "Aucune demande de congé pour le moment"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Employé</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Période</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Durée</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Motif</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Demandé le</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/30">
                            {request.userName?.charAt(0) || request.userEmail?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {request.userName || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">{request.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold ${getTypeColor(request.type)}`}>
                          {getTypeLabel(request.type)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(request.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="w-3 h-px bg-gray-400" /> au <span className="w-3 h-px bg-gray-400" />
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(request.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{request.duration}</span>
                          <span className="text-xs text-gray-500">jour{request.duration > 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={request.reason}>
                          {request.reason || <span className="text-gray-400 italic">Aucun motif</span>}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          request.status === "VALIDE" 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : request.status === "REFUSE"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {request.status === "VALIDE" && <Check className="w-3 h-3" />}
                          {request.status === "REFUSE" && <X className="w-3 h-3" />}
                          {request.status === "EN_ATTENTE" && <Clock className="w-3 h-3" />}
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
                        {new Date(request.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-5">
                        {request.status === "EN_ATTENTE" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(request, "APPROVED")}
                              className="group/btn inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-200"
                              title="Approuver"
                            >
                              <Check className="w-4 h-4" />
                              <span className="hidden lg:inline">Approuver</span>
                            </button>
                            <button
                              onClick={() => openModal(request, "REJECTED")}
                              className="group/btn inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:scale-105 transition-all duration-200"
                              title="Refuser"
                            >
                              <X className="w-4 h-4" />
                              <span className="hidden lg:inline">Refuser</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm italic">Traité</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modern Modal */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
              {/* Modal Header */}
              <div className={`p-6 ${
                actionType === "APPROVED" 
                  ? "bg-gradient-to-r from-emerald-500 to-green-600" 
                  : "bg-gradient-to-r from-rose-500 to-red-600"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    {actionType === "APPROVED" ? <Check className="w-6 h-6 text-white" /> : <X className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {actionType === "APPROVED" ? "Approuver" : "Refuser"} la demande
                    </h3>
                    <p className="text-white/80 text-sm">Confirmer l'action</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Request Info Card */}
                <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/30">
                      {selectedRequest.userName?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedRequest.userName}</p>
                      <p className="text-xs text-gray-500">{selectedRequest.userEmail}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{getTypeLabel(selectedRequest.type)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest.duration} jour{selectedRequest.duration > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(selectedRequest.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} → {new Date(selectedRequest.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Comment Input */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Commentaire {actionType === "REJECTED" && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700/50 transition-all resize-none"
                    rows={3}
                    placeholder={actionType === "APPROVED" ? "Message optionnel pour l'employé..." : "Raison du refus (obligatoire)..."}
                    required={actionType === "REJECTED"}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAction}
                    disabled={loading || (actionType === "REJECTED" && !comments.trim())}
                    className={`flex-1 py-3 font-semibold shadow-lg transition-all hover:scale-[1.02] ${
                      actionType === "APPROVED"
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-emerald-500/40"
                        : "bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-rose-500/40"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Traitement...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {actionType === "APPROVED" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {actionType === "APPROVED" ? "Approuver" : "Refuser"}
                      </span>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedRequest(null)
                      setComments("")
                    }}
                    disabled={loading}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold transition-all"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
