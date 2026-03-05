import { LoginForm } from "@/components/auth/LoginForm"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Image from "next/image"
import { LoginAnimations } from "./LoginAnimations"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <LoginAnimations />
      {/* ================= ANIMATED BACKGROUND (Global) ================= */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs - Version claire */}
        <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-violet-300/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-200/20 rounded-full blur-[150px]" />
        
        {/* Grid Pattern - Plus visible sur fond clair */}
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.15) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* ================= LEFT SIDE ================= */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Glass Card Container - Version claire */}
        <div className="absolute inset-8 rounded-3xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border border-white/60 shadow-2xl shadow-violet-200/50 overflow-hidden">
          {/* Inner Glow - Version claire */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-100/50 via-transparent to-purple-100/30" />
          
          {/* Floating Particles - Couleurs adaptées */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-violet-400/40 rounded-full particle-float"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${4 + i * 0.5}s`
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative h-full flex flex-col p-10">
            {/* Header Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-slate-800 font-semibold text-lg tracking-wide">
                Santec AI
              </span>
            </div>

            {/* Center - Large Logo */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                {/* Glow Effect Behind Logo - Version claire */}
                <div className="absolute inset-0 bg-violet-300/30 blur-3xl scale-150 rounded-full" />
                
                {/* Logo Container */}
                <div className="relative group">
                  <div className="w-64 h-64 rounded-3xl bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-sm border border-violet-200/50 flex items-center justify-center shadow-2xl shadow-violet-300/30 transition-all duration-500 group-hover:scale-105 group-hover:shadow-violet-400/40">
                    <Image
                      src="/logosantec.png"
                      alt="Santec AI Logo"
                      width={180}
                      height={180}
                      priority
                      className="object-contain drop-shadow-xl"
                    />
                  </div>
                  
                  {/* Orbiting Ring - Couleurs adaptées */}
                  <div className="absolute -inset-4 border border-violet-300/30 rounded-[2rem] orbit-ring" />
                  <div className="absolute -inset-8 border border-dashed border-violet-200/20 rounded-[2.5rem] orbit-ring-reverse" />
                </div>
              </div>
            </div>

            {/* Bottom Text - Couleurs sombres pour lisibilité */}
            <div className="space-y-2">
              <h2 className="text-slate-700 text-2xl font-light">
                Gérez vos <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">ressources humaines</span>
              </h2>
              <p className="text-slate-500 text-sm">
                Plateforme RH moderne et sécurisée
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE ================= */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 relative z-10">
        {/* Mobile Background - Supprimé le fond sombre */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-violet-100 via-purple-50 to-white" />
        
        {/* Form Card */}
        <div className="relative w-full max-w-md">
          {/* Card Glow - Version claire */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-300/30 to-purple-300/30 rounded-3xl blur-xl opacity-60" />
          
          {/* Card Content - Fond blanc cassé */}
          <div className="relative bg-white/90 backdrop-blur-2xl rounded-2xl border border-violet-100/50 p-8 shadow-2xl shadow-slate-200/50">
            {/* Mobile Logo (visible only on mobile) */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/25">
                <Image
                  src="/logosantec.png"
                  alt="Santec AI Logo"
                  width={50}
                  height={50}
                  priority
                  className="object-contain"
                />
              </div>
              <h1 className="text-slate-800 text-xl font-semibold">Santec AI</h1>
            </div>
            
            <LoginForm />
          </div>
          
          {/* Footer */}
          <p className="text-center text-slate-400 text-xs mt-6">
            © 2026 Santec AI. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}