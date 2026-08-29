/**
 * Simple in-memory sliding window rate limiter.
 *
 * Rate limit violations are audited via the audit-log module.
 *
 * For single-instance deployments. For multi-instance (K8s, serverless),
 * upgrade to Redis or Supabase-backed rate limiting.
 *
 * Usage:
 *   import { rateLimit } from "@/lib/rate-limit";
 *
 *   // 5 requests per minute per IP
 *   const allowed = rateLimit(clientIp, "create-order", { maxRequests: 5, windowMs: 60_000 });
 *   if (!allowed) throw new Response("Too many requests", { status: 429 });
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check if a request is allowed under the rate limit.
 * Returns true if allowed, false if rate-limited.
 */
export function rateLimit(
  key: string,
  bucket: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; resetMs: number } {
  const compositeKey = `${bucket}:${key}`;
  const now = Date.now();
  const windowStart = now - options.windowMs;

  let entry = store.get(compositeKey);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(compositeKey, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= options.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + options.windowMs - now;
    // Audit rate limit violation (fire-and-forget, non-blocking)
    import("@/lib/audit-log").then(({ audit }) => {
      audit({
        action: "auth.rate_limited",
        level: "warn",
        actor: key,
        description: `Rate limit exceeded: ${bucket}`,
        metadata: { bucket, key, maxRequests: options.maxRequests, windowMs: options.windowMs },
      });
    }).catch(() => { /* non-blocking */ });
    return { allowed: false, remaining: 0, resetMs: Math.max(resetMs, 0) };
  }

  entry.timestamps.push(now);
  const remaining = options.maxRequests - entry.timestamps.length;
  return { allowed: true, remaining, resetMs: options.windowMs };
}

/**
 * Extract client IP from a request, accounting for common proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Cleanup old entries periodically to prevent memory leaks.
 * Call this from a scheduled job or interval.
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    // Remove entries with no recent activity (1 hour)
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 3_600_000) {
      store.delete(key);
    }
  }
}
