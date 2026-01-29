"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { 
  User, Settings, Shield, Globe, Moon, Bell, 
  LogOut, ChevronRight, Check, Monitor, Sun,
  Lock, Smartphone, Clock, Mail, Edit3, Camera,
  Users, FileText, Calendar, Activity, Database,
  Key, SlidersHorizontal, HelpCircle, LifeBuoy, MessageCircle,
  AlertCircle, RefreshCw, Download
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSafeImageSrc } from "@/lib/utils";

interface ProfileMenuProps {
  compact?: boolean;
}

type ThemeMode = "light" | "dark" | "system";
type Language = "fr" | "en" | "ar";

interface SubMenuConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string;
  description?: string;
  roles?: string[];
}

/**
 * Professional Profile Menu Component
 * - Modern dropdown with nested submenus
 * - Role-based menu items
 * - Theme & language switcher
 * - Smooth animations
 */
export function ProfileMenu({ compact = false }: ProfileMenuProps) {
  const { data: session, update: updateSession } = useSession();
  const { language, setLanguage: setGlobalLanguage, t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [userImage, setUserImage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userRole = session?.user?.role?.toUpperCase() || "USER";
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const isRH = userRole === "RH" || isAdmin;

  // Fetch user profile to get the latest image
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const userData = await response.json();
          // Try employee photo first, then user image
          const image = userData.employee?.photo || userData.image;
          if (image) {
            setUserImage(image);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session?.user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeMode;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme
  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", mode);
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
  };

  // Handle submenu hover with delay
  const handleSubmenuEnter = useCallback((menuId: string) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    setActiveSubmenu(menuId);
  }, []);

  const handleSubmenuLeave = useCallback(() => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
  }, []);

  // Role badge color
  const getRoleBadgeColor = () => {
    switch (userRole) {
      case "SUPER_ADMIN":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "ADMIN":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "RH":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // Language options
  const languageOptions: { code: Language; label: string; flag: string }[] = [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ];

  // Handle language change
  const handleLanguageChange = async (lang: Language) => {
    await setGlobalLanguage(lang);
    setActiveSubmenu(null);
  };

  // Settings submenu configuration
  const settingsSubmenus: SubMenuConfig[] = [
    {
      id: "general",
      label: "Général",
      icon: <SlidersHorizontal className="w-4 h-4" />,
      items: [
        { id: "edit-profile", label: "Modifier le profil", icon: <Edit3 className="w-4 h-4" />, href: "/profile" },
        { id: "change-photo", label: "Changer la photo", icon: <Camera className="w-4 h-4" />, href: "/profile?tab=photo" },
        { id: "timezone", label: "Fuseau horaire", icon: <Clock className="w-4 h-4" />, description: "Europe/Paris" },
        { id: "email-prefs", label: "Préférences email", icon: <Mail className="w-4 h-4" />, href: "/settings?tab=notifications" },
      ]
    },
    {
      id: "security",
      label: "Sécurité",
      icon: <Shield className="w-4 h-4" />,
      items: [
        { id: "change-password", label: "Changer mot de passe", icon: <Lock className="w-4 h-4" />, href: "/settings?tab=security" },
        { id: "active-sessions", label: "Sessions actives", icon: <Monitor className="w-4 h-4" />, href: "/settings?tab=devices" },
        { id: "trusted-devices", label: "Appareils de confiance", icon: <Smartphone className="w-4 h-4" />, href: "/settings?tab=devices" },
        { id: "2fa", label: "Double authentification", icon: <Key className="w-4 h-4" />, badge: "Désactivé", href: "/settings?tab=security" },
        { id: "login-history", label: "Historique connexions", icon: <Clock className="w-4 h-4" />, href: "/settings?tab=security" },
        { id: "face-reset", label: "Réinitialiser Face ID", icon: <RefreshCw className="w-4 h-4" />, href: "/settings?tab=security" },
        { id: "cookie-settings", label: "Paramètres cookies", icon: <Shield className="w-4 h-4" />, href: "/parametres/cookies" },
      ]
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="w-4 h-4" />,
      items: [
        { id: "attendance-alerts", label: "Alertes pointage", icon: <Activity className="w-4 h-4" />, href: "/settings?tab=notifications" },
        { id: "rh-decisions", label: "Décisions RH", icon: <Users className="w-4 h-4" />, href: "/settings?tab=notifications" },
        { id: "anomalies", label: "Anomalies", icon: <AlertCircle className="w-4 h-4" />, href: "/settings?tab=notifications" },
        { id: "email-notif", label: "Notifications email", icon: <Mail className="w-4 h-4" />, badge: "Actif", href: "/settings?tab=notifications" },
        { id: "sound-alerts", label: "Alertes sonores", icon: <Bell className="w-4 h-4" />, href: "/settings?tab=notifications" },
      ]
    },
    {
      id: "appearance",
      label: "Apparence",
      icon: <Moon className="w-4 h-4" />,
      items: [
        { id: "theme-light", label: "Mode clair", icon: <Sun className="w-4 h-4" />, onClick: () => handleThemeChange("light") },
        { id: "theme-dark", label: "Mode sombre", icon: <Moon className="w-4 h-4" />, onClick: () => handleThemeChange("dark") },
        { id: "theme-system", label: "Système", icon: <Monitor className="w-4 h-4" />, onClick: () => handleThemeChange("system") },
      ]
    }
  ];

  // RH-specific settings
  const rhSettings: SubMenuItem[] = [
    { id: "employee-approvals", label: "Approbations employés", icon: <Users className="w-4 h-4" />, href: "/rh/approvals", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
    { id: "anomaly-thresholds", label: "Seuils d'anomalie", icon: <SlidersHorizontal className="w-4 h-4" />, href: "/parametres/anomalies", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
    { id: "attendance-rules", label: "Règles de pointage", icon: <Clock className="w-4 h-4" />, href: "/parametres/pointage", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
    { id: "work-schedules", label: "Plannings", icon: <Calendar className="w-4 h-4" />, href: "/parametres/plannings", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
    { id: "leave-policies", label: "Politiques de congés", icon: <FileText className="w-4 h-4" />, href: "/parametres/conges", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
  ];

  // Admin-specific settings
  const adminSettings: SubMenuItem[] = [
    { id: "role-management", label: "Gestion des rôles", icon: <Users className="w-4 h-4" />, href: "/parametres/roles", roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "permissions", label: "Système de permissions", icon: <Shield className="w-4 h-4" />, href: "/parametres/permissions", roles: ["SUPER_ADMIN"] },
    { id: "system-logs", label: "Journaux système", icon: <FileText className="w-4 h-4" />, href: "/parametres/logs", roles: ["ADMIN", "SUPER_ADMIN"] },
    { id: "audit-logs", label: "Journaux d'audit", icon: <Activity className="w-4 h-4" />, href: "/parametres/audit", roles: ["SUPER_ADMIN"] },
    { id: "global-security", label: "Sécurité globale", icon: <Lock className="w-4 h-4" />, href: "/parametres/security", roles: ["SUPER_ADMIN"] },
    { id: "api-keys", label: "Clés API", icon: <Key className="w-4 h-4" />, href: "/parametres/api", roles: ["SUPER_ADMIN"] },
    { id: "backup-restore", label: "Sauvegarde & Restauration", icon: <Download className="w-4 h-4" />, href: "/parametres/backup", roles: ["SUPER_ADMIN"] },
  ];

  const safeImage = getSafeImageSrc(userImage) || getSafeImageSrc(session?.user?.image);
  const [imageError, setImageError] = useState(false);

  // Reset image error when safeImage changes
  useEffect(() => {
    setImageError(false);
  }, [safeImage]);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-2 transition-all duration-200"
      >
        {/* Avatar */}
        <div className="relative">
          {safeImage && !imageError ? (
            <img
              src={safeImage}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
              onError={handleImageError}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
        </div>

        {/* Name & Role (hidden on compact) */}
        {!compact && (
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
              {session?.user?.name || "Utilisateur"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userRole}
            </p>
          </div>
        )}

        {/* Chevron */}
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {safeImage && !imageError ? (
                <img
                  src={safeImage}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {session?.user?.name || "Utilisateur"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session?.user?.email}
                </p>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${getRoleBadgeColor()}`}>
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="py-2">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4 text-gray-400" />
              Mon Profil
            </Link>

            {/* Language Switcher */}
            <div 
              className="relative"
              onMouseEnter={() => handleSubmenuEnter("language")}
              onMouseLeave={handleSubmenuLeave}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-400" />
                  Langue
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                    {language.toUpperCase()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              {/* Language Submenu */}
              {activeSubmenu === "language" && (
                <div 
                  className="absolute right-full top-0 mr-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-[110]"
                  onMouseEnter={() => handleSubmenuEnter("language")}
                  onMouseLeave={handleSubmenuLeave}
                >
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Sélectionner une langue
                  </p>
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        language === lang.code
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </div>
                      {language === lang.code && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings with Submenu */}
            <div 
              className="relative"
              onMouseEnter={() => handleSubmenuEnter("settings")}
              onMouseLeave={handleSubmenuLeave}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-gray-400" />
                  Paramètres
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Settings Submenu */}
              {activeSubmenu === "settings" && (
                <div 
                  className="absolute right-full top-0 mr-1 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-[110] max-h-[80vh] overflow-y-auto"
                  onMouseEnter={() => handleSubmenuEnter("settings")}
                  onMouseLeave={handleSubmenuLeave}
                >
                  {settingsSubmenus.map((submenu) => (
                    <div key={submenu.id} className="mb-1">
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {submenu.label}
                      </p>
                      {submenu.items.map((item) => (
                        item.href ? (
                          <Link
                            key={item.id}
                            href={item.href}
                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">{item.icon}</span>
                              {item.label}
                            </div>
                            {item.badge && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                                {item.badge}
                              </span>
                            )}
                            {item.id === `theme-${theme}` && (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                          </Link>
                        ) : (
                          <button
                            key={item.id}
                            onClick={item.onClick}
                            className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">{item.icon}</span>
                              {item.label}
                            </div>
                            {item.badge && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                                {item.badge}
                              </span>
                            )}
                            {item.id === `theme-${theme}` && (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                          </button>
                        )
                      ))}
                    </div>
                  ))}

                  {/* RH Settings */}
                  {isRH && (
                    <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                      <p className="px-4 py-2 text-xs font-semibold text-blue-500 uppercase tracking-wider">
                        RH
                      </p>
                      {rhSettings.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href || "#"}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="text-blue-500">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Admin Settings */}
                  {isAdmin && (
                    <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                      <p className="px-4 py-2 text-xs font-semibold text-purple-500 uppercase tracking-wider">
                        Administration
                      </p>
                      {adminSettings
                        .filter(item => !item.roles || item.roles.includes(userRole))
                        .map((item) => (
                          <Link
                            key={item.id}
                            href={item.href || "#"}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            onClick={() => setIsOpen(false)}
                          >
                            <span className="text-purple-500">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Access Links based on Role */}
            {userRole === "USER" && (
              <>
                <Link
                  href="/documents"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  Mes Documents
                </Link>
                <Link
                  href="/pointage"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  Mon Pointage
                </Link>
                <Link
                  href="/conges"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Mes Congés
                </Link>
              </>
            )}

            {/* Role Switch for Admin */}
            {isAdmin && (
              <div className="px-4 py-2.5">
                <p className="text-xs text-gray-400 mb-2">Voir en tant que</p>
                <div className="flex gap-2">
                  {["USER", "RH", userRole].map((role) => (
                    <button
                      key={role}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        role === userRole
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Help */}
            <Link
              href="/help"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
              Aide & Support
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
