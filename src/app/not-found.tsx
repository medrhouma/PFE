"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  FiHome, 
  FiArrowLeft, 
  FiSearch, 
  FiCompass,
  FiFileText,
  FiUsers,
  FiCalendar,
  FiClock,
  FiSettings
} from "react-icons/fi";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const translations = {
    fr: {
      title: "Page introuvable",
      subtitle: "Erreur 404",
      description: "Oups ! La page que vous recherchez semble s'être égarée dans l'espace numérique.",
      goHome: "Retour à l'accueil",
      goBack: "Page précédente",
      searchPlaceholder: "Rechercher une page...",
      quickLinks: "Liens rapides",
      links: {
        dashboard: "Tableau de bord",
        employees: "Employés",
        leaves: "Congés",
        attendance: "Pointage",
        documents: "Documents",
        settings: "Paramètres"
      }
    },
    en: {
      title: "Page not found",
      subtitle: "Error 404",
      description: "Oops! The page you're looking for seems to have wandered off into the digital void.",
      goHome: "Go to home",
      goBack: "Go back",
      searchPlaceholder: "Search for a page...",
      quickLinks: "Quick links",
      links: {
        dashboard: "Dashboard",
        employees: "Employees",
        leaves: "Leave Requests",
        attendance: "Attendance",
        documents: "Documents",
        settings: "Settings"
      }
    },
    ar: {
      title: "الصفحة غير موجودة",
      subtitle: "خطأ 404",
      description: "عذراً! يبدو أن الصفحة التي تبحث عنها قد ضاعت في الفضاء الرقمي.",
      goHome: "الذهاب إلى الرئيسية",
      goBack: "العودة",
      searchPlaceholder: "البحث عن صفحة...",
      quickLinks: "روابط سريعة",
      links: {
        dashboard: "لوحة التحكم",
        employees: "الموظفين",
        leaves: "الإجازات",
        attendance: "الحضور",
        documents: "المستندات",
        settings: "الإعدادات"
      }
    }
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  const quickLinks = [
    { href: "/home", icon: FiHome, label: t.links.dashboard },
    { href: "/rh/employees", icon: FiUsers, label: t.links.employees },
    { href: "/conges", icon: FiCalendar, label: t.links.leaves },
    { href: "/pointage", icon: FiClock, label: t.links.attendance },
    { href: "/documents", icon: FiFileText, label: t.links.documents },
    { href: "/parametres", icon: FiSettings, label: t.links.settings }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-slow-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Floating 404 decorations */}
        <div className="absolute top-1/4 left-1/4 text-9xl font-black text-violet-500/5 dark:text-violet-400/5 animate-float-random">4</div>
        <div className="absolute bottom-1/4 right-1/4 text-9xl font-black text-purple-500/5 dark:text-purple-400/5 animate-float-random-delayed">0</div>
        <div className="absolute top-1/3 right-1/3 text-7xl font-black text-indigo-500/5 dark:text-indigo-400/5 animate-float-random-slow">4</div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="relative max-w-2xl w-full">
        {/* Main card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-fadeIn">
          {/* 404 Illustration */}
          <div className="relative py-12 px-8 text-center overflow-hidden">
            {/* Animated compass icon */}
            <div className="relative inline-flex items-center justify-center mb-6">
              {/* Rotating orbit */}
              <div className="absolute w-36 h-36 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-full animate-spin-slow" />
              <div className="absolute w-28 h-28 border border-purple-300 dark:border-purple-700 rounded-full animate-spin-slow-reverse" />
              
              {/* Compass icon */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 animate-bounce-gentle">
                <FiCompass className="w-10 h-10 text-white animate-spin-very-slow" />
              </div>
            </div>

            {/* 404 text with glitch effect */}
            <div className="relative mb-6">
              <div className="text-8xl md:text-9xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-transparent bg-clip-text animate-gradient select-none">
                404
              </div>
              <div className="absolute inset-0 text-8xl md:text-9xl font-black text-violet-600/10 animate-glitch-1 select-none">
                404
              </div>
              <div className="absolute inset-0 text-8xl md:text-9xl font-black text-purple-600/10 animate-glitch-2 select-none">
                404
              </div>
            </div>

            {/* Error badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-4">
              <FiSearch className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                {t.subtitle}
              </span>
            </div>

            {/* Title and description */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 animate-slideUp">
              {t.title}
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto animate-slideUp animation-delay-100">
              {t.description}
            </p>
          </div>

          {/* Search bar */}
          <div className="px-8 pb-6">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full px-5 py-3.5 pl-12 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300 group-hover:shadow-lg"
              />
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <FiSearch className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Action buttons */}
          <div className="px-8 pb-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/home"
                className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <FiHome className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {t.goHome}
              </Link>
              
              <button
                onClick={() => window.history.back()}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                {t.goBack}
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="px-8 pb-8">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
              {t.quickLinks}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {quickLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-300 animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:from-violet-200 group-hover:to-purple-200 dark:group-hover:from-violet-800/30 dark:group-hover:to-purple-800/30 transition-all duration-300">
                    <link.icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 text-center group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
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
        
        @keyframes float-random {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(10px, -20px) rotate(5deg); }
          50% { transform: translate(-10px, -10px) rotate(-5deg); }
          75% { transform: translate(20px, 10px) rotate(3deg); }
        }
        .animate-float-random {
          animation: float-random 12s ease-in-out infinite;
        }
        .animate-float-random-delayed {
          animation: float-random 12s ease-in-out infinite 6s;
        }
        .animate-float-random-slow {
          animation: float-random 15s ease-in-out infinite 3s;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow 15s linear infinite reverse;
        }
        .animate-spin-very-slow {
          animation: spin-slow 30s linear infinite;
        }
        
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        @keyframes glitch-1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(2px, -2px); }
          60% { transform: translate(-1px, 1px); }
          80% { transform: translate(1px, -1px); }
        }
        .animate-glitch-1 {
          animation: glitch-1 2s ease-in-out infinite;
        }
        
        @keyframes glitch-2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(2px, -2px); }
          40% { transform: translate(-2px, 2px); }
          60% { transform: translate(1px, -1px); }
          80% { transform: translate(-1px, 1px); }
        }
        .animate-glitch-2 {
          animation: glitch-2 2s ease-in-out infinite 0.5s;
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
        
        .animation-delay-100 {
          animation-delay: 100ms;
        }
      `}</style>
    </div>
  );
}
