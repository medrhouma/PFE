"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiUser, FiShield, FiBell, FiMoon, FiGlobe, FiSmartphone,
  FiClock, FiLock, FiMail, FiCamera, FiCheck, FiX, FiAlertCircle,
  FiMonitor, FiSun, FiRefreshCw, FiTrash2, FiKey, FiEye, FiEyeOff, FiCalendar
} from "react-icons/fi";
import { 
  getTrustedDevices, 
  removeTrustedDevice, 
  getBasicDeviceInfo,
  DeviceFingerprint 
} from "@/lib/services/device-fingerprint";
import { useLanguage, Language } from "@/contexts/LanguageContext";

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
  const { language, setLanguage: setGlobalLanguage } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || "general");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Settings state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
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
    { id: "general", label: "Général", icon: <FiUser className="w-5 h-5" /> },
    { id: "security", label: "Sécurité", icon: <FiShield className="w-5 h-5" /> },
    { id: "notifications", label: "Notifications", icon: <FiBell className="w-5 h-5" /> },
    { id: "appearance", label: "Apparence", icon: <FiMoon className="w-5 h-5" /> },
    { id: "devices", label: "Appareils", icon: <FiSmartphone className="w-5 h-5" /> },
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
    showMessage("success", "Thème mis à jour avec succès");
  };
  
  const handleLanguageChange = async (newLanguage: string) => {
    await setGlobalLanguage(newLanguage as Language);
    setLanguageDropdownOpen(false);
    showMessage("success", `Langue changée en ${newLanguage === "fr" ? "Français" : newLanguage === "en" ? "English" : "العربية"}`);
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
            showMessage("error", "Permission de notification refusée par le navigateur");
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
    showMessage("success", "Préférence de notification mise à jour");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage("error", "Veuillez sélectionner une image valide");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "L'image ne doit pas dépasser 5 Mo");
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
          setUserImage(base64);
          showMessage("success", "Photo de profil mise à jour avec succès");
        } else {
          const data = await response.json();
          showMessage("error", data.error || "Erreur lors de la mise à jour de la photo");
        }
        setLoading(false);
      };
      reader.onerror = () => {
        showMessage("error", "Erreur lors de la lecture du fichier");
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showMessage("error", "Erreur de connexion");
      setLoading(false);
    }
  };

  const handleRemoveTrustedDevice = (deviceId: string) => {
    removeTrustedDevice(deviceId);
    setTrustedDevices(getTrustedDevices());
    showMessage("success", "Appareil supprimé des appareils de confiance");
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showMessage("error", "Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 8) {
      showMessage("error", "Le mot de passe doit contenir au moins 8 caractères");
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
        showMessage("success", "Mot de passe modifié avec succès");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        showMessage("error", data.error || "Erreur lors de la modification du mot de passe");
      }
    } catch (error) {
      showMessage("error", "Erreur de connexion");
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
        <FiRefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez vos préférences et paramètres de compte
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === "success" 
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}>
            {message.type === "success" ? <FiCheck className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Paramètres Généraux</h2>
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
                      {(userImage || session?.user?.image) ? (
                        <img src={userImage || session?.user?.image || ""} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                          {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
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
                          <FiRefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                        ) : (
                          <FiCamera className="w-4 h-4 inline mr-2" />
                        )}
                        {loading ? "Téléchargement..." : "Modifier photo"}
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
                      <FiGlobe className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Langue</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Choisissez votre langue préférée</p>
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
                                <FiCheck className="w-4 h-4 text-violet-600 dark:text-violet-400 ml-auto" />
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
                      <FiClock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Fuseau horaire</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Définissez votre fuseau horaire local</p>
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sécurité</h2>
                  </div>

                  {/* Change Password */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FiLock className="w-5 h-5" />
                      Changer le mot de passe
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Mot de passe actuel
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Entrez votre mot de passe actuel"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nouveau mot de passe
                        </label>
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          placeholder="Entrez un nouveau mot de passe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Confirmer le mot de passe
                        </label>
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          placeholder="Confirmez le nouveau mot de passe"
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
                          Afficher les mots de passe
                        </label>
                      </div>
                      <button
                        onClick={handlePasswordChange}
                        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                        className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <FiRefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                        ) : null}
                        Modifier le mot de passe
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <FiKey className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Authentification à deux facteurs</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ajoutez une couche de sécurité supplémentaire</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm">
                      Bientôt disponible
                    </span>
                  </div>

                  {/* Login History */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <FiClock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Historique des connexions</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Voir vos dernières connexions</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors">
                      Voir l'historique
                    </button>
                  </div>

                  {/* Account Info */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FiCalendar className="w-5 h-5" />
                      Informations du compte
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Compte créé le</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "Non disponible"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Dernière mise à jour</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userUpdatedAt ? new Date(userUpdatedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "Non disponible"}
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notifications</h2>
                  </div>

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <FiMail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Notifications par email</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Recevoir des notifications importantes par email</p>
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
                      <FiBell className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Notifications push</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Recevoir des notifications dans le navigateur</p>
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
                      <FiBell className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Alertes sonores</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Jouer un son pour les nouvelles notifications</p>
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Apparence</h2>
                  </div>

                  {/* Theme Selection */}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-4">Thème</p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: "light", label: "Clair", icon: <FiSun className="w-6 h-6" /> },
                        { id: "dark", label: "Sombre", icon: <FiMoon className="w-6 h-6" /> },
                        { id: "system", label: "Système", icon: <FiMonitor className="w-6 h-6" /> },
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
                            <FiCheck className="w-5 h-5 text-violet-500 mx-auto mt-2" />
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Appareils de confiance</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Ces appareils ont été vérifiés et sont autorisés à se connecter sans vérification supplémentaire.
                    </p>
                  </div>

                  {/* Current Device */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <FiMonitor className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">Cet appareil</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getBasicDeviceInfo().os} - {getBasicDeviceInfo().browser}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                        Actif
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
                              <FiSmartphone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {device.platform}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Ajouté le {new Date(device.timestamp).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTrustedDevice(device.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FiSmartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun autre appareil de confiance</p>
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
