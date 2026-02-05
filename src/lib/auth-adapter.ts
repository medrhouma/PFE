import { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters"
import { pool as getPool } from "./db"
import { v4 as uuid } from "uuid"

// Helper to get pool with error handling
function getDbPool() {
  const p = getPool();
  if (!p) {
    throw new Error('Database not configured');
  }
  return p;
}

export function MySQLAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser & { role: string }> {
      const id: string = uuid()
      const pool = getDbPool();
      await pool.execute(
      `INSERT INTO User (id, email, name, image, emailVerified, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, user.email, user.name || null, user.image || null, user.emailVerified || null, "USER"]
      )
      return { ...user, id, role: "USER" } as AdapterUser & { role: string }
    },

    async getUser(id) {
      const pool = getDbPool();
      const [rows] = await pool.execute(`SELECT * FROM User WHERE id = ?`, [id])
      const users = rows as any[]
      if (users.length === 0) return null
      return {
        id: users[0]. id,
        email: users[0].email,
        name: users[0].name,
        image: users[0].image,
        emailVerified: users[0].emailVerified,
        role: users[0].role,
      } as AdapterUser & { role:  string }
    },

    async getUserByEmail(email) {
      const pool = getDbPool();
      const [rows] = await pool.execute(`SELECT * FROM User WHERE email = ?`, [email])
      const users = rows as any[]
      if (users.length === 0) return null
      return {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        image: users[0].image,
        emailVerified: users[0].emailVerified,
        role: users[0].role,
      } as AdapterUser & { role: string }
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const pool = getDbPool();
      const [rows] = await pool.execute(
        `SELECT u.* FROM User u 
         JOIN Account a ON u. id = a.userId 
         WHERE a.provider = ? AND a.providerAccountId = ?`,
        [provider, providerAccountId]
      )
      const users = rows as any[]
      if (users.length === 0) return null
      return {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        image: users[0].image,
        emailVerified: users[0].emailVerified,
        role: users[0].role,
      } as AdapterUser & { role: string }
    },

    async updateUser(user) {
      const pool = getDbPool();
      await pool.execute(
        `UPDATE User SET name = ?, email = ?, image = ?, emailVerified = ?  WHERE id = ?`,
        [user.name || null, user. email, user.image || null, user. emailVerified || null, user. id]
      )
      const [rows] = await pool.execute(`SELECT * FROM User WHERE id = ?`, [user.id])
      const users = rows as any[]
      return {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        image: users[0].image,
        emailVerified: users[0].emailVerified,
        role: users[0].role,
      } as AdapterUser & { role: string }
    },

    async deleteUser(id) {
      const pool = getDbPool();
      await pool.execute(`DELETE FROM User WHERE id = ?`, [id])
    },

    // ✅ CORRIGÉ : Remplacer undefined par null
    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      const id: string = uuid()
      const pool = getDbPool();
      await pool.execute(
      `INSERT INTO Account (id, userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        account.userId,
        account.type,
        account.provider,
        account.providerAccountId,
        account.refresh_token || null,      // ✅ || null
        account.access_token || null,       // ✅ || null
        account.expires_at || null,         // ✅ || null
        account.token_type || null,         // ✅ || null
        account.scope || null,              // ✅ || null
        account.id_token || null,           // ✅ || null
        account.session_state || null,      // ✅ || null
      ]
      )
      return account as AdapterAccount
    },

    async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      const pool = getDbPool();
      await pool.execute(
        `DELETE FROM Account WHERE provider = ? AND providerAccountId = ?`,
        [provider, providerAccountId]
      )
    },

    async createSession(session) {
      const id = uuid()
      const pool = getDbPool();
      await pool.execute(
        `INSERT INTO Session (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)`,
        [id, session.sessionToken, session.userId, session.expires]
      )
      return session as AdapterSession
    },

    async getSessionAndUser(sessionToken) {
      const pool = getDbPool();
      const [rows] = await pool.execute(
        `SELECT s.*, u.* FROM Session s
         JOIN User u ON s.userId = u.id
         WHERE s.sessionToken = ?`,
        [sessionToken]
      )
      const results = rows as any[]
      if (results.length === 0) return null

      return {
        session: {
          sessionToken: results[0].sessionToken,
          userId: results[0].userId,
          expires: results[0].expires,
        },
        user: {
          id: results[0].userId,
          email: results[0].email,
          name: results[0].name,
          image: results[0].image,
          emailVerified: results[0].emailVerified,
          role: results[0].role,
        },
      } as { session: AdapterSession; user:  AdapterUser & { role: string } }
    },

    async updateSession(session) {
      const pool = getDbPool();
      await pool.execute(
        `UPDATE Session SET expires = ? WHERE sessionToken = ?`,
        [session.expires, session.sessionToken]
      )
      return session as AdapterSession
    },

    async deleteSession(sessionToken) {
      const pool = getDbPool();
      await pool.execute(`DELETE FROM Session WHERE sessionToken = ?`, [sessionToken])
    },

    async createVerificationToken(token) {
      const pool = getDbPool();
      await pool.execute(
        `INSERT INTO VerificationToken (identifier, token, expires) VALUES (?, ?, ?)`,
        [token. identifier, token.token, token. expires]
      )
      return token
    },

    async useVerificationToken({ identifier, token }) {
      const pool = getDbPool();
      const [rows] = await pool.execute(
        `SELECT * FROM VerificationToken WHERE identifier = ? AND token = ?`,
        [identifier, token]
      )
      const tokens = rows as any[]
      if (tokens.length === 0) return null

      await pool.execute(
        `DELETE FROM VerificationToken WHERE identifier = ? AND token = ?`,
        [identifier, token]
      )
      return {
        identifier:  tokens[0].identifier,
        token: tokens[0].token,
        expires: tokens[0]. expires,
      }
    },
  }
}