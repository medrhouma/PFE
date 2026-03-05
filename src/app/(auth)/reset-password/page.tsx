"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { 
  KeyRound, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()
  const token = searchParams.get("token")

  const [isValidating, setIsValidating] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Password validation states
  const [validations, setValidations] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    passwordsMatch: false,
  })

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false)
        setTokenError(t('missing_reset_token'))
        return
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await response.json()

        if (data.valid) {
          setIsTokenValid(true)
          setEmail(data.email)
        } else {
          setTokenError(data.error || t('invalid_token'))
        }
      } catch (err) {
        setTokenError(t('token_validation_error'))
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  // Update password validations
  useEffect(() => {
    setValidations({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      passwordsMatch: password.length > 0 && password === confirmPassword,
    })
  }, [password, confirmPassword])

  const isPasswordValid = Object.values(validations).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isPasswordValid) return
    
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error_occurred'))
      }

      setIsSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_occurred'))
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto" />
          <p className="text-gray-600">{t('validating_link')}</p>
        </div>
      </div>
    )
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('invalid_link')}
            </h1>
            <p className="text-gray-600">
              {tokenError || t('invalid_or_expired_link')}
            </p>
          </div>

          <Link href="/forgot-password">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white">
              {t('request_new_link')}
            </Button>
          </Link>

          <div>
            <Link 
              href="/login"
              className="text-sm text-gray-600 hover:text-violet-600 transition-colors"
            >
              {t('back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('password_changed')}
            </h1>
            <p className="text-gray-600">
              {t('password_reset_success')}
              <br />
              {t('redirect_to_login')}
            </p>
          </div>

          <Link href="/login">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white">
              {t('sign_in')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Violet (60%) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-violet-600 to-indigo-700 p-12 flex-col justify-center items-center">
        <div className="text-center max-w-lg">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">Santec AI</h1>
            <div className="h-1 w-16 bg-white/30 mx-auto mt-3 rounded-full"></div>
          </div>
          
          {/* Icon */}
          <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20">
            <KeyRound className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('new_password')}
          </h2>
          <p className="text-violet-200 text-lg leading-relaxed">
            {t('choose_strong_password')}
          </p>
        </div>
      </div>

      {/* Right Side - Form (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Back link */}
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-violet-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back_to_login')}
          </Link>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('create_new_password')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('for_account')}: <strong>{email}</strong>
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('new_password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('enter_new_password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t('confirm_password')}
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('confirm_new_password')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-100 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t('password_requirements')}:
              </p>
              <ValidationItem valid={validations.minLength} text={t('min_8_chars')} />
              <ValidationItem valid={validations.hasUppercase} text={t('at_least_uppercase')} />
              <ValidationItem valid={validations.hasLowercase} text={t('at_least_lowercase')} />
              <ValidationItem valid={validations.hasNumber} text={t('at_least_number')} />
              <ValidationItem valid={validations.passwordsMatch} text={t('passwords_match')} />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !isPasswordValid}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('changing_password')}
                </>
              ) : (
                t('reset_password')
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

// Validation item component
function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {valid ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
      )}
      <span className={valid ? "text-green-700" : "text-gray-600"}>{text}</span>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
