"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentContextType {
  hasConsent: boolean;
  preferences: CookiePreferences;
  showBanner: boolean;
  isLoading: boolean;
  consentVersion: string | null;
  lastUpdated: string | null;
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  customizePreferences: (prefs: Partial<CookiePreferences>) => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  closeBanner: () => void;
  showSettingsModal: boolean;
}

const defaultPreferences: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [consentVersion, setConsentVersion] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Check for existing consent on mount
  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      // First check localStorage for quick access
      const localConsent = localStorage.getItem("cookie_consent");
      const localMeta = localStorage.getItem("cookie_consent_meta");
      if (localConsent) {
        try {
          const parsed = JSON.parse(localConsent);
          setPreferences({
            necessary: true,
            functional: parsed.functional || false,
            analytics: parsed.analytics || false,
            marketing: parsed.marketing || false,
          });
          setHasConsent(true);
          if (localMeta) {
            const meta = JSON.parse(localMeta);
            setConsentVersion(meta.version || null);
            setLastUpdated(meta.updatedAt || null);
          }
          setIsLoading(false);
          return;
        } catch (e) {
          // Invalid local storage data, continue to API check
        }
      }

      // Check with API
      const response = await fetch("/api/cookies/consent");
      if (response.ok) {
        const data = await response.json();
        if (data.hasConsent) {
          setHasConsent(true);
          setPreferences(data.preferences);
          setConsentVersion(data.version || null);
          setLastUpdated(data.updatedAt || null);
          // Cache in localStorage
          localStorage.setItem("cookie_consent", JSON.stringify(data.preferences));
          localStorage.setItem("cookie_consent_meta", JSON.stringify({
            version: data.version,
            updatedAt: data.updatedAt,
          }));
        } else {
          // Show banner if no consent
          setShowBanner(true);
        }
      } else {
        // Show banner on error (safer)
        setShowBanner(true);
      }
    } catch (error) {
      console.error("Error checking consent:", error);
      setShowBanner(true);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConsent = async (action: string, prefs?: Partial<CookiePreferences>) => {
    try {
      const response = await fetch("/api/cookies/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          preferences: prefs,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setHasConsent(true);
        setShowBanner(false);
        setShowSettingsModal(false);
        setConsentVersion(data.version || "1.0");
        setLastUpdated(new Date().toISOString());
        // Cache in localStorage
        localStorage.setItem("cookie_consent", JSON.stringify(data.preferences));
        localStorage.setItem("cookie_consent_meta", JSON.stringify({
          version: data.version || "1.0",
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error("Error saving consent:", error);
    }
  };

  const acceptAll = useCallback(async () => {
    await saveConsent("accept_all");
  }, []);

  const rejectAll = useCallback(async () => {
    await saveConsent("reject_all");
  }, []);

  const customizePreferences = useCallback(async (prefs: Partial<CookiePreferences>) => {
    await saveConsent("customize", {
      necessary: true,
      functional: prefs.functional ?? preferences.functional,
      analytics: prefs.analytics ?? preferences.analytics,
      marketing: prefs.marketing ?? preferences.marketing,
    });
  }, [preferences]);

  const openSettings = useCallback(() => {
    setShowSettingsModal(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettingsModal(false);
  }, []);

  const closeBanner = useCallback(() => {
    // Closing banner without action means reject all
    rejectAll();
  }, [rejectAll]);

  return (
    <CookieConsentContext.Provider
      value={{
        hasConsent,
        preferences,
        showBanner,
        isLoading,
        consentVersion,
        lastUpdated,
        acceptAll,
        rejectAll,
        customizePreferences,
        openSettings,
        closeSettings,
        closeBanner,
        showSettingsModal,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}
