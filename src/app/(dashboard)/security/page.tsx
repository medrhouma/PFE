"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Shield, 
  AlertTriangle, 
  Check, 
  X, 
  Monitor, 
  Smartphone, 
  Globe,
  Clock,
  MapPin
} from "lucide-react";

interface LoginEntry {
  id: string;
  ipAddress: string;
  userAgent: string;
  loginMethod: string;
  success: boolean;
  failureReason?: string;
  isSuspicious: boolean;
  createdAt: string;
}

const translations = {
  fr: {
    title: "Historique des connexions",
    subtitle: "Consultez l'activité de connexion à votre compte",
    recentLogins: "Connexions récentes",
    suspiciousActivity: "Activité suspecte",
    failedAttempts: "Tentatives échouées",
    noData: "Aucune donnée disponible",
    date: "Date",
    ip: "Adresse IP",
    device: "Appareil",
    method: "Méthode",
    status: "Statut",
    successful: "Réussie",
    failed: "Échouée",
    suspicious: "Suspecte",
    reason: "Raison",
    google: "Google",
    credentials: "Email/Mot de passe",
    loading: "Chargement...",
    securityTip: "Conseil sécurité",
    securityTipText: "Si vous voyez des connexions suspectes, changez immédiatement votre mot de passe et activez l'authentification à deux facteurs si disponible.",
    thisDevice: "Cet appareil",
  },
  en: {
    title: "Login History",
    subtitle: "View your account login activity",
    recentLogins: "Recent logins",
    suspiciousActivity: "Suspicious activity",
    failedAttempts: "Failed attempts",
    noData: "No data available",
    date: "Date",
    ip: "IP Address",
    device: "Device",
    method: "Method",
    status: "Status",
    successful: "Successful",
    failed: "Failed",
    suspicious: "Suspicious",
    reason: "Reason",
    google: "Google",
    credentials: "Email/Password",
    loading: "Loading...",
    securityTip: "Security tip",
    securityTipText: "If you see suspicious logins, change your password immediately and enable two-factor authentication if available.",
    thisDevice: "This device",
  },
  ar: {
    title: "سجل تسجيل الدخول",
    subtitle: "عرض نشاط تسجيل الدخول لحسابك",
    recentLogins: "عمليات تسجيل الدخول الأخيرة",
    suspiciousActivity: "نشاط مشبوه",
    failedAttempts: "محاولات فاشلة",
    noData: "لا توجد بيانات",
    date: "التاريخ",
    ip: "عنوان IP",
    device: "الجهاز",
    method: "الطريقة",
    status: "الحالة",
    successful: "ناجحة",
    failed: "فاشلة",
    suspicious: "مشبوهة",
    reason: "السبب",
    google: "جوجل",
    credentials: "البريد الإلكتروني/كلمة المرور",
    loading: "جاري التحميل...",
    securityTip: "نصيحة أمنية",
    securityTipText: "إذا رأيت عمليات تسجيل دخول مشبوهة، قم بتغيير كلمة المرور فورًا وفعّل المصادقة الثنائية إن توفرت.",
    thisDevice: "هذا الجهاز",
  },
};

export default function LoginHistoryPage() {
  const { data: session } = useSession();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.fr;
  
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [suspiciousLogins, setSuspiciousLogins] = useState<LoginEntry[]>([]);
  const [failedLogins, setFailedLogins] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"recent" | "suspicious" | "failed">("recent");

  const fetchLoginHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/login-history");
      const data = await response.json();
      
      if (data.success) {
        setLoginHistory(data.data.loginHistory || []);
        setSuspiciousLogins(data.data.suspiciousLogins || []);
        setFailedLogins(data.data.failedLogins || []);
      }
    } catch (err) {
      console.error("Error fetching login history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchLoginHistory();
    }
  }, [session, fetchLoginHistory]);

  const parseUserAgent = (ua: string) => {
    if (ua.includes("Google OAuth")) return { device: "OAuth", browser: "Google" };
    
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[0] || "Unknown";
    const os = ua.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[0] || "Unknown";
    
    return {
      device: isMobile ? "Mobile" : "Desktop",
      browser: `${browser} on ${os}`,
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : language === "en" ? "en-US" : "fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const getDeviceIcon = (ua: string) => {
    if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
      return <Smartphone className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  };

  const getActiveData = () => {
    switch (activeTab) {
      case "suspicious":
        return suspiciousLogins;
      case "failed":
        return failedLogins;
      default:
        return loginHistory;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
          <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t.title}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Security Tip */}
      {suspiciousLogins.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
              {t.securityTip}
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {t.securityTipText}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("recent")}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "recent"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <Clock className="w-4 h-4" />
            {t.recentLogins}
          </button>
          <button
            onClick={() => setActiveTab("suspicious")}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "suspicious"
                ? "border-yellow-600 text-yellow-600 dark:border-yellow-400 dark:text-yellow-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {t.suspiciousActivity}
            {suspiciousLogins.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full dark:bg-yellow-900 dark:text-yellow-300">
                {suspiciousLogins.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("failed")}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "failed"
                ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <X className="w-4 h-4" />
            {t.failedAttempts}
            {failedLogins.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full dark:bg-red-900 dark:text-red-300">
                {failedLogins.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Login List */}
      {getActiveData().length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t.noData}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.date}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.device}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.ip}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.method}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.status}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {getActiveData().map((entry) => {
                  const { device, browser } = parseUserAgent(entry.userAgent);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">
                            {getDeviceIcon(entry.userAgent)}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {browser}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.ipAddress}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.loginMethod === "google" ? t.google : t.credentials}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.success ? (
                          entry.isSuspicious ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full dark:bg-yellow-900 dark:text-yellow-300">
                              <AlertTriangle className="w-3 h-3" />
                              {t.suspicious}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full dark:bg-green-900 dark:text-green-300">
                              <Check className="w-3 h-3" />
                              {t.successful}
                            </span>
                          )
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full dark:bg-red-900 dark:text-red-300">
                              <X className="w-3 h-3" />
                              {t.failed}
                            </span>
                            {entry.failureReason && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {entry.failureReason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
