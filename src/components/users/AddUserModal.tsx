"use client"

import { useState, useEffect, useCallback } from "react"
import { X, User, Check, AlertCircle } from "lucide-react"
import { useNotification } from "@/contexts/NotificationContext"

interface AddUserModalProps {
  onClose: () => void
  onSave?: (user: any) => void
}

// Password validation rules
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    isValid: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
  }
}

export default function AddUserModal({ onClose, onSave }: AddUserModalProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("SUPER_ADMIN")
  const [provider, setProvider] = useState("Credentials")
  const [saving, setSaving] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)
  const { showNotification } = useNotification()

  // Password validation state
  const passwordValidation = validatePassword(password)

  // Debounced email check
  const checkEmailExists = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToCheck)) {
      setEmailExists(false)
      setEmailChecked(false)
      return
    }

    setCheckingEmail(true)
    try {
      const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(emailToCheck)}`)
      const data = await response.json()
      setEmailExists(data.exists)
      setEmailChecked(true)
    } catch (error) {
      console.error("Error checking email:", error)
      setEmailChecked(false)
    } finally {
      setCheckingEmail(false)
    }
  }, [])

  // Check email after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email) {
        checkEmailExists(email)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [email, checkEmailExists])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate before submit
    if (!passwordValidation.isValid) {
      showNotification({
        type: 'error',
        title: 'Mot de passe invalide',
        message: 'Le mot de passe ne respecte pas les critères requis',
        duration: 5000
      })
      return
    }

    if (emailExists) {
      showNotification({
        type: 'error',
        title: 'Email déjà utilisé',
        message: 'Cet email est déjà associé à un compte existant',
        duration: 5000
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`,
          email,
          password,
          role,
          provider
        })
      })

      if (response.ok) {
        const newUser = await response.json()
        if (onSave) {
          onSave(newUser)
        }
        showNotification({
          type: 'success',
          title: 'Utilisateur créé',
          message: 'Le nouvel utilisateur a été créé avec succès',
          duration: 4000
        })
        onClose()
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          title: 'Erreur de création',
          message: error.error || 'Impossible de créer l\'utilisateur',
          duration: 5000
        })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      showNotification({
        type: 'error',
        title: 'Erreur de connexion',
        message: 'Impossible de créer l\'utilisateur. Veuillez vérifier votre connexion.',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-8 py-6">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              Ajout d'utilisateur
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Création d'un nouvel utilisateur
            </p>
          </div>
          <div className="w-6"></div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className={`w-full px-4 py-3 pr-10 rounded-xl border ${
                  emailChecked 
                    ? emailExists 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent`}
              />
              {/* Status icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingEmail ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
                ) : emailChecked ? (
                  emailExists ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Check className="w-5 h-5 text-green-500" />
                  )
                ) : null}
              </div>
            </div>
            {emailChecked && emailExists && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Cet email est déjà utilisé
              </p>
            )}
            {emailChecked && !emailExists && email && (
              <p className="mt-1 text-sm text-green-500 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Email disponible
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 pr-10 rounded-xl border ${
                  password.length > 0
                    ? passwordValidation.isValid
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-orange-400 focus:ring-orange-400'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent`}
              />
              {/* Status icon */}
              {password.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {passwordValidation.isValid ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                  )}
                </div>
              )}
            </div>
            {/* Password requirements */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.minLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-400" />}
                  Au moins 8 caractères
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-400" />}
                  Au moins une majuscule (A-Z)
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.hasNumber ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-400" />}
                  Au moins un chiffre (0-9)
                </div>
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1.25rem"
              }}
            >
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="RH">RH</option>
              <option value="USER">User</option>
            </select>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Les modules sont gérés automatiquement via les permissions du rôle sélectionné.
            </p>
          </div>

          {/* Providers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Providers
            </label>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center gap-2">
                Credentials
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => {}}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          {/* Daemon Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Employé Daemon
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Les permissions Daemon sont gérées via les rôles et permissions. Assignez la permission "process" ou "edit" pour le module "daemon" dans la page des rôles.
                </p>
              </div>
              <button
                type="button"
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline whitespace-nowrap"
              >
                Géré par permissions
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Création..." : "Créer l'utilisateur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
