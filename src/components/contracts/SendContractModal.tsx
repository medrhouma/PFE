"use client"

import { useState, useRef, useEffect } from "react"
import { X, FileText, Upload, Send, Briefcase, Calendar, AlertCircle, CheckCircle } from "lucide-react"
import { useNotification } from "@/contexts/NotificationContext"

interface SendContractModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    name?: string
    prenom?: string
    nom?: string
    email: string
  }
  onSuccess?: () => void
}

const contractTypes = [
  { value: "CDI", label: "CDI - Contrat à Durée Indéterminée", icon: "📋" },
  { value: "CDD", label: "CDD - Contrat à Durée Déterminée", icon: "📄" },
  { value: "Stage", label: "Stage / Convention de stage", icon: "🎓" },
  { value: "Freelance", label: "Freelance / Prestation", icon: "💼" }
]

export default function SendContractModal({ isOpen, onClose, user, onSuccess }: SendContractModalProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"form" | "upload" | "confirm">("form")
  const [contractData, setContractData] = useState({
    title: "",
    type: "CDI" as "CDI" | "CDD" | "Stage" | "Freelance",
    description: "",
    validFrom: "",
    validUntil: ""
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [existingContracts, setExistingContracts] = useState<any[]>([])
  const [checkingExisting, setCheckingExisting] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showNotification } = useNotification()

  // Check for existing contracts when modal opens
  useEffect(() => {
    if (isOpen) {
      checkExistingContracts()
    }
  }, [isOpen, user.id])

  const checkExistingContracts = async () => {
    setCheckingExisting(true)
    try {
      const response = await fetch(`/api/contracts?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        const userContracts = data.data || []
        setExistingContracts(userContracts)
        
        // Check for pending/sent contracts
        const pendingContract = userContracts.find((c: any) => 
          c.status === 'SENT' || c.status === 'VIEWED' || c.status === 'DRAFT'
        )
        
        if (pendingContract) {
          showNotification({
            type: "warning",
            title: "Contrat déjà envoyé",
            message: `Un contrat "${pendingContract.title}" est déjà en attente de signature pour cet utilisateur.`
          })
        }
      }
    } catch (error) {
      console.error("Error checking existing contracts:", error)
    } finally {
      setCheckingExisting(false)
    }
  }

  if (!isOpen) return null

  const userName = user.prenom && user.nom ? `${user.prenom} ${user.nom}` : user.name || user.email

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        showNotification({
          type: "error",
          title: "Format invalide",
          message: "Seuls les fichiers PDF sont acceptés"
        })
        return
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification({
          type: "error",
          title: "Fichier trop volumineux",
          message: "La taille maximale est de 10 Mo"
        })
        return
      }
      setPdfFile(file)
    }
  }

  const uploadPdf = async (): Promise<string | null> => {
    if (!pdfFile) return null
    
    const formData = new FormData()
    formData.append("file", pdfFile)
    
    try {
      // Use dedicated contract upload endpoint
      const response = await fetch("/api/contracts/upload", {
        method: "POST",
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Upload failed")
      }
      
      const data = await response.json()
      return data.url || data.path
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  const handleSubmit = async () => {
    if (!contractData.title || !contractData.type) {
      showNotification({
        type: "error",
        title: "Champs requis",
        message: "Veuillez remplir le titre et le type de contrat"
      })
      return
    }

    if (!pdfFile) {
      showNotification({
        type: "error",
        title: "Document requis",
        message: "Veuillez télécharger le fichier PDF du contrat"
      })
      return
    }

    // Warn if there's already a pending contract
    const pendingContract = existingContracts.find(c => 
      c.status === 'SENT' || c.status === 'VIEWED' || c.status === 'DRAFT'
    )
    
    if (pendingContract && !window.confirm(
      `Un contrat "${pendingContract.title}" est déjà en attente. Voulez-vous envoyer un nouveau contrat quand même ?`
    )) {
      return
    }

    setLoading(true)
    try {
      // 1. Upload PDF
      setUploadProgress(30)
      const pdfPath = await uploadPdf()
      
      if (!pdfPath) {
        throw new Error("Failed to upload PDF")
      }
      
      setUploadProgress(60)
      
      // 2. Create contract
      const createResponse = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: contractData.title,
          type: contractData.type,
          description: contractData.description,
          pdfPath,
          validFrom: contractData.validFrom || undefined,
          validUntil: contractData.validUntil || undefined
        })
      })
      
      if (!createResponse.ok) {
        throw new Error("Failed to create contract")
      }
      
      const contract = await createResponse.json()
      setUploadProgress(80)
      
      // 3. Send for signature
      const sendResponse = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" })
      })
      
      if (!sendResponse.ok) {
        throw new Error("Failed to send contract")
      }
      
      setUploadProgress(100)
      
      showNotification({
        type: "success",
        title: "Contrat envoyé !",
        message: `Le contrat a été envoyé à ${userName} pour signature`
      })
      
      onSuccess?.()
      onClose()
      
    } catch (error) {
      console.error("Error sending contract:", error)
      showNotification({
        type: "error",
        title: "Erreur",
        message: "Impossible d'envoyer le contrat. Veuillez réessayer."
      })
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Envoyer un contrat</h2>
                <p className="text-sm text-white/80">À {userName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Contract Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titre du contrat *
            </label>
            <input
              type="text"
              value={contractData.title}
              onChange={(e) => setContractData({ ...contractData, title: e.target.value })}
              placeholder="Ex: Contrat de travail - Développeur"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Contract Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de contrat *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {contractTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setContractData({ ...contractData, type: type.value as any })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    contractData.type === type.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-sm font-medium">{type.value}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={contractData.description}
              onChange={(e) => setContractData({ ...contractData, description: e.target.value })}
              placeholder="Détails supplémentaires sur le contrat..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date de début
              </label>
              <input
                type="date"
                value={contractData.validFrom}
                onChange={(e) => setContractData({ ...contractData, validFrom: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date de fin
              </label>
              <input
                type="date"
                value={contractData.validUntil}
                onChange={(e) => setContractData({ ...contractData, validUntil: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document PDF du contrat *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {!pdfFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
              >
                <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <Upload className="w-10 h-10" />
                  <span className="font-medium">Cliquez pour télécharger le PDF</span>
                  <span className="text-sm">Maximum 10 Mo</span>
                </div>
              </button>
            ) : (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">{pdfFile.name}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} Mo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-green-700 dark:text-green-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Envoi en cours...</span>
                <span className="font-medium text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !contractData.title || !pdfFile}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Envoyer le contrat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
