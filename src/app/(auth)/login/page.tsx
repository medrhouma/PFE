import { LoginForm } from "@/components/auth/LoginForm"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 lg:hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-violet-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
        </div>
      </div>

      {/* Left Side - Violet (60%) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated Blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000" />
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-6000" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <span className="text-white text-xl font-semibold">Santec RH</span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 relative z-10">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gérez vos ressources<br />humaines efficacement
            </h1>
            <p className="mt-4 text-violet-200 text-lg">
              Votre plateforme RH moderne et sécurisée
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 transition-all hover:bg-white/15">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white font-medium">Pointage sécurisé avec vérification faciale</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 transition-all hover:bg-white/15">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white font-medium">Gestion des employés et des rôles</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 transition-all hover:bg-white/15">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white font-medium">Gestion des congés simplifiée</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 transition-all hover:bg-white/15">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white font-medium">Rapports et statistiques en temps réel</span>
            </div>
          </div>
        </div>

        {/* Illustration placeholder */}
        <div className="flex justify-center relative z-10">
          <div className="w-80 h-60 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
            <svg className="w-32 h-32 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="text-violet-300 text-sm relative z-10">
          © 2026 Santec RH. Tous droits réservés.
        </div>
      </div>

      {/* Right Side - Form (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 relative z-10">
        {/* Glassmorphism Card for Mobile */}
        <div className="w-full max-w-md lg:bg-transparent bg-white/90 backdrop-blur-xl lg:backdrop-blur-none rounded-2xl lg:rounded-none p-6 lg:p-0 shadow-2xl lg:shadow-none border border-white/20 lg:border-none">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}