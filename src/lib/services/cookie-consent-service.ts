/**
 * Cookie Consent Service (GDPR Compliant)
 * Manages cookie consent preferences for users and anonymous sessions
 */

import { query, execute } from "@/lib/mysql-direct";
import { v4 as uuidv4 } from "uuid";

export interface CookiePreferences {
  necessary: boolean; // Always true, required for site to function
  functional: boolean; // Session, language, theme preferences
  analytics: boolean; // Analytics and tracking
  marketing: boolean; // Marketing and advertising
}

export interface CookieConsentRecord {
  id: string;
  sessionId: string | null;
  userId: string | null;
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentVersion: string;
  consentMethod: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CONSENT_VERSION = "1.0";
const CONSENT_COOKIE_NAME = "cookie_consent";
const CONSENT_SESSION_COOKIE = "consent_session_id";

class CookieConsentService {
  /**
   * Ensure the cookie_consents table exists
   */
  private async ensureTableExists(): Promise<void> {
    try {
      await execute(`
        CREATE TABLE IF NOT EXISTS cookie_consents (
          id VARCHAR(36) PRIMARY KEY,
          session_id VARCHAR(36),
          user_id VARCHAR(36),
          necessary BOOLEAN DEFAULT TRUE,
          functional BOOLEAN DEFAULT FALSE,
          analytics BOOLEAN DEFAULT FALSE,
          marketing BOOLEAN DEFAULT FALSE,
          consent_version VARCHAR(10) DEFAULT '1.0',
          consent_method VARCHAR(50) DEFAULT 'banner',
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_session_id (session_id),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      // Table might already exist, that's fine
      console.log("Cookie consent table check:", error);
    }
  }

  /**
   * Get consent by session ID (for anonymous users)
   */
  async getConsentBySession(sessionId: string): Promise<CookieConsentRecord | null> {
    await this.ensureTableExists();
    
    const results: any[] = await query(
      `SELECT * FROM cookie_consents WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
      [sessionId]
    );
    
    if (results.length === 0) return null;
    
    return this.mapToRecord(results[0]);
  }

  /**
   * Get consent by user ID (for authenticated users)
   */
  async getConsentByUser(userId: string): Promise<CookieConsentRecord | null> {
    await this.ensureTableExists();
    
    const results: any[] = await query(
      `SELECT * FROM cookie_consents WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    
    if (results.length === 0) return null;
    
    return this.mapToRecord(results[0]);
  }

  /**
   * Save or update cookie consent
   */
  async saveConsent(params: {
    sessionId?: string;
    userId?: string;
    preferences: CookiePreferences;
    consentMethod?: "banner" | "settings" | "api";
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CookieConsentRecord> {
    await this.ensureTableExists();
    
    const id = uuidv4();
    const {
      sessionId,
      userId,
      preferences,
      consentMethod = "banner",
      ipAddress,
      userAgent,
    } = params;

    // Check if consent already exists
    let existingConsent: CookieConsentRecord | null = null;
    if (userId) {
      existingConsent = await this.getConsentByUser(userId);
    } else if (sessionId) {
      existingConsent = await this.getConsentBySession(sessionId);
    }

    if (existingConsent) {
      // Update existing consent
      await execute(
        `UPDATE cookie_consents SET
          necessary = ?,
          functional = ?,
          analytics = ?,
          marketing = ?,
          consent_version = ?,
          consent_method = ?,
          ip_address = COALESCE(?, ip_address),
          user_agent = COALESCE(?, user_agent),
          user_id = COALESCE(?, user_id),
          updated_at = NOW()
        WHERE id = ?`,
        [
          true, // necessary is always true
          preferences.functional,
          preferences.analytics,
          preferences.marketing,
          CONSENT_VERSION,
          consentMethod,
          ipAddress,
          userAgent,
          userId,
          existingConsent.id,
        ]
      );
      
      return {
        ...existingConsent,
        ...preferences,
        necessary: true,
        consentVersion: CONSENT_VERSION,
        consentMethod,
        updatedAt: new Date(),
      };
    }

    // Create new consent
    await execute(
      `INSERT INTO cookie_consents 
        (id, session_id, user_id, necessary, functional, analytics, marketing, 
         consent_version, consent_method, ip_address, user_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        sessionId,
        userId,
        true,
        preferences.functional,
        preferences.analytics,
        preferences.marketing,
        CONSENT_VERSION,
        consentMethod,
        ipAddress,
        userAgent,
      ]
    );

    return {
      id,
      sessionId: sessionId || null,
      userId: userId || null,
      necessary: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      consentVersion: CONSENT_VERSION,
      consentMethod,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Accept all cookies
   */
  async acceptAll(params: {
    sessionId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CookieConsentRecord> {
    return this.saveConsent({
      ...params,
      preferences: {
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
      },
      consentMethod: "banner",
    });
  }

  /**
   * Reject all non-essential cookies
   */
  async rejectAll(params: {
    sessionId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CookieConsentRecord> {
    return this.saveConsent({
      ...params,
      preferences: {
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      },
      consentMethod: "banner",
    });
  }

  /**
   * Link anonymous session consent to user after login
   */
  async linkSessionToUser(sessionId: string, userId: string): Promise<void> {
    await this.ensureTableExists();
    
    // Update the session consent to be linked to the user
    await execute(
      `UPDATE cookie_consents SET user_id = ? WHERE session_id = ? AND user_id IS NULL`,
      [userId, sessionId]
    );
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(userId: string): Promise<CookieConsentRecord[]> {
    await this.ensureTableExists();
    
    const results: any[] = await query(
      `SELECT * FROM cookie_consents WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    
    return results.map(this.mapToRecord);
  }

  /**
   * Check if user has given consent
   */
  async hasConsent(params: { sessionId?: string; userId?: string }): Promise<boolean> {
    if (params.userId) {
      const consent = await this.getConsentByUser(params.userId);
      return consent !== null;
    }
    if (params.sessionId) {
      const consent = await this.getConsentBySession(params.sessionId);
      return consent !== null;
    }
    return false;
  }

  /**
   * Get default preferences (only necessary cookies)
   */
  getDefaultPreferences(): CookiePreferences {
    return {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
  }

  /**
   * Map database row to CookieConsentRecord
   */
  private mapToRecord(row: any): CookieConsentRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      necessary: Boolean(row.necessary),
      functional: Boolean(row.functional),
      analytics: Boolean(row.analytics),
      marketing: Boolean(row.marketing),
      consentVersion: row.consent_version,
      consentMethod: row.consent_method,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const cookieConsentService = new CookieConsentService();
export { CONSENT_VERSION, CONSENT_COOKIE_NAME, CONSENT_SESSION_COOKIE };
