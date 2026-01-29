"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Checkbox } from "@/components/ui/Checkbox"
import { GoogleButton } from "./GoogleButton"
import { OTPInput } from "./OTPInput"
import { Mail, ArrowLeft, RefreshCw, Shield, Clock } from "lucide-react"
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
        return
      }

      setStep("otp")
      setCountdown(60) // 60 seconds before allowing resend
      setExpiresAt(new Date(Date.now() + (data.expiresIn || 300) * 1000))
      setSuccess("Code envoyé à " + formData.email)
    } catch (err) {
      setError("Erreur de connexion au serveur")
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
        <h1 className="text-3xl font-bold text-gray-900">
          Connexion
        </h1>
        <p className="mt-2 text-gray-600">
          Connectez-vous à votre compte
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
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="votre@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />

        <div className="flex items-center justify-between">
          <Checkbox
            label="Rester connecté"
            checked={formData.rememberMe}
            onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-violet-600 hover:text-violet-500"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" isLoading={isLoading}>
          Continuer
        </Button>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-lg">
          <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700">
            Pour votre sécurité, un code de vérification sera envoyé à votre email après validation de vos identifiants.
          </p>
        </div>
      </form>
    </div>
  )
}