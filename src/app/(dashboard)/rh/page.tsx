"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Calendar,
  Star,
  UserCheck,
  Bell,
  ArrowLeft,
  Users,
} from "lucide-react";

const rhModules = [
  {
    href: "/rh/conges",
    labelKey: "leave_management",
    descKey: "rh_leave_desc",
    icon: <Calendar className="w-6 h-6" />,
    color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800/40",
  },
  {
    href: "/rh/jours-feries",
    labelKey: "public_holidays",
    descKey: "rh_holidays_desc",
    icon: <Star className="w-6 h-6" />,
    color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800/40",
  },
  {
    href: "/rh/profiles",
    labelKey: "profile_validation",
    descKey: "rh_profiles_desc",
    icon: <UserCheck className="w-6 h-6" />,
    color: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800/40",
  },
  {
    href: "/rh/notifications",
    labelKey: "notification_center",
    descKey: "rh_notifications_desc",
    icon: <Bell className="w-6 h-6" />,
    color: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800/40",
  },
];

const fallbackDescs: Record<string, Record<string, string>> = {
  fr: {
    rh_leave_desc: "Gérer les demandes de congés des employés",
    rh_holidays_desc: "Configurer les jours fériés nationaux et religieux",
    rh_profiles_desc: "Valider les profils des nouveaux employés",
    rh_notifications_desc: "Consulter les alertes et notifications RH",
  },
  en: {
    rh_leave_desc: "Manage employee leave requests",
    rh_holidays_desc: "Configure national and religious holidays",
    rh_profiles_desc: "Validate new employee profiles",
    rh_notifications_desc: "View HR alerts and notifications",
  },
};

export default function RHIndexPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const desc = (key: string) =>
    t(key) !== key ? t(key) : (fallbackDescs[language]?.[key] ?? fallbackDescs.fr[key] ?? key);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-600" />
            {t("hr")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("rh_page_subtitle")}
          </p>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rhModules.map((mod) => (
          <button
            key={mod.href}
            onClick={() => router.push(mod.href)}
            className={`flex items-start gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border ${mod.border} hover:shadow-md transition-all text-left group`}
          >
            <div className={`p-3 rounded-xl ${mod.color}`}>{mod.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {t(mod.labelKey)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {desc(mod.descKey)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
