"use client"

import { AlertTriangle, X } from "lucide-react"
import { useNotification } from "@/contexts/NotificationContext"

interface ConfirmationModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmationModal({
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmationModalProps) {
  const { showNotification } = useNotification()

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          container: 'bg-gradient-to-br from-red-500 to-rose-600',
          icon: 'text-red-100',
          confirmButton: 'bg-white text-red-600 hover:bg-red-50 border-white'
        }
      case 'warning':
        return {
          container: 'bg-gradient-to-br from-amber-500 to-orange-600',
          icon: 'text-amber-100',
          confirmButton: 'bg-white text-amber-600 hover:bg-amber-50 border-white'
        }
      case 'info':
        return {
          container: 'bg-gradient-to-br from-violet-500 to-purple-600',
          icon: 'text-violet-100',
          confirmButton: 'bg-white text-violet-600 hover:bg-violet-50 border-white'
        }
      default:
        return {
          container: 'bg-gradient-to-br from-gray-600 to-gray-700',
          icon: 'text-gray-100',
          confirmButton: 'bg-white text-gray-600 hover:bg-gray-50 border-white'
        }
    }
  }

  const styles = getTypeStyles()

  const handleConfirm = () => {
    onConfirm()
    showNotification({
      type: 'success',
      title: 'Action confirmée',
      message: 'L\'action a été exécutée avec succès',
      duration: 3000
    })
  }

  const handleCancel = () => {
    onCancel()
    showNotification({
      type: 'info',
      title: 'Action annulée',
      message: 'Aucune modification n\'a été effectuée',
      duration: 3000
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${styles.container} rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100`}>
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${styles.icon} bg-black/20`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-black/20 transition-colors"
              aria-label="Fermer"
            >
              <X className={`w-5 h-5 ${styles.icon}`} />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            {title}
          </h3>
          <p className="text-white/90 text-sm leading-relaxed">
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-black/20 text-white font-medium hover:bg-black/30 transition-colors border border-white/20"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold hover:scale-105 transition-all duration-200 ${styles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}