"use client"

import { useState } from "react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue")
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
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
            <Mail className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Réinitialisation du mot de passe
          </h2>
          <p className="text-violet-200 text-lg leading-relaxed">
            Pas de panique ! Entrez votre email et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
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
            Retour à la connexion
          </Link>

          {!isSuccess ? (
            <>
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Mot de passe oublié ?
                </h1>
                <p className="mt-2 text-gray-600">
                  Entrez votre email pour recevoir un lien de réinitialisation
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
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading || !email}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien de réinitialisation"
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Email envoyé !
                </h2>
                <p className="text-gray-600">
                  Si un compte existe avec l'adresse <strong className="text-gray-900">{email}</strong>, vous recevrez un lien de réinitialisation dans quelques instants.
                </p>
              </div>

              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 text-left">
                <p className="text-sm text-violet-800">
                  <strong>Conseil :</strong> Vérifiez également votre dossier spam si vous ne voyez pas l'email.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setIsSuccess(false)
                    setEmail("")
                  }}
                  className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                >
                  Essayer avec un autre email
                </Button>
                
                <div>
                  <Link 
                    href="/login"
                    className="text-sm text-gray-600 hover:text-violet-600 transition-colors"
                  >
                    Retour à la connexion
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}