"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, Download, CheckCircle, Clock, Eye, PenTool, AlertCircle, ArrowLeft, Calendar, User, X, Printer, Filter } from "lucide-react"
import Link from "next/link"
import { useNotification } from "@/contexts/NotificationContext"

interface Contract {
  id: string
  title: string
  type: string
  description?: string
  status: "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "ARCHIVED" | "CANCELLED"
  original_pdf_path: string
  signed_pdf_path?: string
  sent_at?: string
  viewed_at?: string
  signed_at?: string
  valid_until?: string
  created_at: string
  signature_data?: string
}

type TabFilter = "ALL" | "PENDING" | "SIGNED" | "DRAFT"

const statusConfig = {
  DRAFT: { label: "Brouillon", color: "gray", icon: FileText },
  SENT: { label: "En attente de signature", color: "yellow", icon: Clock },
  VIEWED: { label: "Lu", color: "blue", icon: Eye },
  SIGNED: { label: "Signé", color: "green", icon: CheckCircle },
  ARCHIVED: { label: "Archivé", color: "gray", icon: FileText },
  CANCELLED: { label: "Annulé", color: "red", icon: AlertCircle }
}

export default function MyContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signing, setSigning] = useState(false)
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const { showNotification } = useNotification()

  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      const response = await fetch("/api/contracts")
      if (response.ok) {
        const data = await response.json()
        setContracts(data.data || [])
      }
    } catch (error) {
      console.error("Error loading contracts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewContract = async (contract: Contract) => {
    setSelectedContract(contract)
    
    // Mark as viewed if SENT
    if (contract.status === "SENT") {
      try {
        await fetch(`/api/contracts/${contract.id}`)
        // Reload to get updated status
        loadContracts()
      } catch (error) {
        console.error("Error marking contract as viewed:", error)
      }
    }
  }

  const handlePrintContract = (contract: Contract) => {
    const pdfPath = contract.signed_pdf_path || contract.original_pdf_path
    const printWindow = window.open(pdfPath, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  const handleDownloadContract = (contract: Contract) => {
    const pdfPath = contract.signed_pdf_path || contract.original_pdf_path
    const link = document.createElement('a')
    link.href = pdfPath
    link.download = `${contract.title}.pdf`
    link.click()
  }

  const handleStartSignature = () => {
    setShowSignatureModal(true)
    // Clear canvas after modal opens
    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          // White background
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          
          // Draw signature line
          ctx.strokeStyle = "#CBD5E1" // gray-300
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.moveTo(40, 120)
          ctx.lineTo(360, 120)
          ctx.stroke()
          ctx.setLineDash([])
          
          // Draw "X" marker at the start
          ctx.fillStyle = "#94A3B8" // gray-400
          ctx.font = "bold 20px Arial"
          ctx.fillText("X", 15, 125)
          
          // Draw placeholder text
          ctx.fillStyle = "#94A3B8"
          ctx.font = "14px Arial"
          ctx.fillText("Signez sur la ligne", 150, 90)
        }
      }
    }, 100)
  }

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }

  const startDrawing = (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (pos: { x: number; y: number }) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.strokeStyle = "#000"
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // White background
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Redraw signature line
    ctx.strokeStyle = "#CBD5E1"
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(40, 120)
    ctx.lineTo(360, 120)
    ctx.stroke()
    ctx.setLineDash([])
    
    // Redraw "X" marker
    ctx.fillStyle = "#94A3B8"
    ctx.font = "bold 20px Arial"
    ctx.fillText("X", 15, 125)
    
    // Redraw placeholder text
    ctx.fillStyle = "#94A3B8"
    ctx.font = "14px Arial"
    ctx.fillText("Signez sur la ligne", 150, 90)
  }

  const handleSign = async () => {
    if (!selectedContract || !canvasRef.current) return
    
    // Check if signature is empty
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let hasSignature = false
    
    for (let i = 0; i < pixels.length; i += 4) {
      // Check if pixel is not white
      if (pixels[i] < 250 || pixels[i + 1] < 250 || pixels[i + 2] < 250) {
        hasSignature = true
        break
      }
    }
    
    if (!hasSignature) {
      showNotification({
        type: "error",
        title: "Signature requise",
        message: "Veuillez signer dans la zone prévue"
      })
      return
    }
    
    setSigning(true)
    try {
      const signatureData = canvas.toDataURL("image/png")
      
      const response = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          signatureData
        })
      })
      
      if (!response.ok) {
        throw new Error("Failed to sign contract")
      }
      
      showNotification({
        type: "success",
        title: "Contrat signé !",
        message: "Votre signature a été enregistrée avec succès"
      })
      
      setShowSignatureModal(false)
      setSelectedContract(null)
      loadContracts()
      
    } catch (error) {
      console.error("Error signing contract:", error)
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible de signer le contrat"
      })
    } finally {
      setSigning(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  const pendingContracts = contracts.filter(c => c.status === "SENT" || c.status === "VIEWED")
  const signedContracts = contracts.filter(c => c.status === "SIGNED")
  const draftContracts = contracts.filter(c => c.status === "DRAFT")

  const filteredContracts = {
    "ALL": contracts,
    "PENDING": pendingContracts,
    "SIGNED": signedContracts,
    "DRAFT": draftContracts
  }[activeTab]

  const tabs = [
    { id: "ALL" as TabFilter, label: "Tous", count: contracts.length },
    { id: "PENDING" as TabFilter, label: "En attente", count: pendingContracts.length },
    { id: "SIGNED" as TabFilter, label: "Signés", count: signedContracts.length },
    { id: "DRAFT" as TabFilter, label: "Brouillons", count: draftContracts.length },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/documents" 
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux documents
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                  <FileText className="w-7 h-7" />
                </div>
                Mes Contrats
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Consultez et signez vos contrats de travail
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1 mb-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs font-bold
                      ${activeTab === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }
                    `}>
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {activeTab === "PENDING" && "Aucun contrat en attente"}
              {activeTab === "SIGNED" && "Aucun contrat signé"}
              {activeTab === "DRAFT" && "Aucun brouillon"}
              {activeTab === "ALL" && "Aucun contrat"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab === "ALL" 
                ? "Vous n'avez pas encore de contrats à consulter"
                : "Aucun contrat dans cette catégorie"
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredContracts.map((contract) => {
              const status = statusConfig[contract.status]
              const StatusIcon = status.icon
              const isPending = contract.status === "SENT" || contract.status === "VIEWED"
              const isDraft = contract.status === "DRAFT"
              
              return (
                <div
                  key={contract.id}
                  className={`
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-all
                    ${isPending ? "border-2 border-yellow-200 dark:border-yellow-800" : "border border-gray-200 dark:border-gray-700"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`
                        p-3 rounded-xl
                        ${isPending ? "bg-yellow-100 dark:bg-yellow-900/30" : ""}
                        ${contract.status === "SIGNED" ? "bg-green-100 dark:bg-green-900/30" : ""}
                        ${isDraft ? "bg-gray-100 dark:bg-gray-700" : ""}
                      `}>
                        <StatusIcon className={`
                          w-6 h-6
                          ${isPending ? "text-yellow-600 dark:text-yellow-400" : ""}
                          ${contract.status === "SIGNED" ? "text-green-600 dark:text-green-400" : ""}
                          ${isDraft ? "text-gray-600 dark:text-gray-400" : ""}
                        `} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {contract.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {contract.sent_at && `Reçu le ${formatDate(contract.sent_at)}`}
                            {contract.signed_at && `Signé le ${formatDate(contract.signed_at)}`}
                            {!contract.sent_at && !contract.signed_at && `Créé le ${formatDate(contract.created_at)}`}
                          </span>
                          <span className={`
                            px-2 py-0.5 rounded-full text-xs font-medium
                            ${status.color === "yellow" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" : ""}
                            ${status.color === "green" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : ""}
                            ${status.color === "blue" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : ""}
                            ${status.color === "gray" ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : ""}
                          `}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewContract(contract)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                        title="Voir le contrat"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </button>
                      <button
                        onClick={() => handlePrintContract(contract)}
                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title="Imprimer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadContract(contract)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {isPending && (
                        <button
                          onClick={() => {
                            setSelectedContract(contract)
                            handleStartSignature()
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 font-medium"
                        >
                          <PenTool className="w-4 h-4" />
                          Signer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Contract View Modal */}
        {selectedContract && !showSignatureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedContract(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedContract.title}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintContract(selectedContract)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Imprimer"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownloadContract(selectedContract)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedContract(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="h-[70vh]">
                <iframe
                  src={selectedContract.signed_pdf_path || selectedContract.original_pdf_path}
                  className="w-full h-full"
                  title={selectedContract.title}
                />
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                {(selectedContract.status === "SENT" || selectedContract.status === "VIEWED") && (
                  <button
                    onClick={handleStartSignature}
                    className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 font-medium"
                  >
                    <PenTool className="w-5 h-5" />
                    Signer ce contrat
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Signature Modal */}
        {showSignatureModal && selectedContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSignatureModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PenTool className="w-6 h-6" />
                    <h2 className="text-lg font-bold">Signer le contrat</h2>
                  </div>
                  <button
                    onClick={() => setShowSignatureModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important :</strong> En signant ce contrat, vous attestez avoir lu et accepté l'ensemble des termes et conditions.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dessinez votre signature ci-dessous :
                  </label>
                  <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="w-full bg-white cursor-crosshair touch-none"
                      onMouseDown={(e) => startDrawing(getMousePos(e))}
                      onMouseMove={(e) => draw(getMousePos(e))}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={(e) => {
                        e.preventDefault()
                        startDrawing(getTouchPos(e))
                      }}
                      onTouchMove={(e) => {
                        e.preventDefault()
                        draw(getTouchPos(e))
                      }}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <button
                    onClick={clearSignature}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Effacer et recommencer
                  </button>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  disabled={signing}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {signing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signature en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmer et signer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
