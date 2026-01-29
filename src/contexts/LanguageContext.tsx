"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

export type Language = "fr" | "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Common
    "dashboard": "Tableau de bord",
    "home": "Accueil",
    "workspace": "Espace de travail",
    "settings": "Paramètres",
    "profile": "Profil",
    "logout": "Déconnexion",
    "login": "Connexion",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "add": "Ajouter",
    "search": "Rechercher",
    "loading": "Chargement...",
    "error": "Erreur",
    "success": "Succès",
    "confirm": "Confirmer",
    
    // Navigation / Sidebar
    "employees": "Employés",
    "attendance": "Pointage",
    "leaves": "Congés",
    "documents": "Documents",
    "hr": "Ressources humaines",
    "notifications": "Notifications",
    "my_documents": "Mes documents",
    "leave_requests": "Demandes de congé",
    "leave_management": "Gestion des congés",
    "notification_center": "Centre de notifications",
    "user_management": "Gestion utilisateurs",
    "role_management": "Gestion des rôles",
    "help": "Assistance",
    "audit_logs": "Journal d'audit",
    "cookie_settings": "Paramètres cookies",
    "administration": "Administration",
    "profile_validation": "Validation profils",
    
    // Settings
    "general": "Général",
    "security": "Sécurité",
    "appearance": "Apparence",
    "devices": "Appareils",
    "language": "Langue",
    "theme": "Thème",
    "dark_mode": "Mode sombre",
    "light_mode": "Mode clair",
    "system": "Système",
    
    // User
    "first_name": "Prénom",
    "last_name": "Nom",
    "email": "Email",
    "phone": "Téléphone",
    "password": "Mot de passe",
    "change_password": "Changer le mot de passe",
    "current_password": "Mot de passe actuel",
    "new_password": "Nouveau mot de passe",
    "confirm_password": "Confirmer le mot de passe",
    
    // Status
    "active": "Actif",
    "inactive": "Inactif",
    "pending": "En attente",
    "approved": "Approuvé",
    "rejected": "Rejeté",
    
    // Messages
    "welcome": "Bienvenue",
    "goodbye": "Au revoir",
    "no_data": "Aucune donnée disponible",
    "no_results": "Aucun résultat trouvé",
    
    // Chatbot / Help
    "chatbot_title": "Assistant RH",
    "chatbot_subtitle": "Toujours disponible pour vous aider",
    "chatbot_online": "En ligne",
    "chatbot_typing": "En train d'écrire...",
    "chatbot_placeholder": "Posez votre question...",
    "chatbot_send": "Envoyer",
    "chatbot_beta": "L'assistant est en version bêta. Les réponses sont simulées pour le moment.",
    "chatbot_welcome": "Je suis votre assistant RH virtuel. Je peux vous aider avec:\n\n• Questions sur les congés et absences\n• Informations sur vos pointages\n• Procédures administratives\n• Documents à fournir\n\nComment puis-je vous aider aujourd'hui?",
  },
  en: {
    // Common
    "dashboard": "Dashboard",
    "home": "Home",
    "workspace": "Workspace",
    "settings": "Settings",
    "profile": "Profile",
    "logout": "Logout",
    "login": "Login",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "search": "Search",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm",
    
    // Navigation / Sidebar
    "employees": "Employees",
    "attendance": "Attendance",
    "leaves": "Leaves",
    "documents": "Documents",
    "hr": "Human Resources",
    "notifications": "Notifications",
    "my_documents": "My documents",
    "leave_requests": "Leave requests",
    "leave_management": "Leave management",
    "notification_center": "Notification center",
    "user_management": "User management",
    "role_management": "Role management",
    "help": "Help",
    "audit_logs": "Audit Logs",
    "cookie_settings": "Cookie Settings",
    "administration": "Administration",
    "profile_validation": "Profile Validation",
    
    // Settings
    "general": "General",
    "security": "Security",
    "appearance": "Appearance",
    "devices": "Devices",
    "language": "Language",
    "theme": "Theme",
    "dark_mode": "Dark mode",
    "light_mode": "Light mode",
    "system": "System",
    
    // User
    "first_name": "First name",
    "last_name": "Last name",
    "email": "Email",
    "phone": "Phone",
    "password": "Password",
    "change_password": "Change password",
    "current_password": "Current password",
    "new_password": "New password",
    "confirm_password": "Confirm password",
    
    // Status
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected",
    
    // Messages
    "welcome": "Welcome",
    "goodbye": "Goodbye",
    "no_data": "No data available",
    "no_results": "No results found",
    
    // Chatbot / Help
    "chatbot_title": "HR Assistant",
    "chatbot_subtitle": "Always available to help you",
    "chatbot_online": "Online",
    "chatbot_typing": "Typing...",
    "chatbot_placeholder": "Ask your question...",
    "chatbot_send": "Send",
    "chatbot_beta": "The assistant is in beta. Responses are simulated for now.",
    "chatbot_welcome": "I'm your virtual HR assistant. I can help you with:\n\n• Questions about leaves and absences\n• Information about your attendance\n• Administrative procedures\n• Required documents\n\nHow can I help you today?",
  },
  ar: {
    // Common
    "dashboard": "لوحة التحكم",
    "home": "الرئيسية",
    "workspace": "مساحة العمل",
    "settings": "الإعدادات",
    "profile": "الملف الشخصي",
    "logout": "تسجيل الخروج",
    "login": "تسجيل الدخول",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "add": "إضافة",
    "search": "بحث",
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "success": "نجاح",
    "confirm": "تأكيد",
    
    // Navigation / Sidebar
    "employees": "الموظفون",
    "attendance": "الحضور",
    "leaves": "الإجازات",
    "documents": "المستندات",
    "hr": "الموارد البشرية",
    "notifications": "الإشعارات",
    "my_documents": "مستنداتي",
    "leave_requests": "طلبات الإجازة",
    "leave_management": "إدارة الإجازات",
    "notification_center": "مركز الإشعارات",
    "user_management": "إدارة المستخدمين",
    "role_management": "إدارة الأدوار",
    "help": "المساعدة",
    "audit_logs": "سجل التدقيق",
    "cookie_settings": "إعدادات ملفات تعريف الارتباط",
    "administration": "الإدارة",
    "profile_validation": "التحقق من الملفات الشخصية",
    
    // Settings
    "general": "عام",
    "security": "الأمان",
    "appearance": "المظهر",
    "devices": "الأجهزة",
    "language": "اللغة",
    "theme": "السمة",
    "dark_mode": "الوضع الداكن",
    "light_mode": "الوضع الفاتح",
    "system": "النظام",
    
    // User
    "first_name": "الاسم الأول",
    "last_name": "اسم العائلة",
    "email": "البريد الإلكتروني",
    "phone": "الهاتف",
    "password": "كلمة المرور",
    "change_password": "تغيير كلمة المرور",
    "current_password": "كلمة المرور الحالية",
    "new_password": "كلمة المرور الجديدة",
    "confirm_password": "تأكيد كلمة المرور",
    
    // Status
    "active": "نشط",
    "inactive": "غير نشط",
    "pending": "قيد الانتظار",
    "approved": "معتمد",
    "rejected": "مرفوض",
    
    // Messages
    "welcome": "مرحبا",
    "goodbye": "وداعا",
    "no_data": "لا توجد بيانات متاحة",
    "no_results": "لم يتم العثور على نتائج",
    
    // Chatbot
    "chatbot_title": "مساعد الموارد البشرية الذكي",
    "chatbot_subtitle": "متاح دائماً لمساعدتك",
    "chatbot_online": "متصل",
    "chatbot_typing": "يكتب...",
    "chatbot_placeholder": "اطرح سؤالك...",
    "chatbot_send": "إرسال",
    "chatbot_beta": "المساعد الذكي في النسخة التجريبية. الردود محاكاة حالياً.",
    "chatbot_welcome": "أنا مساعدك الافتراضي للموارد البشرية. يمكنني مساعدتك في:\n\n• أسئلة حول الإجازات والغياب\n• معلومات عن حضورك\n• الإجراءات الإدارية\n• المستندات المطلوبة\n\nكيف يمكنني مساعدتك اليوم؟",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [language, setLanguageState] = useState<Language>("fr");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language from localStorage or DB on mount
  useEffect(() => {
    const loadLanguage = async () => {
      // First check localStorage
      const storedLang = localStorage.getItem("language") as Language;
      if (storedLang && ["fr", "en", "ar"].includes(storedLang)) {
        setLanguageState(storedLang);
      }

      // If logged in, try to fetch from DB
      if (session?.user?.id) {
        try {
          const res = await fetch("/api/users/preferences");
          if (res.ok) {
            const data = await res.json();
            if (data.preferences?.language) {
              const dbLang = data.preferences.language as Language;
              setLanguageState(dbLang);
              localStorage.setItem("language", dbLang);
            }
          }
        } catch (error) {
          console.error("Failed to fetch language preference:", error);
        }
      }
      
      setIsLoaded(true);
    };

    loadLanguage();
  }, [session?.user?.id]);

  // Apply RTL direction to document
  useEffect(() => {
    if (isLoaded) {
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = language;
    }
  }, [language, isLoaded]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    
    // Update document direction
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;

    // Save to DB if logged in
    if (session?.user?.id) {
      try {
        await fetch("/api/users/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "language", value: lang }),
        });
      } catch (error) {
        console.error("Failed to save language preference:", error);
      }
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
