/**
 * RBAC (Role-Based Access Control) Middleware
 * Enterprise-grade authorization system
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { auditLogger } from "./services/audit-logger";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: "SUPER_ADMIN" | "RH" | "USER";
  status: "INACTIVE" | "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
}

export interface AuthenticatedRequest extends NextRequest {
  user: SessionUser;
}

/**
 * Verify user is authenticated
 */
export async function requireAuth(request?: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }
  
  return session.user as SessionUser;
}

/**
 * Verify user has specific role
 */
export function requireRole(allowedRoles: Array<"SUPER_ADMIN" | "RH" | "USER">) {
  return async (request?: NextRequest) => {
    const user = await requireAuth(request);
    
    if (!allowedRoles.includes(user.role)) {
      await auditLogger.log({
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
        userId: user.id,
        entityType: "API",
        metadata: JSON.stringify({
          requiredRoles: allowedRoles,
          userRole: user.role,
          path: request?.nextUrl?.pathname,
        }),
        severity: "WARNING",
      });
      
      throw new Error("FORBIDDEN");
    }
    
    return user;
  };
}

/**
 * Verify user has active status
 */
export async function requireActiveStatus(request?: NextRequest) {
  const user = await requireAuth(request);
  
  if (user.status !== "ACTIVE") {
    throw new Error("INACTIVE_USER");
  }
  
  return user;
}

/**
 * Check if user has permission for specific module and action
 */
export async function hasPermission(
  userId: string,
  module: string,
  action: string
): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/user-permissions`, {
      headers: {
        "x-user-id": userId,
      },
    });
    
    if (!response.ok) return false;
    
    const permissions = await response.json();
    
    // Check if user has permission
    return permissions[module]?.actions?.includes(action) || false;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withAuth(
  handler: (req: NextRequest, user: SessionUser) => Promise<NextResponse>,
  options?: {
    roles?: Array<"SUPER_ADMIN" | "RH" | "USER">;
    requireActive?: boolean;
  }
) {
  return async (req: NextRequest) => {
    try {
      let user: SessionUser;
      
      // Check authentication
      user = await requireAuth(req);
      
      // Check role if specified
      if (options?.roles && options.roles.length > 0) {
        user = await requireRole(options.roles)(req);
      }
      
      // Check active status if required
      if (options?.requireActive) {
        user = await requireActiveStatus(req);
      }
      
      // Call the actual handler
      return await handler(req, user);
    } catch (error: any) {
      const errorMessage = error.message || "Internal Server Error";
      
      if (errorMessage === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      
      if (errorMessage === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
      
      if (errorMessage === "INACTIVE_USER") {
        return NextResponse.json(
          { error: "Account not active. Please complete your profile or wait for approval." },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  };
}

/**
 * Extract client information from request
 */
export function getClientInfo(req: NextRequest) {
  return {
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}
