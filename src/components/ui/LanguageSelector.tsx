"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: "fr", name: "French", nativeName: "Français", flag: "FR" },
  { code: "en", name: "English", nativeName: "English", flag: "EN" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "AR" },
];

interface LanguageSelectorProps {
  variant?: "dropdown" | "inline" | "compact";
  showLabel?: boolean;
}

/**
 * LanguageSelector Component
 * Allows users to switch between supported languages
 */
export function LanguageSelector({ 
  variant = "dropdown", 
  showLabel = true 
}: LanguageSelectorProps) {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  const handleSelect = async (lang: Language) => {
    await setLanguage(lang);
    setIsOpen(false);
  };

  // Compact variant (just flags)
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-colors
              ${language === lang.code 
                ? "bg-blue-600 text-white" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }
            `}
            title={lang.nativeName}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  }

  // Inline variant (horizontal buttons)
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        {showLabel && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("language")}:
          </span>
        )}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all
                ${language === lang.code 
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }
              `}
            >
              <span>{lang.flag}</span>
              <span className="hidden sm:inline">{lang.nativeName}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div 
      ref={dropdownRef} 
      className={`relative ${isRTL ? "text-right" : "text-left"}`}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm font-medium
          text-gray-700 dark:text-gray-300
          bg-gray-100 dark:bg-gray-800 
          hover:bg-gray-200 dark:hover:bg-gray-700
          rounded-lg transition-colors
          ${isRTL ? "flex-row-reverse" : ""}
        `}
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span>{currentLanguage.flag}</span>
        {showLabel && (
          <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`
            absolute z-50 mt-2 w-48 py-1
            bg-white dark:bg-gray-800 
            rounded-xl shadow-lg 
            border border-gray-200 dark:border-gray-700
            ${isRTL ? "left-0" : "right-0"}
          `}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 text-sm
                transition-colors
                ${language === lang.code 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }
                ${isRTL ? "flex-row-reverse text-right" : ""}
              `}
            >
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-base">{lang.flag}</span>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {lang.name}
                  </div>
                </div>
              </div>
              {language === lang.code && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
