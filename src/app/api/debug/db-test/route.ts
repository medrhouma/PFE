import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      DB_HOST: process.env.DB_HOST ? "SET (" + process.env.DB_HOST + ")" : "NOT SET",
      DB_PORT: process.env.DB_PORT ? "SET (" + process.env.DB_PORT + ")" : "NOT SET",
      DB_USER: process.env.DB_USER ? "SET (" + process.env.DB_USER + ")" : "NOT SET",
      DB_PASSWORD: process.env.DB_PASSWORD ? "SET (hidden)" : "NOT SET",
      DB_NAME: process.env.DB_NAME ? "SET (" + process.env.DB_NAME + ")" : "NOT SET",
      DATABASE_URL: process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET (hidden)" : "NOT SET",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET",
      OTP_DEV_MODE: process.env.OTP_DEV_MODE || "NOT SET",
    },
  }

  // Test mysql2 direct connection
  try {
    const mysql = require("mysql2/promise")
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
    })
    
    const [rows] = await connection.execute("SELECT COUNT(*) as count FROM User")
    results.mysql2 = {
      status: "OK",
      userCount: (rows as any[])[0]?.count,
    }
    await connection.end()
  } catch (error: any) {
    results.mysql2 = {
      status: "ERROR",
      message: error.message,
      code: error.code,
      errno: error.errno,
    }
  }

  // Test Prisma connection
  try {
    const { PrismaClient } = require("@prisma/client")
    const prisma = new PrismaClient()
    const count = await prisma.user.count()
    results.prisma = {
      status: "OK",
      userCount: count,
    }
    await prisma.$disconnect()
  } catch (error: any) {
    results.prisma = {
      status: "ERROR",
      message: error.message,
    }
  }

  return NextResponse.json(results, { status: 200 })
}
