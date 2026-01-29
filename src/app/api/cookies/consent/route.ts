/**
 * Cookie Consent API
 * Handles GDPR cookie consent management
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  cookieConsentService, 
  CookiePreferences,
  CONSENT_COOKIE_NAME,
  CONSENT_SESSION_COOKIE 
} from "@/lib/services/cookie-consent-service";
import { auditLogger } from "@/lib/services/audit-logger";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/cookies/consent
 * Get current cookie consent status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionId = request.cookies.get(CONSENT_SESSION_COOKIE)?.value;

    let consent = null;

    // Try to get consent by user ID first
    if (session?.user?.id) {
      consent = await cookieConsentService.getConsentByUser(session.user.id);
    }
    
    // Fall back to session-based consent
    if (!consent && sessionId) {
      consent = await cookieConsentService.getConsentBySession(sessionId);
    }

    if (!consent) {
      return NextResponse.json({
        hasConsent: false,
        preferences: cookieConsentService.getDefaultPreferences(),
      });
    }

    return NextResponse.json({
      hasConsent: true,
      preferences: {
        necessary: consent.necessary,
        functional: consent.functional,
        analytics: consent.analytics,
        marketing: consent.marketing,
      },
      consentVersion: consent.consentVersion,
      consentDate: consent.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching cookie consent:", error);
    return NextResponse.json(
      { error: "Failed to fetch consent status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cookies/consent
 * Save cookie consent preferences
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { action, preferences } = body;

    // Get or create session ID for anonymous users
    let sessionId = request.cookies.get(CONSENT_SESSION_COOKIE)?.value;
    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Get client info
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    let consent;

    if (action === "accept_all") {
      consent = await cookieConsentService.acceptAll({
        sessionId,
        userId: session?.user?.id,
        ipAddress,
        userAgent,
      });
    } else if (action === "reject_all") {
      consent = await cookieConsentService.rejectAll({
        sessionId,
        userId: session?.user?.id,
        ipAddress,
        userAgent,
      });
    } else if (action === "customize" && preferences) {
      const validPreferences: CookiePreferences = {
        necessary: true, // Always true
        functional: Boolean(preferences.functional),
        analytics: Boolean(preferences.analytics),
        marketing: Boolean(preferences.marketing),
      };

      consent = await cookieConsentService.saveConsent({
        sessionId,
        userId: session?.user?.id,
        preferences: validPreferences,
        consentMethod: "settings",
        ipAddress,
        userAgent,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use accept_all, reject_all, or customize" },
        { status: 400 }
      );
    }

    // Log the consent action
    await auditLogger.log({
      userId: session?.user?.id,
      action: `COOKIE_CONSENT_${action.toUpperCase()}`,
      entityType: "CookieConsent",
      entityId: consent.id,
      changes: {
        functional: consent.functional,
        analytics: consent.analytics,
        marketing: consent.marketing,
      },
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      preferences: {
        necessary: consent.necessary,
        functional: consent.functional,
        analytics: consent.analytics,
        marketing: consent.marketing,
      },
      version: consent.consentVersion,
      updatedAt: consent.updatedAt,
    });

    // Set consent cookie (stores preferences client-side for quick access)
    response.cookies.set(CONSENT_COOKIE_NAME, JSON.stringify({
      necessary: consent.necessary,
      functional: consent.functional,
      analytics: consent.analytics,
      marketing: consent.marketing,
      version: consent.consentVersion,
      timestamp: consent.updatedAt.toISOString(),
    }), {
      httpOnly: false, // Needs to be readable by JS for conditional loading
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });

    // Set session ID cookie for anonymous users
    if (!session?.user?.id) {
      response.cookies.set(CONSENT_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Error saving cookie consent:", error);
    return NextResponse.json(
      { error: "Failed to save consent" },
      { status: 500 }
    );
  }
}
