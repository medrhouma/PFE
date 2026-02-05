import mysql, { RowDataPacket, OkPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise'

/**
 * MySQL Direct Connection Pool
 * Used for raw SQL queries when Prisma is not suitable
 * Optimized for serverless environments (Vercel)
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

export function getPool() {
  // Return null pool for build time or missing config
  if (!hasValidDbConfig()) {
    console.warn('Database configuration not available - skipping pool creation')
    return null
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 30000,
      idleTimeout: 60000,
    })
    
    // Handle pool errors gracefully - use type assertion for error handling
    ;(pool as any).on('error', (err: any) => {
      console.error('Database pool error:', err?.message || err)
      if (err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.code === 'ECONNRESET') {
        pool = null // Reset pool to force reconnection
      }
    })
  }
  return pool
}

export async function getConnection(): Promise<PoolConnection> {
  const currentPool = getPool()
  if (!currentPool) {
    throw new Error('Database pool not available')
  }
  return await currentPool.getConnection()
}

export async function query<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string, 
  params?: any[]
): Promise<T> {
  const currentPool = getPool()
  if (!currentPool) {
    console.warn('Database not configured, returning empty result')
    return [] as unknown as T
  }

  let connection: PoolConnection | null = null
  try {
    connection = await currentPool.getConnection()
    const [rows] = await connection.execute<T>(sql, params)
    return rows
  } catch (error: any) {
    // Handle connection reset errors
    if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection lost, resetting pool...')
      pool = null
    }
    throw error
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

export async function execute(
  sql: string, 
  params?: any[]
): Promise<OkPacket | ResultSetHeader> {
  const currentPool = getPool()
  if (!currentPool) {
    throw new Error('Database pool not available')
  }

  let connection: PoolConnection | null = null
  try {
    connection = await currentPool.getConnection()
    const [result] = await connection.execute<OkPacket | ResultSetHeader>(sql, params)
    return result
  } catch (error: any) {
    if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection lost, resetting pool...')
      pool = null
    }
    throw error
  } finally {
    if (connection) {
      connection.release()
    }
  }
}
