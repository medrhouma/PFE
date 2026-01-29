"use client";

import { useState } from "react";
import { useCookieConsent, CookiePreferences } from "@/contexts/CookieConsentContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  X, 
  Settings, 
  Check, 
  Shield, 
  Info, 
  Cookie, 
  BarChart3, 
  Megaphone,
  Sparkles,
  Lock
} from "lucide-react";

interface CookieToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  color?: string;
}

function CookieToggle({ label, description, checked, onChange, disabled, required, icon, color = "violet" }: CookieToggleProps) {
  const colorClasses = {
    violet: "from-violet-500 to-purple-500",
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-amber-500",
    gray: "from-gray-400 to-gray-500"
  };

  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 group hover:bg-gray-50/50 dark:hover:bg-gray-700/20 -mx-4 px-4 rounded-xl transition-colors">
      <div className="flex items-start gap-3 flex-1 pr-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.violet} flex items-center justify-center shadow-lg flex-shrink-0`}>
          {icon || <Cookie className="w-5 h-5 text-white" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{label}</span>
            {required && (
              <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-400 rounded-full font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Requis
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-14 h-7 rounded-full transition-all flex-shrink-0 ${
          checked 
            ? "bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-500/30" 
            : "bg-gray-300 dark:bg-gray-600"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-xl"}`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${
            checked ? "translate-x-7" : ""
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
      
      {/* Banner */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Header with Gradient */}
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 pb-8">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                <Cookie className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {t.title}
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </h2>
                <p className="text-violet-200 text-sm mt-1">
                  {t.description}
                </p>
              </div>
            </div>
          </div>

          {/* Cookie Details (Expandable) */}
          {showDetails && (
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
              <CookieToggle
                label={t.necessary}
                description={t.necessaryDesc}
                checked={true}
                onChange={() => {}}
                disabled
                required
                icon={<Shield className="w-5 h-5 text-white" />}
                color="gray"
              />
              <CookieToggle
                label={t.functional}
                description={t.functionalDesc}
                checked={localPrefs.functional}
                onChange={(checked) => setLocalPrefs(prev => ({ ...prev, functional: checked }))}
                icon={<Settings className="w-5 h-5 text-white" />}
                color="blue"
              />
              <CookieToggle
                label={t.analytics}
                description={t.analyticsDesc}
                checked={localPrefs.analytics}
                onChange={(checked) => setLocalPrefs(prev => ({ ...prev, analytics: checked }))}
                icon={<BarChart3 className="w-5 h-5 text-white" />}
                color="green"
              />
              <CookieToggle
                label={t.marketing}
                description={t.marketingDesc}
                checked={localPrefs.marketing}
                onChange={(checked) => setLocalPrefs(prev => ({ ...prev, marketing: checked }))}
                icon={<Megaphone className="w-5 h-5 text-white" />}
                color="orange"
              />
            </div>
          )}

          {/* Actions */}
          <div className="p-6 pt-4 flex flex-col gap-3">
            {!showDetails ? (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={acceptAll}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {t.acceptAll}
                  </button>
                  <button
                    onClick={rejectAll}
                    className="flex-1 px-6 py-3.5 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    {t.rejectAll}
                  </button>
                </div>
                <button
                  onClick={() => setShowDetails(true)}
                  className="w-full px-6 py-3 text-violet-600 dark:text-violet-400 font-semibold rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  {t.customize}
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-6 py-3.5 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {t.savePreferences}
                </button>
              </div>
            )}
          </div>

          {/* Privacy Policy Link */}
          <div className="px-6 pb-5 text-center">
            <a
              href="/privacy-policy"
              className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium inline-flex items-center gap-1.5 hover:underline"
            >
              <Info className="w-4 h-4" />
              {t.privacyPolicy}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
