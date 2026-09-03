/**
 * Rate Limiting & Throttling
 *
 * Prevents API abuse, brute force attacks, and DoS attempts.
 * Implements token bucket algorithm with IP-based and user-based limits.
 */

import { getRequest } from "vinxi/http";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key (IP, user ID, etc.)
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (key: string, limit: RateLimitConfig) => void;
}

export interface TokenBucket {
  tokens: number;
  lastRefilled: number;
  requestCount: number;
  blockedUntil?: number;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* RATE LIMITER IMPLEMENTATION                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * In-memory rate limiter with token bucket algorithm
 *
 * NOTE: For production, use Redis instead of in-memory storage
 * This implementation is suitable for single-instance deployments
 */
class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: RateLimitConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Cleanup expired buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request should be allowed
   */
  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Initialize new bucket
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefilled: now,
        requestCount: 0,
      };
      this.buckets.set(key, bucket);
    }

    // Check if currently blocked
    if (bucket.blockedUntil && now < bucket.blockedUntil) {
      return false;
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefilled;
    const tokensToAdd =
      (elapsedMs / this.config.windowMs) * this.config.maxRequests;

    bucket.tokens = Math.min(
      this.config.maxRequests,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefilled = now;

    // Check if token available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      bucket.requestCount += 1;
      return true;
    }

    // Block for remaining time in window
    bucket.blockedUntil = now + this.config.windowMs;

    if (this.config.onLimitReached) {
      this.config.onLimitReached(key, this.config);
    }

    return false;
  }

  /**
   * Get current status for key
   */
  getStatus(key: string) {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return {
        remaining: this.config.maxRequests,
        limit: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }

    return {
      remaining: Math.floor(bucket.tokens),
      limit: this.config.maxRequests,
      resetTime: bucket.lastRefilled + this.config.windowMs,
    };
  }

  /**
   * Reset rate limit for key
   */
  reset(key: string) {
    this.buckets.delete(key);
  }

  /**
   * Cleanup expired buckets
   */
  private cleanup() {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, bucket] of this.buckets.entries()) {
      // Remove buckets older than 1 hour
      if (now - bucket.lastRefilled > 60 * 60 * 1000) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.buckets.delete(key));
  }

  /**
   * Destroy limiter
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buckets.clear();
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* KEY GENERATORS                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Check headers in order of priority
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback (this won't work in all environments)
  return "unknown";
}

/**
 * IP-based key generator
 */
export function ipKeyGenerator(req: Request): string {
  return `ip:${getClientIP(req)}`;
}

/**
 * User ID-based key generator
 */
export function userKeyGenerator(userId: string | null) {
  return (req: Request) => {
    if (!userId) {
      return ipKeyGenerator(req);
    }
    return `user:${userId}`;
  };
}

/**
 * Combined IP + User key generator
 */
export function combinedKeyGenerator(userId: string | null) {
  return (req: Request) => {
    if (!userId) {
      return ipKeyGenerator(req);
    }
    const ip = getClientIP(req);
    return `combined:${userId}:${ip}`;
  };
}

/**
 * Endpoint-specific key generator
 */
export function endpointKeyGenerator(endpoint: string, userId: string | null) {
  return (req: Request) => {
    if (!userId) {
      return `endpoint:${endpoint}:${getClientIP(req)}`;
    }
    return `endpoint:${endpoint}:${userId}`;
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* PREDEFINED LIMITS                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

export const RateLimits = {
  /**
   * Strict limit for authentication endpoints (login, signup)
   */
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
  },

  /**
   * Moderate limit for API endpoints
   */
  API: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },

  /**
   * Generous limit for authenticated users
   */
  AUTHENTICATED: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 500, // 500 requests per minute
  },

  /**
   * Very strict limit for search (prevents scraping)
   */
  SEARCH: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
  },

  /**
   * Strict limit for file uploads
   */
  UPLOAD: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 uploads per 5 minutes
  },

  /**
   * Strict limit for payment endpoints
   */
  PAYMENT: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  },

  /**
   * Limit for webhook endpoints
   */
  WEBHOOK: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 100, // 100 per 10 seconds
  },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* RESPONSE HEADERS                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(
  limiter: RateLimiter,
  key: string,
  limit: number
): Record<string, string> {
  const status = limiter.getStatus(key);
  const now = Date.now();
  const resetSeconds = Math.ceil((status.resetTime - now) / 1000);

  return {
    "RateLimit-Limit": limit.toString(),
    "RateLimit-Remaining": Math.max(0, status.remaining).toString(),
    "RateLimit-Reset": status.resetTime.toString(),
    "Retry-After": resetSeconds.toString(),
  };
}

/**
 * Create 429 Too Many Requests response
 */
export function createTooManyRequestsResponse(
  limiter: RateLimiter,
  key: string,
  limit: number
): Response {
  const headers = getRateLimitHeaders(limiter, key, limit);

  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: parseInt(headers["Retry-After"], 10),
    }),
    {
      status: 429,
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    }
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* EXPORTS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

export { RateLimiter };

/**
 * Create rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}
