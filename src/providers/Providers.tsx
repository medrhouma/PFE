"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { CookieSettingsModal } from "@/components/cookies/CookieSettingsModal";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryProvider>
        <LanguageProvider>
          <CookieConsentProvider>
            <NotificationProvider>
              {children}
              <CookieConsentBanner />
              <CookieSettingsModal />
            </NotificationProvider>
          </CookieConsentProvider>
        </LanguageProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
