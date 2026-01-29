"use client";

import { useState } from "react";
import { useCookieConsent, CookiePreferences } from "@/contexts/CookieConsentContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { FiX, FiSettings, FiCheck, FiShield, FiInfo } from "react-icons/fi";

interface CookieToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
}

function CookieToggle({ label, description, checked, onChange, disabled, required }: CookieToggleProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
          {required && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              Requis
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked 
            ? "bg-violet-600" 
            : "bg-gray-300 dark:bg-gray-600"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? "translate-x-6" : ""
          }`}
        />
      </button>
    </div>
  );
}

export function CookieConsentBanner() {
  const { 
    showBanner, 
    acceptAll, 
    rejectAll, 
    customizePreferences,
    preferences,
    isLoading 
  } = useCookieConsent();
  const { language } = useLanguage();
  
  const [showDetails, setShowDetails] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<CookiePreferences>({
    necessary: true,
    functional: preferences.functional,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
  });

  const translations = {
    fr: {
      title: "Nous respectons votre vie privée",
      description: "Nous utilisons des cookies pour améliorer votre expérience, analyser notre trafic et personnaliser le contenu. Vous pouvez choisir les cookies que vous souhaitez accepter.",
      acceptAll: "Accepter tout",
      rejectAll: "Refuser tout",
      customize: "Personnaliser",
      savePreferences: "Sauvegarder mes préférences",
      necessary: "Cookies essentiels",
      necessaryDesc: "Ces cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés.",
      functional: "Cookies fonctionnels",
      functionalDesc: "Ces cookies permettent d'améliorer les fonctionnalités du site (langue, thème, préférences).",
      analytics: "Cookies analytiques",
      analyticsDesc: "Ces cookies nous aident à comprendre comment les visiteurs interagissent avec le site.",
      marketing: "Cookies marketing",
      marketingDesc: "Ces cookies sont utilisés pour vous proposer des publicités pertinentes.",
      moreInfo: "En savoir plus",
      privacyPolicy: "Politique de confidentialité",
    },
    en: {
      title: "We respect your privacy",
      description: "We use cookies to improve your experience, analyze our traffic and personalize content. You can choose which cookies you want to accept.",
      acceptAll: "Accept all",
      rejectAll: "Reject all",
      customize: "Customize",
      savePreferences: "Save my preferences",
      necessary: "Essential cookies",
      necessaryDesc: "These cookies are necessary for the site to function and cannot be disabled.",
      functional: "Functional cookies",
      functionalDesc: "These cookies improve site functionality (language, theme, preferences).",
      analytics: "Analytics cookies",
      analyticsDesc: "These cookies help us understand how visitors interact with the site.",
      marketing: "Marketing cookies",
      marketingDesc: "These cookies are used to show you relevant advertisements.",
      moreInfo: "Learn more",
      privacyPolicy: "Privacy Policy",
    },
    ar: {
      title: "نحن نحترم خصوصيتك",
      description: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل حركة المرور وتخصيص المحتوى. يمكنك اختيار ملفات تعريف الارتباط التي ترغب في قبولها.",
      acceptAll: "قبول الكل",
      rejectAll: "رفض الكل",
      customize: "تخصيص",
      savePreferences: "حفظ تفضيلاتي",
      necessary: "ملفات تعريف الارتباط الأساسية",
      necessaryDesc: "هذه الملفات ضرورية لعمل الموقع ولا يمكن تعطيلها.",
      functional: "ملفات تعريف الارتباط الوظيفية",
      functionalDesc: "تحسن هذه الملفات وظائف الموقع (اللغة، السمة، التفضيلات).",
      analytics: "ملفات تعريف الارتباط التحليلية",
      analyticsDesc: "تساعدنا هذه الملفات على فهم كيفية تفاعل الزوار مع الموقع.",
      marketing: "ملفات تعريف الارتباط التسويقية",
      marketingDesc: "تُستخدم هذه الملفات لعرض إعلانات ذات صلة لك.",
      moreInfo: "اعرف المزيد",
      privacyPolicy: "سياسة الخصوصية",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  if (isLoading || !showBanner) return null;

  const handleSavePreferences = async () => {
    await customizePreferences(localPrefs);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" />
      
      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiShield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {t.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {t.description}
                </p>
              </div>
            </div>
          </div>

          {/* Cookie Details (Expandable) */}
          {showDetails && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
              <CookieToggle
                label={t.necessary}
                description={t.necessaryDesc}
                checked={true}
                onChange={() => {}}
                disabled
                required
              />
              <CookieToggle
                label={t.functional}
                description={t.functionalDesc}
                checked={localPrefs.functional}
                onChange={(checked) => setLocalPrefs(prev => ({ ...prev, functional: checked }))}
              />
              <CookieToggle
                label={t.analytics}
                description={t.analyticsDesc}
                checked={localPrefs.analytics}
                onChange={(checked) => setLocalPrefs(prev => ({ ...prev, analytics: checked }))}
              />
              <CookieToggle
                label={t.marketing}
                description={t.marketingDesc}
                checked={localPrefs.marketing}
                onChange={(checked) => setLocalPrefs(prev => ({ ...prev, marketing: checked }))}
              />
            </div>
          )}

          {/* Actions */}
          <div className="p-6 pt-4 flex flex-col sm:flex-row items-center gap-3">
            {!showDetails ? (
              <>
                <button
                  onClick={rejectAll}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t.rejectAll}
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className="w-full sm:w-auto px-6 py-3 text-violet-600 dark:text-violet-400 font-medium rounded-xl border border-violet-300 dark:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <FiSettings className="w-4 h-4" />
                  {t.customize}
                </button>
                <button
                  onClick={acceptAll}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
                >
                  <FiCheck className="w-4 h-4" />
                  {t.acceptAll}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full sm:w-auto px-6 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
                >
                  <FiCheck className="w-4 h-4" />
                  {t.savePreferences}
                </button>
              </>
            )}
          </div>

          {/* Privacy Policy Link */}
          <div className="px-6 pb-4 text-center">
            <a
              href="/privacy-policy"
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
            >
              <FiInfo className="w-4 h-4" />
              {t.privacyPolicy}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
