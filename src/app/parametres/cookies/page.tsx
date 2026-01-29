/**
 * Cookie Settings Page
 * Accessible from footer and profile menu
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Cookie,
  Shield,
  BarChart3,
  Megaphone,
  Settings,
  Check,
  X,
  ChevronRight,
  ExternalLink,
  Clock,
  Info,
} from "lucide-react";

const translations = {
  fr: {
    title: "Paramètres des cookies",
    subtitle: "Gérez vos préférences de cookies",
    description: "Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez personnaliser vos préférences ci-dessous.",
    essential: {
      title: "Cookies essentiels",
      description: "Ces cookies sont nécessaires au fonctionnement du site. Ils ne peuvent pas être désactivés.",
      examples: "Authentification, sécurité, préférences de session",
    },
    functional: {
      title: "Cookies fonctionnels",
      description: "Ces cookies permettent d'améliorer les fonctionnalités et la personnalisation.",
      examples: "Préférences de langue, thème, paramètres d'affichage",
    },
    analytics: {
      title: "Cookies analytiques",
      description: "Ces cookies nous aident à comprendre comment vous utilisez notre site.",
      examples: "Statistiques de visite, performance des pages, rapports d'erreur",
    },
    marketing: {
      title: "Cookies marketing",
      description: "Ces cookies sont utilisés pour afficher des publicités pertinentes.",
      examples: "Publicités ciblées, suivi des conversions, remarketing",
    },
    savePreferences: "Enregistrer les préférences",
    acceptAll: "Tout accepter",
    rejectAll: "Tout refuser",
    lastUpdated: "Dernière mise à jour",
    privacyPolicy: "Politique de confidentialité",
    cookiePolicy: "Politique des cookies",
    moreInfo: "En savoir plus",
    required: "Requis",
    enabled: "Activé",
    disabled: "Désactivé",
    savedMessage: "Vos préférences ont été enregistrées",
    consentVersion: "Version du consentement",
  },
  en: {
    title: "Cookie Settings",
    subtitle: "Manage your cookie preferences",
    description: "We use cookies to enhance your experience. You can customize your preferences below.",
    essential: {
      title: "Essential Cookies",
      description: "These cookies are necessary for the website to function. They cannot be disabled.",
      examples: "Authentication, security, session preferences",
    },
    functional: {
      title: "Functional Cookies",
      description: "These cookies enable enhanced functionality and personalization.",
      examples: "Language preferences, theme, display settings",
    },
    analytics: {
      title: "Analytics Cookies",
      description: "These cookies help us understand how you use our website.",
      examples: "Visit statistics, page performance, error reports",
    },
    marketing: {
      title: "Marketing Cookies",
      description: "These cookies are used to display relevant advertisements.",
      examples: "Targeted ads, conversion tracking, remarketing",
    },
    savePreferences: "Save Preferences",
    acceptAll: "Accept All",
    rejectAll: "Reject All",
    lastUpdated: "Last updated",
    privacyPolicy: "Privacy Policy",
    cookiePolicy: "Cookie Policy",
    moreInfo: "Learn more",
    required: "Required",
    enabled: "Enabled",
    disabled: "Disabled",
    savedMessage: "Your preferences have been saved",
    consentVersion: "Consent version",
  },
  ar: {
    title: "إعدادات ملفات تعريف الارتباط",
    subtitle: "إدارة تفضيلات ملفات تعريف الارتباط",
    description: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك تخصيص تفضيلاتك أدناه.",
    essential: {
      title: "ملفات تعريف الارتباط الأساسية",
      description: "هذه الملفات ضرورية لعمل الموقع. لا يمكن تعطيلها.",
      examples: "المصادقة، الأمان، تفضيلات الجلسة",
    },
    functional: {
      title: "ملفات تعريف الارتباط الوظيفية",
      description: "تتيح هذه الملفات تحسين الوظائف والتخصيص.",
      examples: "تفضيلات اللغة، السمة، إعدادات العرض",
    },
    analytics: {
      title: "ملفات تعريف الارتباط التحليلية",
      description: "تساعدنا هذه الملفات على فهم كيفية استخدامك لموقعنا.",
      examples: "إحصائيات الزيارة، أداء الصفحات، تقارير الأخطاء",
    },
    marketing: {
      title: "ملفات تعريف الارتباط التسويقية",
      description: "تُستخدم هذه الملفات لعرض إعلانات ذات صلة.",
      examples: "الإعلانات المستهدفة، تتبع التحويلات، إعادة التسويق",
    },
    savePreferences: "حفظ التفضيلات",
    acceptAll: "قبول الكل",
    rejectAll: "رفض الكل",
    lastUpdated: "آخر تحديث",
    privacyPolicy: "سياسة الخصوصية",
    cookiePolicy: "سياسة ملفات تعريف الارتباط",
    moreInfo: "معرفة المزيد",
    required: "مطلوب",
    enabled: "مفعّل",
    disabled: "معطّل",
    savedMessage: "تم حفظ تفضيلاتك",
    consentVersion: "إصدار الموافقة",
  },
};

interface CookieCategory {
  id: "necessary" | "functional" | "analytics" | "marketing";
  icon: typeof Cookie;
  color: string;
  bgColor: string;
  required?: boolean;
}

const COOKIE_CATEGORIES: CookieCategory[] = [
  { id: "necessary", icon: Shield, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", required: true },
  { id: "functional", icon: Settings, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  { id: "analytics", icon: BarChart3, color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  { id: "marketing", icon: Megaphone, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
];

export default function CookieSettingsPage() {
  const { data: session } = useSession();
  const { language } = useLanguage();
  const { preferences, customizePreferences, acceptAll, rejectAll, consentVersion, lastUpdated } = useCookieConsent();
  
  const t = translations[language as keyof typeof translations] || translations.fr;
  
  const [localPreferences, setLocalPreferences] = useState({
    necessary: true,
    functional: preferences.functional,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalPreferences({
      necessary: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
  }, [preferences]);

  const handleToggle = (category: "functional" | "analytics" | "marketing") => {
    setLocalPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await customizePreferences({
        functional: localPreferences.functional,
        analytics: localPreferences.analytics,
        marketing: localPreferences.marketing,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAll = async () => {
    setSaving(true);
    try {
      await acceptAll();
      setLocalPreferences({
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectAll = async () => {
    setSaving(true);
    try {
      await rejectAll();
      setLocalPreferences({
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryTranslation = (categoryId: string) => {
    const key = categoryId === "necessary" ? "essential" : categoryId;
    return t[key as keyof typeof t] as { title: string; description: string; examples: string };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <Cookie className="h-8 w-8 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t.title}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success message */}
        {saved && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-green-700 dark:text-green-400 font-medium">
              {t.savedMessage}
            </span>
          </div>
        )}

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            {t.description}
          </p>
          
          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleAcceptAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {t.acceptAll}
            </button>
            <button
              onClick={handleRejectAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              {t.rejectAll}
            </button>
          </div>
        </div>

        {/* Cookie Categories */}
        <div className="space-y-4">
          {COOKIE_CATEGORIES.map((category) => {
            const categoryT = getCategoryTranslation(category.id);
            const Icon = category.icon;
            const isEnabled = localPreferences[category.id];
            
            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${category.bgColor}`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {categoryT.title}
                          </h3>
                          {category.required && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                              {t.required}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                          {categoryT.description}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Exemples:</span> {categoryT.examples}
                        </p>
                      </div>
                    </div>
                    
                    {/* Toggle */}
                    <div className="ml-4">
                      {category.required ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            {t.enabled}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggle(category.id as "functional" | "analytics" | "marketing")}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isEnabled ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {lastUpdated && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{t.lastUpdated}: {new Date(lastUpdated).toLocaleDateString(language)}</span>
              </div>
            )}
            {consentVersion && (
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>{t.consentVersion}: {consentVersion}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t.savePreferences}
          </button>
        </div>

        {/* Policy links */}
        <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">{t.moreInfo}</h4>
          <div className="flex flex-wrap gap-4">
            <a
              href="/privacy-policy"
              className="flex items-center gap-2 text-violet-600 hover:text-violet-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t.privacyPolicy}
            </a>
            <a
              href="/cookie-policy"
              className="flex items-center gap-2 text-violet-600 hover:text-violet-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t.cookiePolicy}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
