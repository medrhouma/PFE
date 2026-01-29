import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/mysql-direct";

/**
 * GET /api/users/preferences
 * Get current user's preferences (language, notification settings, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Try to get preferences from UserPreferences table
    let preferences: any = null;
    try {
      const results: any[] = await query(
        `SELECT language, emailNotifications, pushNotifications, soundAlerts, theme, 
                timezone, createdAt, updatedAt
         FROM UserPreferences WHERE userId = ?`,
        [session.user.id]
      );
      if (results.length > 0) {
        preferences = results[0];
      }
    } catch (e: any) {
      // Table might not exist, create it
      if (e.code === 'ER_NO_SUCH_TABLE') {
        try {
          await execute(`
            CREATE TABLE IF NOT EXISTS UserPreferences (
              id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
              userId VARCHAR(36) NOT NULL UNIQUE,
              language VARCHAR(10) DEFAULT 'fr',
              emailNotifications BOOLEAN DEFAULT TRUE,
              pushNotifications BOOLEAN DEFAULT TRUE,
              soundAlerts BOOLEAN DEFAULT TRUE,
              theme VARCHAR(20) DEFAULT 'system',
              timezone VARCHAR(100) DEFAULT 'Europe/Paris',
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
            )
          `);
        } catch (createErr) {
          console.error("Error creating UserPreferences table:", createErr);
        }
      }
    }

    // Return preferences or defaults
    return NextResponse.json({
      language: preferences?.language || "fr",
      emailNotifications: preferences?.emailNotifications ?? true,
      pushNotifications: preferences?.pushNotifications ?? true,
      soundAlerts: preferences?.soundAlerts ?? true,
      theme: preferences?.theme || "system",
      timezone: preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    });

  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des préférences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/preferences
 * Update current user's preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { language, emailNotifications, pushNotifications, soundAlerts, theme, timezone } = body;

    // Ensure table exists
    try {
      await execute(`
        CREATE TABLE IF NOT EXISTS UserPreferences (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          userId VARCHAR(36) NOT NULL UNIQUE,
          language VARCHAR(10) DEFAULT 'fr',
          emailNotifications BOOLEAN DEFAULT TRUE,
          pushNotifications BOOLEAN DEFAULT TRUE,
          soundAlerts BOOLEAN DEFAULT TRUE,
          theme VARCHAR(20) DEFAULT 'system',
          timezone VARCHAR(100) DEFAULT 'Europe/Paris',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        )
      `);
    } catch (e) {
      // Table might already exist
    }

    // Upsert preferences
    try {
      await execute(
        `INSERT INTO UserPreferences (userId, language, emailNotifications, pushNotifications, soundAlerts, theme, timezone)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           language = COALESCE(VALUES(language), language),
           emailNotifications = COALESCE(VALUES(emailNotifications), emailNotifications),
           pushNotifications = COALESCE(VALUES(pushNotifications), pushNotifications),
           soundAlerts = COALESCE(VALUES(soundAlerts), soundAlerts),
           theme = COALESCE(VALUES(theme), theme),
           timezone = COALESCE(VALUES(timezone), timezone),
           updatedAt = NOW()`,
        [
          session.user.id,
          language ?? 'fr',
          emailNotifications ?? true,
          pushNotifications ?? true,
          soundAlerts ?? true,
          theme ?? 'system',
          timezone ?? 'Europe/Paris'
        ]
      );
    } catch (e) {
      console.error("Error upserting preferences:", e);
      throw e;
    }

    return NextResponse.json({
      success: true,
      message: "Préférences mises à jour avec succès"
    });

  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des préférences" },
      { status: 500 }
    );
  }
}
