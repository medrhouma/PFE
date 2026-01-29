"use client";

import { useState, useEffect } from "react";
import { useCookieConsent, CookiePreferences } from "@/contexts/CookieConsentContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { FiX, FiCheck, FiShield, FiActivity, FiTarget, FiSettings } from "react-icons/fi";

interface CookieCategory {
  id: keyof Omit<CookiePreferences, "necessary">;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
  required?: boolean;
}

export function CookieSettingsModal() {
  const { 
    showSettingsModal, 
    closeSettings, 
    preferences, 
    customizePreferences 
  } = useCookieConsent();
  const { language } = useLanguage();

  const [localPrefs, setLocalPrefs] = useState<CookiePreferences>({
    necessary: true,
    functional: preferences.functional,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
  });

  // Update local prefs when preferences change
  useEffect(() => {
    setLocalPrefs({
      necessary: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
  }, [preferences]);

  const translations = {
    fr: {
      title: "Paramètres des cookies",
      subtitle: "Gérez vos préférences de cookies",
      save: "Sauvegarder",
      cancel: "Annuler",
      acceptAll: "Tout accepter",
      rejectAll: "Tout refuser",
      necessary: "Cookies essentiels",
      necessaryDesc: "Ces cookies sont indispensables au fonctionnement du site. Ils permettent d'assurer la sécurité, la navigation et l'accès aux fonctionnalités de base. Ils ne peuvent pas être désactivés.",
      functional: "Cookies fonctionnels",
      functionalDesc: "Ces cookies permettent d'améliorer votre expérience en mémorisant vos préférences (langue, thème, taille de police) et en personnalisant le contenu du site.",
      analytics: "Cookies analytiques",
      analyticsDesc: "Ces cookies nous aident à comprendre comment vous utilisez le site, quelles pages sont les plus populaires et comment améliorer nos services. Les données sont anonymisées.",
      marketing: "Cookies marketing",
      marketingDesc: "Ces cookies sont utilisés pour vous présenter des publicités personnalisées en fonction de vos centres d'intérêt sur notre site et d'autres sites.",
      required: "Requis",
    },
    en: {
      title: "Cookie Settings",
      subtitle: "Manage your cookie preferences",
      save: "Save",
      cancel: "Cancel",
      acceptAll: "Accept all",
      rejectAll: "Reject all",
      necessary: "Essential Cookies",
      necessaryDesc: "These cookies are essential for the site to function. They ensure security, navigation and access to basic features. They cannot be disabled.",
      functional: "Functional Cookies",
      functionalDesc: "These cookies improve your experience by remembering your preferences (language, theme, font size) and personalizing site content.",
      analytics: "Analytics Cookies",
      analyticsDesc: "These cookies help us understand how you use the site, which pages are most popular and how to improve our services. Data is anonymized.",
      marketing: "Marketing Cookies",
      marketingDesc: "These cookies are used to show you personalized ads based on your interests on our site and other sites.",
      required: "Required",
    },
    ar: {
      title: "إعدادات ملفات تعريف الارتباط",
      subtitle: "إدارة تفضيلات ملفات تعريف الارتباط الخاصة بك",
      save: "حفظ",
      cancel: "إلغاء",
      acceptAll: "قبول الكل",
      rejectAll: "رفض الكل",
      necessary: "ملفات تعريف الارتباط الأساسية",
      necessaryDesc: "هذه الملفات ضرورية لعمل الموقع. تضمن الأمان والتنقل والوصول إلى الميزات الأساسية. لا يمكن تعطيلها.",
      functional: "ملفات تعريف الارتباط الوظيفية",
      functionalDesc: "تحسن هذه الملفات تجربتك من خلال تذكر تفضيلاتك (اللغة، السمة، حجم الخط) وتخصيص محتوى الموقع.",
      analytics: "ملفات تعريف الارتباط التحليلية",
      analyticsDesc: "تساعدنا هذه الملفات على فهم كيفية استخدامك للموقع والصفحات الأكثر شعبية وكيفية تحسين خدماتنا. البيانات مجهولة الهوية.",
      marketing: "ملفات تعريف الارتباط التسويقية",
      marketingDesc: "تُستخدم هذه الملفات لعرض إعلانات مخصصة بناءً على اهتماماتك على موقعنا والمواقع الأخرى.",
      required: "مطلوب",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  const categories: (CookieCategory & { labelKey: string; descKey: string })[] = [
    {
      id: "functional",
      icon: <FiSettings className="w-5 h-5" />,
      labelKey: "functional",
      descKey: "functionalDesc",
    },
    {
      id: "analytics",
      icon: <FiActivity className="w-5 h-5" />,
      labelKey: "analytics",
      descKey: "analyticsDesc",
    },
    {
      id: "marketing",
      icon: <FiTarget className="w-5 h-5" />,
      labelKey: "marketing",
      descKey: "marketingDesc",
    },
  ];

  const handleSave = async () => {
    await customizePreferences(localPrefs);
  };

  const handleAcceptAll = async () => {
    setLocalPrefs({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
    await customizePreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleRejectAll = async () => {
    setLocalPrefs({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
    await customizePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  if (!showSettingsModal) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={closeSettings}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FiShield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={closeSettings}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Essential Cookies (Always enabled) */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FiShield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t.necessary}
                      </h3>
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                        {t.required}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t.necessaryDesc}
                    </p>
                  </div>
                </div>
                <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end pr-1">
                  <span className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>

            {/* Other Cookie Categories */}
            {categories.map((category) => (
              <div key={category.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      localPrefs[category.id] 
                        ? "bg-violet-100 dark:bg-violet-900/30" 
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}>
                      <span className={localPrefs[category.id] 
                        ? "text-violet-600 dark:text-violet-400" 
                        : "text-gray-500 dark:text-gray-400"
                      }>
                        {category.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t[category.labelKey as keyof typeof t]}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t[category.descKey as keyof typeof t]}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLocalPrefs(prev => ({
                      ...prev,
                      [category.id]: !prev[category.id],
                    }))}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      localPrefs[category.id] 
                        ? "bg-violet-600" 
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        localPrefs[category.id] ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRejectAll}
              className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t.rejectAll}
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2.5 text-violet-600 dark:text-violet-400 font-medium rounded-xl border border-violet-300 dark:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            >
              {t.acceptAll}
            </button>
            <div className="flex-1" />
            <button
              onClick={closeSettings}
              className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
            >
              <FiCheck className="w-4 h-4" />
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
