"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, FileText, Users, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WelcomePage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timeout = setTimeout(() => {
      router.push("/home");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4">
      <div className="max-w-4xl w-full text-center">
        {/* Success Animation */}
        <div className="mb-8 animate-bounce">
          <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-5xl font-bold text-white mb-4 animate-fade-in">
          {t("welcome_title")}
        </h1>
        
        <p className="text-xl text-violet-100 mb-12">
          {t("welcome_subtitle")}
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t("attendance")}</h3>
            <p className="text-sm text-violet-100">
              {t("welcome_attendance")}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t("leaves")}</h3>
            <p className="text-sm text-violet-100">
              {t("welcome_leaves")}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t("profile")}</h3>
            <p className="text-sm text-violet-100">
              {t("welcome_profile")}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => router.push("/home")}
          className="group px-8 py-4 bg-white text-violet-600 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 inline-flex items-center gap-3"
        >
          {t("access_platform")}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Auto-redirect notice */}
        <p className="mt-8 text-sm text-violet-200">
          {t("auto_redirect")}
        </p>
      </div>
    </div>
  );
}
