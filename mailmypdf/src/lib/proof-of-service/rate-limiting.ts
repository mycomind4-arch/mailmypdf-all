/**
 * Proof-of-Service — Rate Limiting Middleware
 *
 * Per-tenant rate limiting for the Proof-of-Service API.
 * Uses distributed rate limiting (Supabase-backed) for cross-isolate
 * coordination on Cloudflare Workers, with in-memory fallback for dev/tests.
 *
 * Default limits:
 * - documents: 100/minute per tenant
 * - communications: 50/minute per tenant
 * - templates: 20/minute per tenant
 * - verify: 100/minute per IP (public endpoint, no auth)
 *
 * Tenants can have custom limits stored in proof_tenants.rate_limits.
 */

import { distributedRateLimit } from "@/lib/distributed-rate-limit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "documents.upload": { maxRequests: 100, windowMs: 60_000 },
  "documents.get": { maxRequests: 200, windowMs: 60_000 },
  "communications.create": { maxRequests: 50, windowMs: 60_000 },
  "communications.get": { maxRequests: 200, windowMs: 60_000 },
  "communications.list": { maxRequests: 100, windowMs: 60_000 },
  "communications.proof": { maxRequests: 50, windowMs: 60_000 },
  "templates.create": { maxRequests: 20, windowMs: 60_000 },
  "templates.list": { maxRequests: 100, windowMs: 60_000 },
  "templates.render": { maxRequests: 30, windowMs: 60_000 },
  "verify": { maxRequests: 100, windowMs: 60_000 },
  "tenants.create": { maxRequests: 5, windowMs: 60_000 },
};

/**
 * Check rate limit for a tenant + bucket.
 * Uses distributed (Supabase-backed) rate limiting for production,
 * falls back to in-memory for development.
 *
 * Returns null if allowed, or a Response with 429 if rate-limited.
 */
export async function checkTenantRateLimit(
  tenantId: string,
  bucket: string,
  customLimits?: Partial<RateLimitConfig>,
): Promise<Response | null> {
  const defaults = DEFAULT_LIMITS[bucket] ?? { maxRequests: 60, windowMs: 60_000 };
  const config: RateLimitConfig = {
    maxRequests: customLimits?.maxRequests ?? defaults.maxRequests,
    windowMs: customLimits?.windowMs ?? defaults.windowMs,
  };

  const result = await distributedRateLimit(`tenant:${tenantId}`, `pos:${bucket}`, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil(result.resetMs / 1000);
    return new Response(
      JSON.stringify({
        error: {
          type: "rate_limit_exceeded",
          message: `Rate limit exceeded for ${bucket}. Try again in ${retryAfter} seconds.`,
          code: "RATE_LIMIT_EXCEEDED",
          retry_after_seconds: retryAfter,
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
        },
      },
    );
  }

  return null; // Allowed
}

/**
 * Check rate limit for the public verify endpoint (by IP, no tenant).
 * Uses distributed rate limiting for cross-isolate coordination.
 */
export async function checkPublicRateLimit(
  request: Request,
  bucket = "verify",
): Promise<Response | null> {
  const ip = getClientIp(request);
  const config = DEFAULT_LIMITS[bucket] ?? { maxRequests: 100, windowMs: 60_000 };
  const result = await distributedRateLimit(ip, `pos:${bucket}`, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil(result.resetMs / 1000);
    return new Response(
      JSON.stringify({
        error: {
          type: "rate_limit_exceeded",
          message: `Too many verification requests. Try again in ${retryAfter} seconds.`,
          code: "RATE_LIMIT_EXCEEDED",
          retry_after_seconds: retryAfter,
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  return null;
}

/**
 * Add rate limit headers to a successful response.
 * Uses in-memory rate limiter for header info (informational only, not security-critical).
 */
export function addRateLimitHeaders(
  response: Response,
  tenantId: string,
  bucket: string,
): Response {
  const defaults = DEFAULT_LIMITS[bucket] ?? { maxRequests: 60, windowMs: 60_000 };
  const result = rateLimit(`tenant:${tenantId}`, `pos:${bucket}`, defaults);

  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", String(defaults.maxRequests));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetMs / 1000)));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
