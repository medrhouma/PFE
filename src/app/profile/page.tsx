"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, MapPin, Calendar, Edit3, Save, X,
  Shield, Camera, Check, AlertCircle, Clock, Briefcase,
  CreditCard, Users, UserCheck, Settings, ArrowLeft, ChevronRight,
  TrendingUp, Activity, CheckCircle, FileText, Lock, Eye, EyeOff
} from "lucide-react";
import { getSafeImageSrc } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types ─────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  image?: string;
  sexe?: string;
  telephone?: string;
  adresse?: string;
  rib?: string;
  dateEmbauche?: string;
  typeContrat?: string;
  role: { name: string; description?: string };
  roleEnum?: string;
  isActive: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
  authMethod?: string;
  providers?: string[];
  emailVerified?: string;
  employee?: any;
}

interface AttendanceQuick {
  totalWorkedDays: number;
  expectedWorkDays: number;
  attendanceRate: number;
  totalLateMinutes: number;
  punctualityRate: number;
}

// ─── Helpers ───────────────────────────────────────────

function getRoleBadgeColor(role: string) {
  switch (role?.toUpperCase()) {
    case "SUPER_ADMIN": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "ADMIN": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    case "RH": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
  }
}

function getStatusBadge(st: string | undefined, isActive: boolean, t: (k: string) => string) {
  const status = st?.toUpperCase();
  if (status === "ACTIVE" || isActive) return { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: t("active"), dot: "bg-green-500" };
  if (status === "PENDING") return { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: t("pending"), dot: "bg-yellow-500" };
  return { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: t("inactive"), dot: "bg-red-500" };
}

function formatContractType(type?: string) {
  switch (type) {
    case "CDI": return "CDI - Contrat à durée indéterminée";
    case "CDD": return "CDD - Contrat à durée déterminée";
    case "STAGE": return "Stage";
    case "ALTERNANCE": return "Alternance";
    case "FREELANCE": return "Freelance";
    default: return type || "-";
  }
}

// ─── Component ─────────────────────────────────────────

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "security" | "activity">("info");
  const [attendanceQuick, setAttendanceQuick] = useState<AttendanceQuick | null>(null);
  const [showRib, setShowRib] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    lastName: "",
    telephone: "",
    adresse: "",
    sexe: ""
  });

  const userRole = session?.user?.role?.toUpperCase() || "USER";
  const isRH = userRole === "RH" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setEditForm({
          name: data.name || "",
          lastName: data.lastName || "",
          telephone: data.telephone || "",
          adresse: data.adresse || "",
          sexe: data.sexe || ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAttendanceQuick = useCallback(async () => {
    try {
      const now = new Date();
      const params = new URLSearchParams({ year: String(now.getFullYear()), month: String(now.getMonth() + 1) });
      const res = await fetch(`/api/attendance/summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceQuick({
          totalWorkedDays: data.summary.totalWorkedDays,
          expectedWorkDays: data.summary.expectedWorkDays,
          attendanceRate: data.summary.attendanceRate,
          totalLateMinutes: data.summary.totalLateMinutes,
          punctualityRate: data.summary.punctualityRate,
        });
      }
    } catch {
      // Attendance data is optional
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchUserProfile();
      fetchAttendanceQuick();
    }
  }, [status, router, fetchUserProfile, fetchAttendanceQuick]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        showMessage("success", "Profil mis à jour avec succès");
        setIsEditing(false);
        fetchUserProfile();
      } else {
        const data = await response.json();
        showMessage("error", data.error || "Erreur lors de la mise à jour");
      }
    } catch {
      showMessage("error", "Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "La photo ne doit pas dépasser 5 Mo");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const response = await fetch("/api/users/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 })
        });
        if (response.ok) {
          showMessage("success", "Photo mise à jour avec succès");
          fetchUserProfile();
        } else {
          showMessage("error", "Erreur lors de la mise à jour de la photo");
        }
      } catch {
        showMessage("error", "Erreur de connexion");
      }
    };
    reader.readAsDataURL(file);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ─── Loading ────────────────────────────────────

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const statusBadge = getStatusBadge(user?.status, user?.isActive || false, t);

  // ─── Render ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("my_profile")}</h1>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Edit3 className="w-4 h-4" />
              {t("edit")}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setIsEditing(false); if (user) setEditForm({ name: user.name || "", lastName: user.lastName || "", telephone: user.telephone || "", adresse: user.adresse || "", sexe: user.sexe || "" }); }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
                <X className="w-4 h-4" />
                {t("cancel")}
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {t("save")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Message Alert */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}>
            {message.type === "success" ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Profile Hero Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Cover Gradient */}
          <div className="h-36 bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 relative">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-5 -mt-16 relative">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                {getSafeImageSrc(user?.image) ? (
                  <img
                    src={getSafeImageSrc(user?.image)!}
                    alt="Photo de profil"
                    className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-4 border-white dark:border-gray-800 object-cover shadow-lg"
                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
                  />
                ) : null}
                <div className={`w-28 h-28 md:w-32 md:h-32 rounded-2xl border-4 border-white dark:border-gray-800 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg ${getSafeImageSrc(user?.image) ? "hidden" : ""}`}>
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 p-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-105 border border-gray-200 dark:border-gray-600">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 pt-2 md:pt-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.name} {user?.lastName}
                  </h2>
                  <span className={`px-3 py-0.5 text-xs font-semibold rounded-full border ${getRoleBadgeColor(user?.role?.name || "")}`}>
                    {user?.role?.name || "USER"}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-medium rounded-full ${statusBadge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
                {user?.employee?.position && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 font-medium">{user.employee.position}{user.employee.department ? ` — ${user.employee.department}` : ""}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Membre depuis {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
                </p>
              </div>

              {/* Quick Stats (desktop) */}
              {attendanceQuick && (
                <div className="hidden lg:flex items-start gap-3 pt-4">
                  <QuickStat
                    icon={<CheckCircle className="w-4 h-4 text-green-500" />}
                    label="Présence"
                    value={`${attendanceQuick.attendanceRate}%`}
                    trend={attendanceQuick.attendanceRate >= 90 ? "green" : attendanceQuick.attendanceRate >= 75 ? "yellow" : "red"}
                  />
                  <QuickStat
                    icon={<Clock className="w-4 h-4 text-blue-500" />}
                    label="Ponctualité"
                    value={`${attendanceQuick.punctualityRate}%`}
                    trend={attendanceQuick.punctualityRate >= 90 ? "green" : attendanceQuick.punctualityRate >= 75 ? "yellow" : "red"}
                  />
                  <QuickStat
                    icon={<TrendingUp className="w-4 h-4 text-violet-500" />}
                    label="Jours"
                    value={`${attendanceQuick.totalWorkedDays}/${attendanceQuick.expectedWorkDays}`}
                    trend="blue"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Quick Stats */}
        {attendanceQuick && (
          <div className="grid grid-cols-3 gap-3 lg:hidden">
            <QuickStat
              icon={<CheckCircle className="w-4 h-4 text-green-500" />}
              label="Présence"
              value={`${attendanceQuick.attendanceRate}%`}
              trend={attendanceQuick.attendanceRate >= 90 ? "green" : attendanceQuick.attendanceRate >= 75 ? "yellow" : "red"}
            />
            <QuickStat
              icon={<Clock className="w-4 h-4 text-blue-500" />}
              label="Ponctualité"
              value={`${attendanceQuick.punctualityRate}%`}
              trend={attendanceQuick.punctualityRate >= 90 ? "green" : attendanceQuick.punctualityRate >= 75 ? "yellow" : "red"}
            />
            <QuickStat
              icon={<TrendingUp className="w-4 h-4 text-violet-500" />}
              label="Jours"
              value={`${attendanceQuick.totalWorkedDays}/${attendanceQuick.expectedWorkDays}`}
              trend="blue"
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
          {([
            { key: "info", label: language === "en" ? "Information" : "Informations", icon: <User className="w-4 h-4" /> },
            { key: "security", label: t("security"), icon: <Shield className="w-4 h-4" /> },
            { key: "activity", label: language === "en" ? "Activity" : "Activité", icon: <Activity className="w-4 h-4" /> },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ Info Tab ═══ */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                {language === "en" ? "Personal Information" : "Informations Personnelles"}
              </h3>

              <div className="space-y-4">
                <InfoField label={t("first_name")} icon={<User className="w-3.5 h-3.5" />}>
                  {isEditing ? (
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors truncate" />
                  ) : (
                    <span className="text-gray-900 dark:text-white text-sm block truncate">{user?.name || "-"}</span>
                  )}
                </InfoField>

                <InfoField label={t("last_name")} icon={<User className="w-3.5 h-3.5" />}>
                  {isEditing ? (
                    <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors truncate" />
                  ) : (
                    <span className="text-gray-900 dark:text-white text-sm block truncate">{user?.lastName || "-"}</span>
                  )}
                </InfoField>

                <InfoField label={t("email")} icon={<Mail className="w-3.5 h-3.5" />}>
                  <span className="text-gray-900 dark:text-white text-sm block truncate">{user?.email}</span>
                </InfoField>

                <InfoField label={t("phone")} icon={<Phone className="w-3.5 h-3.5" />}>
                  {isEditing ? (
                    <input type="tel" value={editForm.telephone} onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" placeholder="+216 XX XXX XXX" />
                  ) : (
                    <span className="text-gray-900 dark:text-white text-sm block truncate">{user?.telephone || "-"}</span>
                  )}
                </InfoField>

                <InfoField label={t("address")} icon={<MapPin className="w-3.5 h-3.5" />}>
                  {isEditing ? (
                    <textarea value={editForm.adresse} onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none" placeholder={language === "en" ? "Your full address" : "Votre adresse complète"} />
                  ) : (
                    <span className="text-gray-900 dark:text-white text-sm block truncate">{user?.adresse || "-"}</span>
                  )}
                </InfoField>

                <InfoField label={t("gender")} icon={<Users className="w-3.5 h-3.5" />}>
                  {isEditing ? (
                    <select value={editForm.sexe} onChange={(e) => setEditForm({ ...editForm, sexe: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
                      <option value="">{t("select")}</option>
                      <option value="HOMME">{t("male")}</option>
                      <option value="FEMME">{t("female")}</option>
                    </select>
                  ) : (
                    <span className="text-gray-900 dark:text-white text-sm">{user?.sexe === "HOMME" ? t("male") : user?.sexe === "FEMME" ? t("female") : "-"}</span>
                  )}
                </InfoField>
              </div>
            </div>

            {/* Professional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
                {language === "en" ? "Professional Information" : "Informations Professionnelles"}
              </h3>

              <div className="space-y-4">
                <InfoField label={t("role")} icon={<Shield className="w-3.5 h-3.5" />}>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeColor(user?.role?.name || "")}`}>
                    {user?.role?.name || "USER"}
                  </span>
                </InfoField>

                <InfoField label={t("contract_type")} icon={<FileText className="w-3.5 h-3.5" />}>
                  <span className="text-gray-900 dark:text-white text-sm">{formatContractType(user?.typeContrat)}</span>
                </InfoField>

                <InfoField label={t("hire_date")} icon={<Calendar className="w-3.5 h-3.5" />}>
                  <span className="text-gray-900 dark:text-white text-sm">
                    {user?.dateEmbauche ? new Date(user.dateEmbauche).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
                  </span>
                </InfoField>

                {(isRH || user?.rib) && (
                  <InfoField label={language === "en" ? "Bank RIB" : "RIB bancaire"} icon={<CreditCard className="w-3.5 h-3.5" />}>
                    {user?.rib ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white text-sm font-mono">
                          {showRib ? user.rib : `${user.rib.substring(0, 4)} **** **** ${user.rib.substring(Math.max(0, user.rib.length - 4))}`}
                        </span>
                        <button onClick={() => setShowRib(!showRib)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                          {showRib ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </InfoField>
                )}

                {/* Employee Record Section */}
                {user?.employee && (
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      Dossier Employé
                    </h4>
                    <div className="space-y-2.5">
                      <InfoRow label="Position" value={user.employee.position || "-"} />
                      <InfoRow label="Département" value={user.employee.department || "-"} />
                      <InfoRow label="Statut dossier">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          user.employee.status === "APPROUVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          user.employee.status === "EN_ATTENTE" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {user.employee.status === "APPROUVE" ? "Approuvé" : user.employee.status === "EN_ATTENTE" ? "En attente" : user.employee.status}
                        </span>
                      </InfoRow>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Security Tab ═══ */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                Sécurité du compte
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Méthode de connexion</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Comment vous accédez à votre compte</p>
                  </div>
                  <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg">
                    {user?.authMethod === "credentials" ? "Email / Mot de passe" : "Google OAuth"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Statut du compte</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">État actuel de votre compte</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${statusBadge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    {statusBadge.label}
                  </span>
                </div>

                {user?.providers && user.providers.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Fournisseurs liés</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Services connectés à votre compte</p>
                    </div>
                    <div className="flex gap-1.5">
                      {user.providers.map((p) => (
                        <span key={p} className="px-2.5 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg capitalize">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Settings className="w-4 h-4 text-orange-600" />
                </div>
                Actions rapides
              </h3>

              <div className="space-y-2">
                <QuickAction
                  icon={<Lock className="w-4 h-4" />}
                  title="Changer le mot de passe"
                  description="Modifiez votre mot de passe actuel"
                  onClick={() => router.push("/settings?tab=security")}
                />
                <QuickAction
                  icon={<Shield className="w-4 h-4" />}
                  title="Authentification à deux facteurs"
                  description="Renforcez la sécurité de votre compte"
                  onClick={() => router.push("/settings?tab=security")}
                />
                <QuickAction
                  icon={<Settings className="w-4 h-4" />}
                  title="Paramètres du compte"
                  description="Thème, langue et notifications"
                  onClick={() => router.push("/settings")}
                />
                {isRH && (
                  <QuickAction
                    icon={<Users className="w-4 h-4" />}
                    title="Gestion des utilisateurs"
                    description="Gérer les employés et les accès"
                    onClick={() => router.push("/parametres/users")}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Activity Tab ═══ */}
        {activeTab === "activity" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  Pointage du mois
                </h3>
                <button onClick={() => router.push("/pointage/resume")} className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium flex items-center gap-1">
                  Voir détails <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {attendanceQuick ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Taux de présence</span>
                    <span className={`text-sm font-bold ${attendanceQuick.attendanceRate >= 90 ? "text-green-600" : attendanceQuick.attendanceRate >= 75 ? "text-yellow-600" : "text-red-600"}`}>
                      {attendanceQuick.attendanceRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${attendanceQuick.attendanceRate >= 90 ? "bg-green-500" : attendanceQuick.attendanceRate >= 75 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, attendanceQuick.attendanceRate)}%` }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Taux de ponctualité</span>
                    <span className={`text-sm font-bold ${attendanceQuick.punctualityRate >= 90 ? "text-green-600" : attendanceQuick.punctualityRate >= 75 ? "text-yellow-600" : "text-red-600"}`}>
                      {attendanceQuick.punctualityRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${attendanceQuick.punctualityRate >= 90 ? "bg-green-500" : attendanceQuick.punctualityRate >= 75 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, attendanceQuick.punctualityRate)}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl text-center">
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">{attendanceQuick.totalWorkedDays}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Jours travaillés</p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl text-center">
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
                        {attendanceQuick.totalLateMinutes > 60
                          ? `${Math.floor(attendanceQuick.totalLateMinutes / 60)}h${(attendanceQuick.totalLateMinutes % 60).toString().padStart(2, "0")}`
                          : `${attendanceQuick.totalLateMinutes}min`}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-500">Retards total</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée de pointage disponible</p>
                </div>
              )}
            </div>

            {/* Account Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                Chronologie du compte
              </h3>

              <div className="space-y-0">
                <TimelineItem
                  date={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                  title="Création du compte"
                  description="Inscription sur la plateforme"
                  color="violet"
                  isFirst
                />
                {user?.emailVerified && (
                  <TimelineItem
                    date={new Date(user.emailVerified).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" })}
                    title="Email vérifié"
                    description="Adresse email confirmée"
                    color="green"
                  />
                )}
                {user?.dateEmbauche && (
                  <TimelineItem
                    date={new Date(user.dateEmbauche).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" })}
                    title="Date d&apos;embauche"
                    description={formatContractType(user.typeContrat)}
                    color="blue"
                  />
                )}
                <TimelineItem
                  date={user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                  title="Dernière modification"
                  description="Mise à jour du profil"
                  color="gray"
                  isLast
                />
              </div>

              {/* Navigate to full activity */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => router.push("/pointage/resume")} className="flex items-center gap-2 px-3 py-2 text-xs bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium rounded-lg transition-colors">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Résumé de pointage
                  </button>
                  <button onClick={() => router.push("/settings?tab=login-history")} className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-lg transition-colors">
                    <Clock className="w-3.5 h-3.5" />
                    Historique de connexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role-Specific Access Panel */}
        {isRH && (
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 rounded-2xl border border-violet-200 dark:border-violet-800/30 p-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              Accès {userRole}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Fonctionnalités disponibles pour votre rôle</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <QuickAction icon={<Users className="w-4 h-4" />} title="Gestion RH" description="" mini onClick={() => router.push("/rh")} />
              <QuickAction icon={<UserCheck className="w-4 h-4" />} title="Profils" description="" mini onClick={() => router.push("/rh/profiles")} />
              {userRole === "SUPER_ADMIN" && (
                <>
                  <QuickAction icon={<Shield className="w-4 h-4" />} title="Rôles" description="" mini onClick={() => router.push("/parametres/roles")} />
                  <QuickAction icon={<Settings className="w-4 h-4" />} title="Utilisateurs" description="" mini onClick={() => router.push("/parametres/users")} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────

function InfoField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      {children || <span className="text-sm text-gray-900 dark:text-white font-medium">{value}</span>}
    </div>
  );
}

function QuickStat({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  const trendColors: Record<string, string> = {
    green: "border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10",
    yellow: "border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/50 dark:bg-yellow-900/10",
    red: "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10",
    blue: "border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10",
  };

  return (
    <div className={`rounded-xl border p-3 text-center min-w-[80px] ${trendColors[trend] || trendColors.blue}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function QuickAction({ icon, title, description, onClick, mini }: { icon: React.ReactNode; title: string; description: string; onClick: () => void; mini?: boolean }) {
  if (mini) {
    return (
      <button onClick={onClick} className="flex items-center gap-2 p-3 bg-white/70 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors text-left border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
        <span className="text-violet-500">{icon}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
      </button>
    );
  }

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left group">
      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 group-hover:text-violet-500 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
    </button>
  );
}

function TimelineItem({ date, title, description, color, isFirst, isLast }: { date: string; title: string; description: string; color: string; isFirst?: boolean; isLast?: boolean }) {
  const dotColors: Record<string, string> = {
    violet: "bg-violet-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    gray: "bg-gray-400 dark:bg-gray-500",
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColors[color] || dotColors.gray} ${isFirst ? "mt-1" : "mt-1"} ring-4 ring-white dark:ring-gray-800 flex-shrink-0`} />
        {!isLast && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />}
      </div>
      <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{date}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
