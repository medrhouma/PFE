import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// In-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(
  ip: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) return false

  record.count++
  return true
}

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Client IP
    const forwardedFor = req.headers.get("x-forwarded-for")
    const clientIp = forwardedFor ? forwardedFor.split(",")[0] : "unknown"

    // Rate limiting API
    if (path.startsWith("/api/")) {
      const limit = path.includes("/auth/") ? 20 : 100
      if (!checkRateLimit(clientIp, limit)) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests" }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        )
      }
    }

    const userStatus = token?.status as string
    const userRole = token?.role as string

    const publicPaths = ["/complete-profile", "/waiting-validation"]

    if (!publicPaths.some(p => path.startsWith(p))) {
      if (
        (userStatus === "INACTIVE" || userStatus === "REJECTED") &&
        !["SUPER_ADMIN", "RH"].includes(userRole)
      ) {
        return NextResponse.redirect(new URL("/complete-profile", req.url))
      }

      if (
        userStatus === "PENDING" &&
        !["SUPER_ADMIN", "RH"].includes(userRole)
      ) {
        return NextResponse.redirect(new URL("/waiting-validation", req.url))
      }

      if (
        userStatus !== "ACTIVE" &&
        !["SUPER_ADMIN", "RH"].includes(userRole)
      ) {
        return NextResponse.redirect(new URL("/complete-profile", req.url))
      }
    }

    if (path.startsWith("/super-admin") && userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/home", req.url))
    }

    if (
      path.startsWith("/rh") &&
      !["SUPER_ADMIN", "RH"].includes(userRole)
    ) {
      return NextResponse.redirect(new URL("/home", req.url))
    }

    const response = NextResponse.next()
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // ✅ fichiers publics (IMPORTANT)
        if (
          path === "/manifest.json" ||
          path === "/favicon.ico" ||
          path.startsWith("/_next")
        ) {
          return true
        }

        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/home/:path*",
    "/super-admin/:path*",
    "/rh/:path*",
    "/parametres/:path*",
    "/chatbot/:path*",
    "/dashboard/:path*",
    "/complete-profile/:path*",
    "/waiting-validation/:path*",
    "/profile/:path*",
    "/documents/:path*",
    "/pointage/:path*",
    "/conges/:path*",
  ],
}
