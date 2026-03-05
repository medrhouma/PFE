"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User, Shield, Bell, Moon, Globe, Smartphone,
  Clock, Lock, Mail, Camera, Check, X, AlertCircle,
  Monitor, Sun, RefreshCw, Trash2, Key, Eye, EyeOff, Calendar,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { 
  getTrustedDevices, 
  removeTrustedDevice, 
  getBasicDeviceInfo,
  DeviceFingerprint 
} from "@/lib/services/device-fingerprint";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { getSafeImageSrc } from "@/lib/utils";

type SettingsTab = "general" | "security" | "notifications" | "appearance" | "devices";

interface SettingsSection {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

/**
 * Professional Settings Page
 * Role-based settings with modern UI
 */
export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const { language, setLanguage: setGlobalLanguage, t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || "general");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Settings state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [trustedDevices, setTrustedDevices] = useState<DeviceFingerprint[]>([]);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Photo upload ref
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [userImage, setUserImage] = useState<string | null>(null);

  const userRole = session?.user?.role?.toUpperCase() || "USER";

  const settingsSections: SettingsSection[] = [
    { id: "general", label: t("general"), icon: <User className="w-5 h-5" /> },
    { id: "security", label: t("security"), icon: <Shield className="w-5 h-5" /> },
    { id: "notifications", label: t("notifications"), icon: <Bell className="w-5 h-5" /> },
    { id: "appearance", label: t("appearance"), icon: <Moon className="w-5 h-5" /> },
    { id: "devices", label: t("devices"), icon: <Smartphone className="w-5 h-5" /> },
  ];

  // User profile data
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userUpdatedAt, setUserUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // Load saved theme from localStorage first (for immediate feedback)
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (savedTheme) setTheme(savedTheme);

    // Load trusted devices
    const devices = getTrustedDevices();
    setTrustedDevices(devices);
    
    // Set initial user image from session
    if (session?.user?.image) {
      setUserImage(session.user.image);
    }
    
    // Fetch user profile data (for dates)
    fetchUserProfile();
    
    // Fetch preferences from database
    fetchPreferences();
  }, [session]);
  
  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/users/me");
      if (response.ok) {
        const data = await response.json();
        setUserCreatedAt(data.createdAt);
        setUserUpdatedAt(data.updatedAt);
        if (data.image) {
          setUserImage(data.image);
        }
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    }
  };
  
  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/users/preferences");
      if (response.ok) {
        const prefs = await response.json();
        // Language is now handled by LanguageContext, so we only update notifications here
        setEmailNotifications(prefs.emailNotifications ?? true);
        setPushNotifications(prefs.pushNotifications ?? true);
        setSoundAlerts(prefs.soundAlerts ?? true);
        setTwoFactorEnabled(prefs.twoFactorEnabled ?? true);
        if (prefs.theme) {
          setTheme(prefs.theme);
          localStorage.setItem("theme", prefs.theme);
        }
      }
    } catch (e) {
      console.error("Error fetching preferences:", e);
    }
  };
  
  const savePreference = async (key: string, value: any) => {
    try {
      const response = await fetch("/api/users/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      if (!response.ok) {
        throw new Error("Failed to save preference");
      }
    } catch (e) {
      console.error("Error saving preference:", e);
    }
  };

  useEffect(() => {
    if (tabParam && settingsSections.some(s => s.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    const root = document.documentElement;
    if (newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Save to database
    savePreference("theme", newTheme);
    showMessage("success", t("theme_updated"));
  };
  
  const handleLanguageChange = async (newLanguage: string) => {
    await setGlobalLanguage(newLanguage as Language);
    setLanguageDropdownOpen(false);
    showMessage("success", `${t("language_changed")} ${newLanguage === "fr" ? "Français" : newLanguage === "en" ? "English" : "العربية"}`);
  };
  
  const handleNotificationToggle = async (type: "email" | "push" | "sound", value: boolean) => {
    switch (type) {
      case "email":
        setEmailNotifications(value);
        await savePreference("emailNotifications", value);
        break;
      case "push":
        setPushNotifications(value);
        await savePreference("pushNotifications", value);
        // Request browser notification permission if enabling
        if (value && "Notification" in window) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            showMessage("error", t("notification_permission_denied"));
            setPushNotifications(false);
            await savePreference("pushNotifications", false);
            return;
          }
        }
        break;
      case "sound":
        setSoundAlerts(value);
        await savePreference("soundAlerts", value);
        break;
    }
    showMessage("success", t("notification_pref_updated"));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage("error", t("select_valid_image"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", t("image_too_large"));
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const response = await fetch("/api/users/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 })
        });

        if (response.ok) {
          // Re-fetch user data to get the stored image URL
          const meRes = await fetch("/api/users/me");
          if (meRes.ok) {
            const meData = await meRes.json();
            setUserImage(meData.image || meData.employee?.photo || base64);
          } else {
            setUserImage(base64);
          }
          showMessage("success", t("photo_updated"));
        } else {
          const data = await response.json();
          showMessage("error", data.error || t("photo_update_error"));
        }
        setLoading(false);
      };
      reader.onerror = () => {
        showMessage("error", t("file_read_error"));
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showMessage("error", t("connection_error"));
      setLoading(false);
    }
  };

  const handleRemoveTrustedDevice = (deviceId: string) => {
    removeTrustedDevice(deviceId);
    setTrustedDevices(getTrustedDevices());
    showMessage("success", t("device_removed"));
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showMessage("error", t("passwords_dont_match"));
      return;
    }

    if (newPassword.length < 8) {
      showMessage("error", t("password_min_length"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        showMessage("success", t("password_changed"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        showMessage("error", data.error || t("password_change_error"));
      }
    } catch (error) {
      showMessage("error", t("connection_error"));
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("settings")}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t("manage_preferences")}
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === "success" 
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}>
            {message.type === "success" ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <nav className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2 space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeTab === section.id
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              
              {/* General Settings */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("general_settings")}</h2>
                  </div>

                  {/* Profile Info */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <input 
                      ref={photoInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload}
                    />
                    <div className="flex items-center gap-4">
                      {getSafeImageSrc(userImage || session?.user?.image) ? (
                        <img 
                          src={getSafeImageSrc(userImage || session?.user?.image)!} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold ${getSafeImageSrc(userImage || session?.user?.image) ? 'hidden' : ''}`}>
                        {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {session?.user?.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
                        <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                          {userRole}
                        </span>
                      </div>
                      <button 
                        onClick={() => photoInputRef.current?.click()}
                        disabled={loading}
                        className="ml-auto px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loading ? (
                          <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 inline mr-2" />
                        )}
                        {loading ? t("uploading") : t("change_photo")}
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  <div 
                    className="relative flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700"
                    onMouseEnter={() => setLanguageDropdownOpen(true)}
                    onMouseLeave={() => setLanguageDropdownOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t("language")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("choose_language")}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <span>{language === "fr" ? "🇫🇷 Français" : language === "en" ? "🇬🇧 English" : "🇸🇦 العربية"}</span>
                        <svg className={`w-4 h-4 transition-transform ${languageDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Language Dropdown */}
                      {languageDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          {[
                            { code: "fr", label: "Français", flag: "🇫🇷" },
                            { code: "en", label: "English", flag: "🇬🇧" },
                            { code: "ar", label: "العربية", flag: "🇸🇦" },
                          ].map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => handleLanguageChange(lang.code)}
                              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                language === lang.code ? "bg-violet-50 dark:bg-violet-900/20" : ""
                              }`}
                            >
                              <span className="text-xl">{lang.flag}</span>
                              <span className={`font-medium ${language === lang.code ? "text-violet-700 dark:text-violet-300" : "text-gray-700 dark:text-gray-300"}`}>
                                {lang.label}
                              </span>
                              {language === lang.code && (
                                <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timezone */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t("timezone")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("timezone_desc")}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </span>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("security")}</h2>
                  </div>

                  {/* Change Password */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      {t("change_password")}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t("current_password")}
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder={t("enter_current_password")}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t("new_password")}
                        </label>
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          placeholder={t("enter_new_password")}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t("confirm_password")}
                        </label>
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          placeholder={t("confirm_new_password")}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="showPasswords"
                          checked={showPasswords}
                          onChange={(e) => setShowPasswords(e.target.checked)}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <label htmlFor="showPasswords" className="text-sm text-gray-600 dark:text-gray-400">
                          {t("show_passwords")}
                        </label>
                      </div>
                      <button
                        onClick={handlePasswordChange}
                        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                        className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                        ) : null}
                        {t("update_password")}
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t("two_factor")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {twoFactorEnabled 
                            ? t("two_factor_desc_on") 
                            : t("two_factor_desc_off")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const newValue = !twoFactorEnabled;
                        setTwoFactorEnabled(newValue);
                        await savePreference("twoFactorEnabled", newValue);
                        showMessage("success", newValue 
                          ? t("two_factor_enabled") 
                          : t("two_factor_disabled"));
                      }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        twoFactorEnabled ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          twoFactorEnabled ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Login History */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t("login_history")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("view_connections")}</p>
                      </div>
                    </div>
                    <Link href="/security" className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors">
                      {t("view_history")}
                    </Link>
                  </div>

                  {/* Account Info */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {t("account_info")}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t("account_created")}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString(language === "ar" ? "ar-SA" : language === "en" ? "en-US" : "fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : t("not_available")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t("last_updated")}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userUpdatedAt ? new Date(userUpdatedAt).toLocaleDateString(language === "ar" ? "ar-SA" : language === "en" ? "en-US" : "fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : t("not_available")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("notifications")}</h2>
                  </div>

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t("email_notifications")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("receive_email_notif")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle("email", !emailNotifications)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        emailNotifications ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          emailNotifications ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Push Notifications */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t("push_notifications")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("receive_push_notif")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle("push", !pushNotifications)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        pushNotifications ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          pushNotifications ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sound Alerts */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t("sound_alerts")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("sound_alerts_desc")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle("sound", !soundAlerts)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        soundAlerts ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          soundAlerts ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Appearance Settings */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("appearance")}</h2>
                  </div>

                  {/* Theme Selection */}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-4">{t("theme")}</p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: "light", label: t("light"), icon: <Sun className="w-6 h-6" /> },
                        { id: "dark", label: t("dark"), icon: <Moon className="w-6 h-6" /> },
                        { id: "system", label: t("system"), icon: <Monitor className="w-6 h-6" /> },
                      ].map((themeOption) => (
                        <button
                          key={themeOption.id}
                          onClick={() => handleThemeChange(themeOption.id as "light" | "dark" | "system")}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            theme === themeOption.id
                              ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                            theme === themeOption.id
                              ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          }`}>
                            {themeOption.icon}
                          </div>
                          <p className={`text-sm font-medium ${
                            theme === themeOption.id
                              ? "text-violet-700 dark:text-violet-300"
                              : "text-gray-700 dark:text-gray-300"
                          }`}>
                            {themeOption.label}
                          </p>
                          {theme === themeOption.id && (
                            <Check className="w-5 h-5 text-violet-500 mx-auto mt-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Devices Settings */}
              {activeTab === "devices" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("trusted_devices")}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {t("trusted_devices_desc")}
                    </p>
                  </div>

                  {/* Current Device */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Monitor className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{t("this_device")}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getBasicDeviceInfo().os} - {getBasicDeviceInfo().browser}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                        {t("active")}
                      </span>
                    </div>
                  </div>

                  {/* Trusted Devices List */}
                  {trustedDevices.length > 0 ? (
                    <div className="space-y-3">
                      {trustedDevices.map((device) => (
                        <div
                          key={device.id}
                          className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                              <Smartphone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {device.platform}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("added_on")} {new Date(device.timestamp).toLocaleDateString(language === "ar" ? "ar-SA" : language === "en" ? "en-US" : "fr-FR")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTrustedDevice(device.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{t("no_trusted_devices")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

