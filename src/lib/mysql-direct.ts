import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getPool() {
  // Return early during build/static generation
  if (!process.env.DB_HOST) {
    throw new Error('Database configuration not available')
  }
  
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  }
  return pool
}

export async function query(sql: string, params?: any[]) {
  try {
    const connection = await getPool().getConnection()
    try {
      const [rows] = await connection.execute(sql, params)
      return rows
    } finally {
      connection.release()
    }
  } catch (error) {
    // During build, return empty results instead of throwing
    if (error instanceof Error && error.message === 'Database configuration not available') {
      return []
    }
    throw error
  }
}
