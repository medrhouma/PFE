import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { MySQLAdapter } from "./auth-adapter"
import { pool } from "./db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: MySQLAdapter(),

  providers: [
    GoogleProvider({
      clientId: process. env.GOOGLE_CLIENT_ID! ,
      clientSecret: process. env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // ✅ AJOUTE CETTE LIGNE
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis")
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
          throw new Error("Mot de passe incorrect")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],

  session: {
    strategy:  "jwt",
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // ✅ Permettre tous les logins
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || "USER"
        token.status = (user as any).status || "INACTIVE"
      }
      
      // ✅ Si c'est une connexion Google, récupérer le rôle et le statut depuis la DB
      if (account?.provider === "google" && user?.email) {
        const [rows] = await pool.execute(
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
        const [rows] = await pool.execute(
          `SELECT role, status FROM User WHERE email = ?`,
          [token.email]
        )
        const users = rows as any[]
        if (users.length > 0) {
          token.role = users[0].role
          token.status = users[0].status
        }
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