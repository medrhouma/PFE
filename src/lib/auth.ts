import { NextAuthOptions } from "next-auth"
import type { Provider } from "next-auth/providers/index"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { MySQLAdapter } from "./auth-adapter"
import { pool as getPool } from "./db"
import bcrypt from "bcryptjs"
import { loginHistoryService } from "./services/login-history-service"
import { emailService } from "./services/email-service"

// Helper to get pool with error handling - returns null if not configured
function getDbPool() {
  const p = getPool();
  if (!p) {
    return null;
  }
  return p;
}

// Helper to check if database is available
function hasDbConnection(): boolean {
  return getDbPool() !== null;
}

// Build providers array conditionally
function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  
  // Only add Google provider if credentials are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }
  
  return providers;
}

export const authOptions: NextAuthOptions = {
  adapter: MySQLAdapter(),

  providers: [
    ...buildProviders(),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        userAgent: { label: "User Agent", type: "text" },
        ipAddress: { label: "IP Address", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis")
        }

        // Extract device info from request
        const userAgent = credentials.userAgent || req?.headers?.["user-agent"] || "Unknown"
        const ipAddress = credentials.ipAddress || 
          (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
          req?.headers?.["x-real-ip"] as string || 
          "Unknown"

        const pool = getDbPool();
        if (!pool) {
          throw new Error("Base de données non configurée")
        }
        
        const [rows] = await pool.execute(
          `SELECT * FROM User WHERE email = ?`,
          [credentials.email]
        )
        const users = rows as any[]

        if (users.length === 0) {
          throw new Error("Utilisateur non trouvé")
        }

        const user = users[0]

        if (!user.password) {
          throw new Error("Utilisez la connexion Google")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          // Record failed login attempt
          try {
            await loginHistoryService.recordLogin({
              userId: user.id,
              ipAddress,
              userAgent,
              loginMethod: "credentials",
              success: false,
              failureReason: "Invalid password",
            })
          } catch (e) {
            console.error("Failed to record login failure:", e)
          }
          throw new Error("Mot de passe incorrect")
        }

        // Record successful login (checks suspicious activity internally)
        try {
          await loginHistoryService.recordLogin({
            userId: user.id,
            ipAddress,
            userAgent,
            loginMethod: "credentials",
            success: true,
          })
        } catch (e) {
          console.error("Failed to process login history:", e)
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.roleEnum || user.role,
          status: user.status || "INACTIVE",
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Record Google login in history
      if (account?.provider === "google" && user?.id) {
        try {
          await loginHistoryService.recordLogin({
            userId: user.id,
            ipAddress: "OAuth", // IP not available in OAuth flow
            userAgent: "Google OAuth",
            loginMethod: "google",
            success: true,
          })
        } catch (e) {
          console.error("Failed to record Google login:", e)
        }
      }
      // ✅ Permettre tous les logins
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || "USER"
        token.status = (user as any).status || "INACTIVE"
      }
      
      // Only query database if it's available
      const dbPool = getDbPool();
      if (!dbPool) {
        return token;
      }
      
      try {
        // ✅ Si c'est une connexion Google, récupérer le rôle et le statut depuis la DB
        if (account?.provider === "google" && user?.email) {
          const [rows] = await dbPool.execute(
            `SELECT role, status FROM User WHERE email = ?`,
            [user.email]
          )
          const users = rows as any[]
          if (users.length > 0) {
            token.role = users[0].role
            token.status = users[0].status || "INACTIVE"
          }
        }

        // Toujours récupérer le rôle et le statut les plus récents depuis la DB
        if (token.email) {
          const [rows] = await dbPool.execute(
            `SELECT role, status FROM User WHERE email = ?`,
            [token.email]
          )
          const users = rows as any[]
          if (users.length > 0) {
            token.role = users[0].role
            token.status = users[0].status
          }
        }
      } catch (error) {
        console.error("JWT callback DB error:", error);
        // Continue with existing token data
      }
      
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.status = token.status as string
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}