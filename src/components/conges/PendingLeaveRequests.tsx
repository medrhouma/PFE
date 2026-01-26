"use client"

import { useState, useEffect } from "react"
import { FiCalendar, FiClock, FiCheck, FiX, FiUser } from "react-icons/fi"

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

export default function PendingLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

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
        alert(status === "APPROVED" ? "Demande approuvée" : "Demande rejetée")
      } else {
        alert("Erreur lors du traitement de la demande")
      }
    } catch (error) {
      console.error("Error processing request:", error)
      alert("Erreur lors du traitement de la demande")
    } finally {
      setProcessing(null)
    }
  }

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      VACATION: "Congé payé",
      SICK: "Congé maladie",
      PERSONAL: "Congé personnel",
      UNPAID: "Congé sans solde",
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Aucune demande en attente</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FiUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {request.user?.name || request.user?.email || "Employé"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getLeaveTypeLabel(request.type)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Du:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(request.startDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Au:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(request.endDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FiClock className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {request.duration} jour(s)
                  </span>
                </div>
              </div>

              {request.reason && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Motif:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    {request.reason}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={() => handleDecision(request.id, "APPROVED")}
                disabled={processing === request.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiCheck className="w-4 h-4" />
                Approuver
              </button>
              <button
                onClick={() => {
                  const comments = prompt("Raison du rejet (optionnel):")
                  if (comments !== null) {
                    handleDecision(request.id, "REJECTED", comments)
                  }
                }}
                disabled={processing === request.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiX className="w-4 h-4" />
                Rejeter
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Demandé le {new Date(request.createdAt).toLocaleDateString("fr-FR")} à{" "}
              {new Date(request.createdAt).toLocaleTimeString("fr-FR")}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
