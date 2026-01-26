import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

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

    return NextResponse.next()
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
  ],
}