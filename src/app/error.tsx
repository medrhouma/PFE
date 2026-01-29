"use client";

import { useEffect, useState } from "react";
import { 
  RefreshCw, 
  Home, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Zap, 
  Wifi, 
  Server, 
  Lock, 
  Clock 
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const { language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  const translations = {
    fr: {
      title: "Oups ! Quelque chose s'est mal passé",
      subtitle: "Une erreur inattendue s'est produite",
      description: "Nous sommes désolés pour ce désagrément. Notre équipe a été notifiée et travaille sur le problème.",
      tryAgain: "Réessayer",
      goHome: "Retour à l'accueil",
      showDetails: "Voir les détails",
      hideDetails: "Masquer les détails",
      errorId: "ID d'erreur",
      copied: "Copié !",
      possibleCauses: "Causes possibles",
      causes: {
        network: "Problème de connexion réseau",
        server: "Erreur temporaire du serveur",
        timeout: "Délai d'attente dépassé",
        permission: "Problème d'autorisation"
      },
      tips: {
        title: "Conseils",
        refresh: "Actualiser la page",
        cache: "Vider le cache du navigateur",
        network: "Vérifier votre connexion internet",
        later: "Réessayer dans quelques minutes"
      }
    },
    en: {
      title: "Oops! Something went wrong",
      subtitle: "An unexpected error occurred",
      description: "We apologize for the inconvenience. Our team has been notified and is working on the issue.",
      tryAgain: "Try again",
      goHome: "Go to home",
      showDetails: "Show details",
      hideDetails: "Hide details",
      errorId: "Error ID",
      copied: "Copied!",
      possibleCauses: "Possible causes",
      causes: {
        network: "Network connection issue",
        server: "Temporary server error",
        timeout: "Request timeout",
        permission: "Permission issue"
      },
      tips: {
        title: "Tips",
        refresh: "Refresh the page",
        cache: "Clear browser cache",
        network: "Check your internet connection",
        later: "Try again in a few minutes"
      }
    },
    ar: {
      title: "عذراً! حدث خطأ ما",
      subtitle: "حدث خطأ غير متوقع",
      description: "نعتذر عن هذا الإزعاج. تم إبلاغ فريقنا ويعمل على حل المشكلة.",
      tryAgain: "حاول مجدداً",
      goHome: "العودة للرئيسية",
      showDetails: "عرض التفاصيل",
      hideDetails: "إخفاء التفاصيل",
      errorId: "معرف الخطأ",
      copied: "تم النسخ!",
      possibleCauses: "الأسباب المحتملة",
      causes: {
        network: "مشكلة في الاتصال بالشبكة",
        server: "خطأ مؤقت في الخادم",
        timeout: "انتهاء مهلة الطلب",
        permission: "مشكلة في الصلاحيات"
      },
      tips: {
        title: "نصائح",
        refresh: "تحديث الصفحة",
        cache: "مسح ذاكرة التخزين المؤقت",
        network: "تحقق من اتصال الإنترنت",
        later: "حاول مرة أخرى بعد بضع دقائق"
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  const handleRetry = async () => {
    setIsRetrying(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    reset();
  };

  const copyErrorId = () => {
    if (error.digest) {
      navigator.clipboard.writeText(error.digest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const causes = [
    { icon: Wifi, text: t.causes.network, color: "text-blue-500" },
    { icon: Server, text: t.causes.server, color: "text-orange-500" },
    { icon: Clock, text: t.causes.timeout, color: "text-yellow-500" },
    { icon: Lock, text: t.causes.permission, color: "text-red-500" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-float-slow-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="relative max-w-2xl w-full">
        {/* Main card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-fadeIn">
          {/* Error illustration */}
          <div className="relative py-12 px-8 text-center overflow-hidden">
            {/* Animated warning icon */}
            <div className="relative inline-flex items-center justify-center mb-6">
              {/* Pulsing rings */}
              <div className="absolute w-32 h-32 bg-red-500/10 rounded-full animate-ping-slow" />
              <div className="absolute w-24 h-24 bg-red-500/20 rounded-full animate-ping-slower" />
              
              {/* Icon container */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 animate-bounce-gentle">
                <AlertTriangle className="w-10 h-10 text-white animate-shake" />
              </div>
            </div>

            {/* Error code */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400">
                ERROR 500
              </span>
            </div>

            {/* Title and description */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 animate-slideUp">
              {t.title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2 animate-slideUp animation-delay-100">
              {t.subtitle}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 max-w-md mx-auto animate-slideUp animation-delay-200">
              {t.description}
            </p>
          </div>

          {/* Actions */}
          <div className="px-8 pb-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                {t.tryAgain}
              </button>
              
              <a
                href="/home"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <Home className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                {t.goHome}
              </a>
            </div>
          </div>

          {/* Possible causes section */}
          <div className="px-8 pb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t.possibleCauses}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {causes.map((cause, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <cause.icon className={`w-4 h-4 ${cause.color}`} />
                    {cause.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Error details (development) */}
          {(process.env.NODE_ENV === "development" || error.digest) && (
            <div className="px-8 pb-8">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full justify-center py-2"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    {t.hideDetails}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    {t.showDetails}
                  </>
                )}
              </button>

              {showDetails && (
                <div className="mt-4 space-y-3 animate-slideDown">
                  {/* Error ID */}
                  {error.digest && (
                    <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {t.errorId}:
                        </span>
                        <code className="text-xs font-mono text-gray-700 dark:text-gray-300">
                          {error.digest}
                        </code>
                      </div>
                      <button
                        onClick={copyErrorId}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Error message (dev only) */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                        {error.message}
                      </p>
                      {error.stack && (
                        <pre className="mt-3 text-xs font-mono text-red-500/80 dark:text-red-400/80 overflow-auto max-h-40 whitespace-pre-wrap">
                          {error.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tips card */}
        <div className="mt-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-5 animate-fadeIn animation-delay-300">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            {t.tips.title}
          </h3>
          <ul className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              {t.tips.refresh}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              {t.tips.cache}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              {t.tips.network}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              {t.tips.later}
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.1); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-slow-delayed {
          animation: float-slow 8s ease-in-out infinite 4s;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-ping-slower {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s;
        }
        
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(5deg); }
          75% { transform: rotate(-5deg); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
          animation-delay: 2s;
          animation-iteration-count: 3;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        
        .animation-delay-100 {
          animation-delay: 100ms;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}
