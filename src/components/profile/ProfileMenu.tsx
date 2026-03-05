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
      label: t('pm_general'),
      icon: <SlidersHorizontal className="w-4 h-4" />,
      items: [
        { id: "edit-profile", label: t('pm_edit_profile'), icon: <Edit3 className="w-4 h-4" />, href: "/profile" },
        { id: "change-photo", label: t('pm_change_photo'), icon: <Camera className="w-4 h-4" />, href: "/profile?tab=photo" },
        { id: "timezone", label: t('pm_timezone'), icon: <Clock className="w-4 h-4" />, description: "Europe/Paris" },
        { id: "email-prefs", label: t('pm_email_prefs'), icon: <Mail className="w-4 h-4" />, href: "/settings?tab=notifications" },
      ]
    },
    {
      id: "security",
      label: t('pm_security'),
      icon: <Shield className="w-4 h-4" />,
      items: [
        { id: "change-password", label: t('pm_change_password'), icon: <Lock className="w-4 h-4" />, href: "/settings?tab=security" },
        { id: "active-sessions", label: t('pm_active_sessions'), icon: <Monitor className="w-4 h-4" />, href: "/settings?tab=devices" },
        { id: "trusted-devices", label: t('pm_trusted_devices'), icon: <Smartphone className="w-4 h-4" />, href: "/settings?tab=devices" },
        { id: "2fa", label: t('pm_2fa'), icon: <Key className="w-4 h-4" />, badge: t('pm_disabled'), href: "/settings?tab=security" },
        { id: "login-history", label: t('pm_login_history'), icon: <Clock className="w-4 h-4" />, href: "/settings?tab=security" },
        { id: "face-reset", label: t('pm_face_reset'), icon: <RefreshCw className="w-4 h-4" />, href: "/settings?tab=security" },
        { id: "cookie-settings", label: t('pm_cookie_settings'), icon: <Shield className="w-4 h-4" />, href: "/parametres/cookies" },
      ]
    },
    {
      id: "notifications",
      label: t('notifications'),
      icon: <Bell className="w-4 h-4" />,
      items: [
        { id: "attendance-alerts", label: t('pm_attendance_alerts'), icon: <Activity className="w-4 h-4" />, href: "/settings?tab=notifications" },
        { id: "rh-decisions", label: t('pm_rh_decisions'), icon: <Users className="w-4 h-4" />, href: "/settings?tab=notifications" },
        { id: "anomalies", label: t('anomalies'), icon: <AlertCircle className="w-4 h-4" />, href: "/settings?tab=notifications" },
        { id: "email-notif", label: t('pm_email_notif'), icon: <Mail className="w-4 h-4" />, badge: t('pm_active'), href: "/settings?tab=notifications" },
        { id: "sound-alerts", label: t('pm_sound_alerts'), icon: <Bell className="w-4 h-4" />, href: "/settings?tab=notifications" },
      ]
    },
    {
      id: "appearance",
      label: t('pm_appearance'),
      icon: <Moon className="w-4 h-4" />,
      items: [
        { id: "theme-light", label: t('pm_light_mode'), icon: <Sun className="w-4 h-4" />, onClick: () => handleThemeChange("light") },
        { id: "theme-dark", label: t('pm_dark_mode'), icon: <Moon className="w-4 h-4" />, onClick: () => handleThemeChange("dark") },
        { id: "theme-system", label: t('pm_system'), icon: <Monitor className="w-4 h-4" />, onClick: () => handleThemeChange("system") },
      ]
    }
  ];

  // RH-specific settings
  const rhSettings: SubMenuItem[] = [
    { id: "employee-approvals", label: t('nav_profile_validation'), icon: <Users className="w-4 h-4" />, href: "/rh/profiles", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
    { id: "leave-management", label: t('leave_management'), icon: <Calendar className="w-4 h-4" />, href: "/rh/conges", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
    { id: "public-holidays", label: t('pm_public_holidays'), icon: <Clock className="w-4 h-4" />, href: "/rh/jours-feries", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
    { id: "rh-notifications", label: t('pm_rh_notifications'), icon: <Bell className="w-4 h-4" />, href: "/rh/notifications", roles: ["RH", "ADMIN", "SUPER_ADMIN"] },
  ];

  // Admin-specific settings
  const adminSettings: SubMenuItem[] = [
    { id: "user-management", label: t('pm_user_management'), icon: <Users className="w-4 h-4" />, href: "/parametres/users", roles: ["SUPER_ADMIN"] },
    { id: "role-management", label: t('pm_role_management'), icon: <Shield className="w-4 h-4" />, href: "/parametres/roles", roles: ["SUPER_ADMIN"] },
    { id: "system-logs", label: t('pm_audit_log'), icon: <FileText className="w-4 h-4" />, href: "/parametres/logs", roles: ["SUPER_ADMIN"] },
    { id: "cookie-settings", label: t('pm_cookie_settings'), icon: <Lock className="w-4 h-4" />, href: "/parametres/cookies", roles: ["SUPER_ADMIN"] },
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
              {session?.user?.name || t('user')}
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
                  {session?.user?.name || t('user')}
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
              {t('nav_my_profile')}
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
                  {t('pm_language')}
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
                    {t('pm_select_language')}
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
                  {t('settings')}
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
                        {t('hr')}
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
                        {t('nav_administration')}
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
                  {t('pm_my_documents')}
                </Link>
                <Link
                  href="/pointage"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  {t('pm_my_attendance')}
                </Link>
                <Link
                  href="/conges"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {t('pm_my_leaves')}
                </Link>
              </>
            )}

            {/* Role Switch for Admin */}
            {isAdmin && (
              <div className="px-4 py-2.5">
                <p className="text-xs text-gray-400 mb-2">{t('pm_view_as')}</p>
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
              {t('pm_help_support')}
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('sign_out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
