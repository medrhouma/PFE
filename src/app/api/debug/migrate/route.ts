import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execute, testConnection } from "@/lib/db";

const migrations = [
  // LoginHistory table
  `CREATE TABLE IF NOT EXISTS login_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'credentials',
    success BOOLEAN DEFAULT true,
    failure_reason VARCHAR(255),
    device_fingerprint VARCHAR(255),
    is_suspicious BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_login_history_user (user_id),
    INDEX idx_login_history_created (created_at),
    INDEX idx_login_history_suspicious (is_suspicious)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // UserPreferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'fr',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sound_notifications BOOLEAN DEFAULT false,
    compact_mode BOOLEAN DEFAULT false,
    accessibility_mode BOOLEAN DEFAULT false,
    sidebar_collapsed BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // RHFavorite table
  `CREATE TABLE IF NOT EXISTS rh_favorites (
    id VARCHAR(36) PRIMARY KEY,
    rh_user_id VARCHAR(36) NOT NULL,
    favorite_type ENUM('USER', 'DOCUMENT', 'CONTRACT') NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rh_favorites_user (rh_user_id),
    INDEX idx_rh_favorites_type (favorite_type),
    INDEX idx_rh_favorites_target (target_id),
    UNIQUE KEY unique_favorite (rh_user_id, favorite_type, target_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Document table
  `CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    document_type ENUM('CONTRACT', 'ID_CARD', 'CERTIFICATE', 'PAYSLIP', 'ATTESTATION', 'OTHER') DEFAULT 'OTHER',
    category ENUM('PERSONAL', 'PROFESSIONAL', 'ADMINISTRATIVE', 'FINANCIAL') DEFAULT 'PERSONAL',
    status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED') DEFAULT 'DRAFT',
    file_url VARCHAR(500),
    file_size INT,
    file_type VARCHAR(100),
    owner_id VARCHAR(36) NOT NULL,
    uploaded_by VARCHAR(36),
    metadata JSON,
    is_confidential BOOLEAN DEFAULT false,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_documents_owner (owner_id),
    INDEX idx_documents_type (document_type),
    INDEX idx_documents_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Contract table (updated to match Prisma schema)
  `CREATE TABLE IF NOT EXISTS contracts (
    id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(191) NOT NULL,
    type ENUM('CDI', 'CDD', 'Stage', 'Freelance') NOT NULL,
    description TEXT NULL,
    original_pdf_path TEXT NOT NULL,
    signed_pdf_path TEXT NULL,
    status ENUM('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'ARCHIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    version INT NOT NULL DEFAULT 1,
    signature_zone TEXT NULL,
    signature_data LONGTEXT NULL,
    signed_at DATETIME(3) NULL,
    signed_ip_address VARCHAR(191) NULL,
    signed_user_agent TEXT NULL,
    sent_at DATETIME(3) NULL,
    viewed_at DATETIME(3) NULL,
    archived_at DATETIME(3) NULL,
    created_by VARCHAR(191) NOT NULL,
    valid_from DATETIME(3) NULL,
    valid_until DATETIME(3) NULL,
    parent_id VARCHAR(191) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX contracts_user_id_status_idx (user_id, status),
    INDEX contracts_status_created_at_idx (status, created_at),
    CONSTRAINT contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  
  // Update existing contracts table to match Prisma schema
  `ALTER TABLE contracts 
    CHANGE COLUMN employee_id user_id VARCHAR(191) NOT NULL,
    CHANGE COLUMN contract_type type ENUM('CDI', 'CDD', 'Stage', 'Freelance') NOT NULL,
    CHANGE COLUMN file_url original_pdf_path TEXT NOT NULL,
    CHANGE COLUMN signed_file_url signed_pdf_path TEXT NULL,
    CHANGE COLUMN expires_at valid_until DATETIME(3) NULL,
    CHANGE COLUMN parent_contract_id parent_id VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS signature_zone TEXT NULL AFTER version,
    ADD COLUMN IF NOT EXISTS signed_ip_address VARCHAR(191) NULL AFTER signed_at,
    ADD COLUMN IF NOT EXISTS signed_user_agent TEXT NULL AFTER signed_ip_address,
    ADD COLUMN IF NOT EXISTS sent_at DATETIME(3) NULL AFTER signed_user_agent,
    ADD COLUMN IF NOT EXISTS viewed_at DATETIME(3) NULL AFTER sent_at,
    ADD COLUMN IF NOT EXISTS archived_at DATETIME(3) NULL AFTER viewed_at,
    ADD COLUMN IF NOT EXISTS valid_from DATETIME(3) NULL AFTER archived_at,
    MODIFY COLUMN status ENUM('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'ARCHIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT'`
];

/**
 * POST /api/debug/migrate
 * Run database migrations (SUPER_ADMIN only, or DEV mode with secret key)
 */
export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const { searchParams } = new URL(req.url);
    const devKey = searchParams.get("key");
    
    // In development, allow migration with a secret key
    const devKeyValid = isDev && devKey === "migrate-dev-2024";
    
    if (!devKeyValid) {
      const session = await getServerSession(authOptions);
      
      // Only allow SUPER_ADMIN to run migrations in production
      if (!session?.user || session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Accès refusé. Seul un SUPER_ADMIN peut exécuter les migrations." },
          { status: 403 }
        );
      }
    }

    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: "Impossible de se connecter à la base de données" },
        { status: 500 }
      );
    }

    const results: { table: string; success: boolean; message: string }[] = [];

    for (const migration of migrations) {
      const tableName = migration.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || "Unknown";
      
      try {
        await execute(migration);
        results.push({
          table: tableName,
          success: true,
          message: `Table ${tableName} créée avec succès`,
        });
      } catch (error: any) {
        if (error.code === "ER_TABLE_EXISTS_ERROR") {
          results.push({
            table: tableName,
            success: true,
            message: `Table ${tableName} existe déjà`,
          });
        } else {
          results.push({
            table: tableName,
            success: false,
            message: error.message,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: errorCount === 0,
      message: `Migration terminée: ${successCount} succès, ${errorCount} erreurs`,
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'exécution des migrations" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debug/migrate
 * Check migration status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const isConnected = await testConnection();
    
    return NextResponse.json({
      connected: isConnected,
      tables: [
        "login_history",
        "user_preferences", 
        "rh_favorites",
        "documents",
        "contracts",
      ],
      instruction: "Envoyez une requête POST pour exécuter les migrations",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
