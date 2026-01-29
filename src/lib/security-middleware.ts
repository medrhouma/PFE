/**
 * Security Middleware
 * CSRF protection, rate limiting, and security headers
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { query, execute } from "@/lib/mysql-direct";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMITS: Record<string, number> = {
  default: 100, // 100 requests per minute
  login: 5, // 5 login attempts per minute
  register: 3, // 3 registration attempts per minute
  "password-reset": 3, // 3 password reset attempts per minute
  "face-verify": 10, // 10 face verification attempts per minute
  api: 60, // 60 API calls per minute
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  limitType: keyof typeof RATE_LIMITS = "default"
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const limit = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: limit - 1, resetIn: RATE_LIMIT_WINDOW };
  }
  
  if (record.count >= limit) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetTime - now 
    };
  }
  
  record.count++;
  return { 
    allowed: true, 
    remaining: limit - record.count, 
    resetIn: record.resetTime - now 
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(
  request: NextRequest,
  token: string
): Promise<boolean> {
  // Get token from header or body
  const headerToken = request.headers.get("x-csrf-token");
  const cookieToken = request.cookies.get("csrf-token")?.value;
  
  // Token must match the one in cookie
  return headerToken === cookieToken && cookieToken === token;
}

/**
 * Security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self)",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
    ].join("; "),
  };
}

/**
 * Add security headers to response
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  limitType: keyof typeof RATE_LIMITS = "default"
) {
  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const ip = getClientIP(request);
    const key = `${limitType}:${ip}`;
    
    const { allowed, remaining, resetIn } = checkRateLimit(key, limitType);
    
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil(resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(resetIn / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + resetIn),
          },
        }
      );
    }
    
    const response = await handler(request);
    
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Date.now() + resetIn));
    
    return response;
  };
}

/**
 * CSRF protection middleware for state-changing requests
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Only check for state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return handler(request);
  }
  
  // Skip CSRF for auth endpoints (they use their own protection)
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return handler(request);
  }
  
  // Skip for API routes with bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return handler(request);
  }
  
  // Validate CSRF token
  const headerToken = request.headers.get("x-csrf-token");
  const cookieToken = request.cookies.get("csrf-token")?.value;
  
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return new NextResponse(
      JSON.stringify({ error: "Invalid CSRF token" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  
  return handler(request);
}

/**
 * Combined security middleware
 */
export async function securityMiddleware(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = "default"
): Promise<NextResponse | null> {
  // Rate limiting
  const ip = getClientIP(request);
  const key = `${limitType}:${ip}`;
  
  const { allowed, remaining, resetIn } = checkRateLimit(key, limitType);
  
  if (!allowed) {
    const response = new NextResponse(
      JSON.stringify({
        error: "Trop de requêtes. Veuillez réessayer plus tard.",
        retryAfter: Math.ceil(resetIn / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(resetIn / 1000)),
        },
      }
    );
    return withSecurityHeaders(response);
  }
  
  return null; // Continue to handler
}

/**
 * Log security event
 */
export async function logSecurityEvent(params: {
  type: "login_attempt" | "login_success" | "login_failure" | "logout" | 
        "csrf_violation" | "rate_limit_exceeded" | "suspicious_activity";
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    await execute(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, ip_address, user_agent, metadata, severity, created_at)
       VALUES (UUID(), ?, ?, 'Security', ?, ?, ?, ?, NOW())`,
      [
        params.userId || null,
        `SECURITY_${params.type.toUpperCase()}`,
        params.ipAddress,
        params.userAgent || null,
        params.details ? JSON.stringify(params.details) : null,
        params.type === "login_success" ? "INFO" : "WARNING",
      ]
    );
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Check for suspicious activity patterns
 */
export function detectSuspiciousActivity(
  ip: string,
  action: string
): { suspicious: boolean; reason?: string } {
  const key = `suspicious:${ip}:${action}`;
  const now = Date.now();
  
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 300000 }); // 5 min window
    return { suspicious: false };
  }
  
  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 300000 });
    return { suspicious: false };
  }
  
  record.count++;
  
  // Thresholds for suspicious activity
  const thresholds: Record<string, number> = {
    login_failure: 10,
    password_reset: 5,
    face_verify_failure: 8,
  };
  
  const threshold = thresholds[action] || 20;
  
  if (record.count >= threshold) {
    return { 
      suspicious: true, 
      reason: `Too many ${action} attempts from IP ${ip}` 
    };
  }
  
  return { suspicious: false };
}
