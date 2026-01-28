import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// In-memory rate limiting (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Get client IP for rate limiting
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    // Rate limit check for API routes
    if (path.startsWith('/api/')) {
      const limit = path.includes('/auth/') ? 20 : 100;
      if (!checkRateLimit(clientIp, limit)) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Récupérer le statut de l'utilisateur
    const userStatus = token?.status as string
    const userRole = token?.role as string

    // Chemins qui ne nécessitent pas de vérification de statut
    const publicPaths = ["/complete-profile", "/waiting-validation"]
    
    if (!publicPaths.some(p => path.startsWith(p))) {
      // INACTIVE ou REJECTED → rediriger vers complete-profile
      if ((userStatus === "INACTIVE" || userStatus === "REJECTED") && 
          !["SUPER_ADMIN", "RH"].includes(userRole)) {
        return NextResponse.redirect(new URL("/complete-profile", req.url))
      }

      // PENDING → rediriger vers waiting-validation
      if (userStatus === "PENDING" && 
          !["SUPER_ADMIN", "RH"].includes(userRole)) {
        return NextResponse.redirect(new URL("/waiting-validation", req.url))
      }

      // Seuls ACTIVE ou admins peuvent accéder aux autres pages
      if (userStatus !== "ACTIVE" && 
          !["SUPER_ADMIN", "RH"].includes(userRole)) {
        return NextResponse.redirect(new URL("/complete-profile", req.url))
      }
    }

    // Redirection selon le rôle
    if (path.startsWith("/super-admin") && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/home", req.url))
    }

    if (path.startsWith("/rh") && !["SUPER_ADMIN", "RH"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/home", req.url))
    }

    // Add security headers to response
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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