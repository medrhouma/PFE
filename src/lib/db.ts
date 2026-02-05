import mysql from 'mysql2/promise'

/**
 * MySQL Direct Connection Pool (Legacy)
 * For backwards compatibility - prefer mysql-direct.ts
 */

let pool: mysql.Pool | null = null

// Check if we have valid database configuration
function hasValidDbConfig(): boolean {
  return !!(
    process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD &&
    process.env.DB_NAME
  )
}

// Pool de connexion pour le serveur distant
export function getPool() {
  if (!hasValidDbConfig()) {
    console.warn('Database configuration not available - skipping pool creation')
    return null
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3307,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    })
  }
  return pool
}

// Legacy pool export for backward compatibility
export { getPool as pool }

// Fonction helper pour les requêtes SELECT
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const currentPool = getPool()
  if (!currentPool) {
    console.warn('Database not configured, returning empty result')
    return [] as unknown as T
  }
  const [results] = await currentPool.execute(sql, params)
  return results as T
}

// Fonction pour INSERT, UPDATE, DELETE
export async function execute(sql: string, params?: any[]) {
  const currentPool = getPool()
  if (!currentPool) {
    throw new Error('Database pool not available')
  }
  const [result] = await currentPool.execute(sql, params)
  return result
}

// Test de connexion
export async function testConnection(): Promise<boolean> {
  try {
    const currentPool = getPool()
    if (!currentPool) {
      console.warn('Database not configured for connection test')
      return false
    }
    const connection = await currentPool.getConnection()
    console.log('✅ Connexion MySQL réussie!')
    connection.release()
    return true
  } catch (error) {
    console.error('❌ Erreur connexion:', error)
    return false
  }
}