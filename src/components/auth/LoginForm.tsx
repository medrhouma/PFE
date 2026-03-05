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
import { useLanguage } from "@/contexts/LanguageContext"

type LoginStep = "credentials" | "otp"

export function LoginForm() {
  const router = useRouter()
  const { t } = useLanguage()
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
        setError(t('otp_expired'))
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
      // Check if 2FA is enabled for this user
      const check2fa = await fetch("/api/auth/check-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })
      const check2faData = await check2fa.json()

      if (!check2faData.twoFactorEnabled) {
        // 2FA disabled - direct login without OTP
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.error) {
          const errorMsg = result.error === "CredentialsSignin" 
            ? t('invalid_credentials_msg') 
            : result.error
          setError(errorMsg)
          setErrorShake(true)
          setTimeout(() => setErrorShake(false), 500)
        } else {
          router.push("/")
          router.refresh()
        }
        return
      }

      // 2FA enabled - send OTP
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
        setError(data.error || t('otp_send_error'))
        setErrorShake(true)
        setTimeout(() => setErrorShake(false), 500)
        return
      }

      setStep("otp")
      setCountdown(60) // 60 seconds before allowing resend
      setExpiresAt(new Date(Date.now() + (data.expiresIn || 300) * 1000))
      setSuccess(t('code_sent_to_email') + " " + formData.email)
    } catch (err) {
      setError(t('server_connection_error'))
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
        setError(data.error || t('resend_error'))
        return
      }

      setCountdown(60)
      setExpiresAt(new Date(Date.now() + (data.expiresIn || 300) * 1000))
      setSuccess(t('new_code_sent'))
    } catch (err) {
      setError(t('server_connection_error'))
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
        setError(data.error || t('invalid_otp'))
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
        setError(t('login_error'))
      } else {
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      setError(t('server_connection_error'))
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
            {t('two_step_verification')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('enter_6_digit_code')}
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
              <span>{t('code_expires_in')} {getTimeRemaining()}</span>
            </div>
          )}
        </div>

        {/* Verify Button */}
        <Button
          onClick={handleVerifyOTP}
          isLoading={isLoading}
          disabled={otpCode.length !== 6}
        >
          {t('verify_and_login')}
        </Button>

        {/* Resend Section */}
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">
            {t('not_received_code')}
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
              ? `${t('resend_in')} ${countdown}s`
              : isResending
                ? t('sending_in_progress')
                : t('resend_code')
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
          {t('back_to_login')}
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
        
        <h1 className="text-3xl font-bold text-gray-900">
          {t('login')}
        </h1>
        <p className="mt-2 text-gray-600">
          {t('login_to_account')}
        </p>
        <p className="mt-1 text-sm text-violet-600 font-medium">
          {t('welcome_santec')}
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
            {t('or_continue_with_email')}
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
          <label className="block text-sm font-medium text-gray-700">{t('email')}</label>
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
          <label className="block text-sm font-medium text-gray-700">{t('password')}</label>
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
            label={t('stay_logged_in')}
            checked={formData.rememberMe}
            onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-violet-600 hover:text-violet-500 transition-colors"
          >
            {t('forgot_password')}
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
              <span>{t('verifying')}...</span>
            </>
          ) : (
            t('continue_btn')
          )}
        </button>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-100">
          <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700">
            {t('security_notice')}
          </p>
        </div>
      </form>

      {/* Footer version */}
      <p className="text-center text-xs text-gray-400 pt-4">
        Santec RH v2.0.0 • {t('secure_platform')}
      </p>
    </div>
  )
}