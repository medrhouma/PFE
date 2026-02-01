import mysql, { RowDataPacket, OkPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getPool() {
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
    
    // Handle pool errors gracefully
    pool.on('error', (err) => {
      console.error('Database pool error:', err.message)
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        pool = null // Reset pool to force reconnection
      }
    })
  }
  return pool
}

export async function getConnection(): Promise<PoolConnection> {
  return await getPool().getConnection()
}

export async function query<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string, 
  params?: any[]
): Promise<T> {
  let connection: PoolConnection | null = null
  try {
    connection = await getPool().getConnection()
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
  let connection: PoolConnection | null = null
  try {
    connection = await getPool().getConnection()
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
