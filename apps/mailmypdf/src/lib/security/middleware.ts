/**
 * Security Middleware
 *
 * Centralized middleware for applying all security hardening measures.
 * This is the integration point for input validation, rate limiting, CORS,
 * error handling, and logging.
 */

import { getRequest } from "vinxi/http";
import { v4 as uuid } from "uuid";
import { createServerFn } from "@tanstack/start";
import { getCORSPolicy, handleCORSPreflight, applyCORSHeaders, addSecurityHeaders, needsCSRFValidation } from "./cors-config";
import { createRateLimiter, RateLimits, ipKeyGenerator, getTooManyRequestsResponse, createTooManyRequestsResponse } from "./rate-limiting";
import { logger, logRequest, logResponse, logSecurityEvent } from "@/lib/logging/logger";
import { createErrorResponseJSON, toAppError } from "./error-handling";
import { getClientIP } from "./rate-limiting";

/* ─────────────────────────────────────────────────────────────────────────── */
/* RATE LIMITERS (SINGLETON)                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

// Create rate limiters for different endpoints
const apiLimiter = new Map<string, ReturnType<typeof import("./rate-limiting").createRateLimiter>>();

function getOrCreateLimiter(name: string, config: typeof RateLimits[keyof typeof RateLimits]) {
  if (!apiLimiter.has(name)) {
    const { createRateLimiter } = await import("./rate-limiting");
    apiLimiter.set(
      name,
      createRateLimiter({
        ...config,
        keyGenerator: ipKeyGenerator,
        onLimitReached: (key) => {
          logSecurityEvent({
            type: "rate_limit_exceeded",
            ip: key.split(":")[1],
            message: `Rate limit exceeded on ${name}`,
          });
        },
      })
    );
  }
  return apiLimiter.get(name)!;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* REQUEST CONTEXT                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface SecurityContext {
  requestId: string;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  timestamp: Date;
  userId?: string;
}

/**
 * Extract security context from request
 */
export function extractSecurityContext(request: Request): SecurityContext {
  return {
    requestId: uuid(),
    ip: getClientIP(request),
    userAgent: request.headers.get("User-Agent") || "unknown",
    method: request.method,
    path: new URL(request.url).pathname,
    timestamp: new Date(),
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* MIDDLEWARE CHAIN                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Apply all security middleware to response
 */
export async function applySecurityMiddleware(
  request: Request,
  handler: (context: SecurityContext) => Promise<Response>,
  limiterConfig?: typeof RateLimits[keyof typeof RateLimits]
): Promise<Response> {
  const context = extractSecurityContext(request);
  const isDevelopment = process.env.NODE_ENV !== "production";

  try {
    // 1. CORS Preflight handling
    if (request.method === "OPTIONS") {
      const corsPolicy = getCORSPolicy(
        isDevelopment ? "development" : "production"
      );
      return handleCORSPreflight(request, corsPolicy);
    }

    // 2. Rate limiting
    if (limiterConfig) {
      const limiter = await getOrCreateLimiter(
        context.path,
        limiterConfig
      );
      const ip = getClientIP(request);
      const allowed = await limiter.isAllowed(`ip:${ip}`);

      if (!allowed) {
        const response = createTooManyRequestsResponse(
          limiter,
          `ip:${ip}`,
          limiterConfig.maxRequests
        );
        logResponse({
          requestId: context.requestId,
          ip: context.ip,
          method: context.method,
          path: context.path,
          userAgent: context.userAgent,
          statusCode: 429,
        });
        return response;
      }
    }

    // 3. Request validation
    const contentLength = request.headers.get("Content-Length");
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      if (bytes > 50 * 1024 * 1024) {
        // 50MB limit
        const error = toAppError(new Error("Request too large"));
        return createErrorResponseJSON(error, context.requestId, isDevelopment);
      }
    }

    // 4. Log incoming request
    logRequest({
      requestId: context.requestId,
      ip: context.ip,
      method: context.method,
      path: context.path,
      userAgent: context.userAgent,
    });

    // 5. Call handler
    let response = await handler(context);

    // 6. Add security headers
    response = addSecurityHeaders(response);

    // 7. Apply CORS headers
    const corsPolicy = getCORSPolicy(
      isDevelopment ? "development" : "production"
    );
    response = applyCORSHeaders(response, request, corsPolicy);

    // 8. Log response
    logResponse({
      requestId: context.requestId,
      ip: context.ip,
      method: context.method,
      path: context.path,
      userAgent: context.userAgent,
      statusCode: response.status,
      duration: Date.now() - context.timestamp.getTime(),
    });

    return response;
  } catch (error) {
    // Handle errors
    const appError = toAppError(error);
    const response = createErrorResponseJSON(
      appError,
      context.requestId,
      isDevelopment
    );

    logResponse({
      requestId: context.requestId,
      ip: context.ip,
      method: context.method,
      path: context.path,
      userAgent: context.userAgent,
      statusCode: response.status,
      error: (appError as any).message,
      duration: Date.now() - context.timestamp.getTime(),
    });

    return response;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SERVER FUNCTION WRAPPER                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Wrap server function with security middleware
 */
export function withSecurityMiddleware<T>(
  handler: (context: SecurityContext) => Promise<T>,
  limiterConfig?: typeof RateLimits[keyof typeof RateLimits]
) {
  return createServerFn({ method: "POST" }, async () => {
    const request = getRequest();
    if (!request) {
      throw new Error("No request context available");
    }

    let result: T | Response;

    await applySecurityMiddleware(
      request,
      async (context) => {
        result = await handler(context);

        // Convert result to response if needed
        if (result instanceof Response) {
          return result;
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      limiterConfig
    );

    return result;
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SPECIFIC ENDPOINT MIDDLEWARE                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Middleware for authentication endpoints
 */
export async function withAuthMiddleware(
  request: Request,
  handler: (context: SecurityContext) => Promise<Response>
): Promise<Response> {
  return applySecurityMiddleware(request, handler, RateLimits.AUTH);
}

/**
 * Middleware for API endpoints
 */
export async function withAPIMiddleware(
  request: Request,
  handler: (context: SecurityContext) => Promise<Response>
): Promise<Response> {
  return applySecurityMiddleware(request, handler, RateLimits.API);
}

/**
 * Middleware for search endpoints
 */
export async function withSearchMiddleware(
  request: Request,
  handler: (context: SecurityContext) => Promise<Response>
): Promise<Response> {
  return applySecurityMiddleware(request, handler, RateLimits.SEARCH);
}

/**
 * Middleware for file upload endpoints
 */
export async function withUploadMiddleware(
  request: Request,
  handler: (context: SecurityContext) => Promise<Response>
): Promise<Response> {
  return applySecurityMiddleware(request, handler, RateLimits.UPLOAD);
}

/**
 * Middleware for payment endpoints
 */
export async function withPaymentMiddleware(
  request: Request,
  handler: (context: SecurityContext) => Promise<Response>
): Promise<Response> {
  return applySecurityMiddleware(request, handler, RateLimits.PAYMENT);
}

/**
 * Middleware for webhook endpoints
 */
export async function withWebhookMiddleware(
  request: Request,
  handler: (context: SecurityContext) => Promise<Response>
): Promise<Response> {
  return applySecurityMiddleware(request, handler, RateLimits.WEBHOOK);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* AUTHENTICATION MIDDLEWARE                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Extract user ID from request (from JWT/auth header)
 */
export function extractUserId(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  // In production, this would verify and decode the JWT
  // For now, this is a placeholder
  return null;
}

/**
 * Require authentication
 */
export async function requireAuth(
  request: Request
): Promise<{ userId: string; role: string }> {
  const userId = extractUserId(request);

  if (!userId) {
    const error = new Error("Authentication required");
    throw toAppError(error);
  }

  // Fetch user role from database
  // const { data: user } = await supabase.from('users').select('role').eq('id', userId);

  return {
    userId,
    role: "user", // Placeholder
  };
}

/**
 * Require specific role
 */
export async function requireRole(
  request: Request,
  requiredRole: string
): Promise<{ userId: string; role: string }> {
  const auth = await requireAuth(request);

  if (auth.role !== requiredRole && auth.role !== "admin") {
    const error = new Error("Insufficient permissions");
    throw toAppError(error);
  }

  return auth;
}
