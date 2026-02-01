/**
 * Database migration script for new tables
 * Run this script to create the new tables for:
 * - LoginHistory
 * - UserPreferences
 * - RHFavorite
 * - Document
 * - Contract
 */

import { execute, query, testConnection } from '../lib/db';

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
    INDEX idx_login_history_suspicious (is_suspicious),
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
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
    UNIQUE KEY unique_favorite (rh_user_id, favorite_type, target_id),
    FOREIGN KEY (rh_user_id) REFERENCES User(id) ON DELETE CASCADE
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
    INDEX idx_documents_status (status),
    FOREIGN KEY (owner_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES User(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Contract table
  `CREATE TABLE IF NOT EXISTS contracts (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contract_type VARCHAR(100) DEFAULT 'EMPLOYMENT',
    status ENUM('DRAFT', 'SENT', 'SIGNED', 'ARCHIVED', 'EXPIRED') DEFAULT 'DRAFT',
    file_url VARCHAR(500),
    signed_file_url VARCHAR(500),
    signature_data LONGTEXT,
    employee_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36),
    sent_at DATETIME,
    signed_at DATETIME,
    expires_at DATETIME,
    version INT DEFAULT 1,
    parent_contract_id VARCHAR(36),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_contracts_employee (employee_id),
    INDEX idx_contracts_status (status),
    INDEX idx_contracts_created_by (created_by),
    FOREIGN KEY (employee_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_contract_id) REFERENCES contracts(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  // Test connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Failed to connect to database. Aborting migrations.');
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    const tableName = migration.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || `Migration ${i + 1}`;
    
    try {
      console.log(`📦 Creating table: ${tableName}...`);
      await execute(migration);
      console.log(`   ✅ Table ${tableName} created successfully`);
      successCount++;
    } catch (error: any) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`   ℹ️  Table ${tableName} already exists, skipping...`);
        successCount++;
      } else {
        console.error(`   ❌ Error creating ${tableName}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
  } else {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run migrations
runMigrations().catch((error) => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
});
