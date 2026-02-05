"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Checkbox } from "@/components/ui/Checkbox"
import { GoogleButton } from "./GoogleButton"
import { OTPInput } from "./OTPInput"
import { Mail, ArrowLeft, RefreshCw, Shield, Clock, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"

type LoginStep = "credentials" | "otp"

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>("credentials")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errorShake, setErrorShake] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // OTP expiry countdown
  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const now = new Date()
      if (now >= expiresAt) {
        setError("Code OTP expiré. Veuillez en demander un nouveau.")
        setExpiresAt(null)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otpCode.length === 6 && step === "otp") {
      handleVerifyOTP()
    }
  }, [otpCode])

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")
    setErrorShake(false)

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi du code OTP")
        setErrorShake(true)
        setTimeout(() => setErrorShake(false), 500)
        return
      }

      setStep("otp")
      setCountdown(60) // 60 seconds before allowing resend
      setExpiresAt(new Date(Date.now() + (data.expiresIn || 300) * 1000))
      setSuccess("Code envoyé à " + formData.email)
    } catch (err) {
      setError("Erreur de connexion au serveur")
      setErrorShake(true)
      setTimeout(() => setErrorShake(false), 500)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return

    setIsResending(true)
    setError("")
    setOtpCode("")

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur lors du renvoi du code")
        return
      }

      setCountdown(60)
      setExpiresAt(new Date(Date.now() + (data.expiresIn || 300) * 1000))
      setSuccess("Nouveau code envoyé")
    } catch (err) {
      setError("Erreur de connexion au serveur")
    } finally {
      setIsResending(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: otpCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Code OTP invalide")
        if (data.remainingAttempts !== undefined) {
          setOtpCode("")
        }
        return
      }

      // OTP verified, now sign in with NextAuth
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Erreur lors de la connexion")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      setError("Erreur de connexion au serveur")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToCredentials = () => {
    setStep("credentials")
    setOtpCode("")
    setError("")
    setSuccess("")
    setExpiresAt(null)
  }

  const getTimeRemaining = () => {
    if (!expiresAt) return ""
    const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // OTP Verification Step
  if (step === "otp") {
    return (
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Vérification en deux étapes
          </h1>
          <p className="mt-2 text-gray-600">
            Entrez le code à 6 chiffres envoyé à
          </p>
          <p className="font-medium text-violet-600 flex items-center justify-center gap-2 mt-1">
            <Mail className="w-4 h-4" />
            {formData.email}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && !error && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* OTP Input */}
        <div className="space-y-4">
          <OTPInput
            value={otpCode}
            onChange={setOtpCode}
            disabled={isLoading}
            error={!!error}
          />

          {/* Timer */}
          {expiresAt && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Code expire dans {getTimeRemaining()}</span>
            </div>
          )}
        </div>

        {/* Verify Button */}
        <Button
          onClick={handleVerifyOTP}
          isLoading={isLoading}
          disabled={otpCode.length !== 6}
        >
          Vérifier et se connecter
        </Button>

        {/* Resend Section */}
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">
            Vous n'avez pas reçu le code ?
          </p>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={countdown > 0 || isResending}
            className={`
              inline-flex items-center gap-2 text-sm font-medium
              ${countdown > 0 || isResending
                ? "text-gray-400 cursor-not-allowed"
                : "text-violet-600 hover:text-violet-700"
              }
            `}
          >
            <RefreshCw className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`} />
            {countdown > 0
              ? `Renvoyer dans ${countdown}s`
              : isResending
                ? "Envoi en cours..."
                : "Renvoyer le code"
            }
          </button>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={handleBackToCredentials}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </button>
      </div>
    )
  }

  // Credentials Step
  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center">
        {/* Logo */}
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
          <span className="text-white font-bold text-2xl">S</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Connexion
        </h1>
        <p className="mt-2 text-gray-600">
          Connectez-vous à votre compte
        </p>
        <p className="mt-1 text-sm text-violet-600 font-medium">
          Bienvenue sur Santec RH
        </p>
      </div>

      {/* Google Button */}
      <GoogleButton />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">
            ou continuer avec email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSendOTP} className="space-y-5">
        {error && (
          <div className={`p-3 rounded-lg bg-red-50 border border-red-200 transition-all duration-300 ${errorShake ? 'animate-shake' : ''}`}>
            <p className="text-sm text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            placeholder="votre@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:shadow-lg focus:shadow-violet-500/20 transition-all duration-200 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:shadow-lg focus:shadow-violet-500/20 transition-all duration-200 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-violet-600 transition-colors disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Checkbox
            label="Rester connecté"
            checked={formData.rememberMe}
            onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-violet-600 hover:text-violet-500 transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.email || !formData.password}
          className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Vérification...</span>
            </>
          ) : (
            "Continuer"
          )}
        </button>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-100">
          <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700">
            Pour votre sécurité, un code de vérification sera envoyé à votre email après validation de vos identifiants.
          </p>
        </div>
      </form>

      {/* Footer version */}
      <p className="text-center text-xs text-gray-400 pt-4">
        Santec RH v2.0.0 • Plateforme sécurisée
      </p>
    </div>
  )
}