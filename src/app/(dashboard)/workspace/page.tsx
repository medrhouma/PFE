"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Bot, Construction } from "lucide-react";

export default function WorkspacePage() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="text-center max-w-lg">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-8">
          <Bot className="h-12 w-12 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t("workspace")}
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {t("workspace_module_desc")}
        </p>

        <div className="inline-flex items-center gap-3 px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
          <Construction className="w-6 h-6 text-amber-500 shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {t("under_development")}
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/60 mt-1">
              {t("workspace_dev_desc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
