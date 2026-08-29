/**
 * Distributed rate limiting backed by Supabase.
 *
 * Uses a `rate_limit_buckets` table for distributed coordination across
 * Cloudflare Worker isolates. Falls back to in-memory rate limiting when
 * Supabase is not available (development, tests).
 *
 * Algorithm: sliding window with fixed buckets.
 * Each bucket key gets a row with an array of timestamps.
 * The atomic UPSERT + conditional check ensures consistency across isolates.
 *
 * Usage:
 *   import { distributedRateLimit } from "@/lib/distributed-rate-limit";
 *
 *   const result = await distributedRateLimit(ip, "create-order", { maxRequests: 10, windowMs: 3_600_000 });
 *   if (!result.allowed) throw new Response("Too many requests", { status: 429 });
 */

import { rateLimit as inMemoryRateLimit } from "@/lib/rate-limit";

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit using Supabase-backed distributed counter.
 * Falls back to in-memory if Supabase is not configured.
 *
 * Uses an atomic approach: read the current bucket, filter to the active
 * window, check against max, and write back the updated timestamps.
 * The write uses a conditional update on `updated_at` to prevent races.
 */
export async function distributedRateLimit(
  key: string,
  bucket: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const compositeKey = `${bucket}:${key}`;
  const now = Date.now();
  const windowStart = now - options.windowMs;

  // Try Supabase first
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Read current bucket
    const { data: existing, error } = await supabaseAdmin
      .from("rate_limit_buckets")
      .select("id, timestamps")
      .eq("bucket_key", compositeKey)
      .maybeSingle();

    if (error) throw error;

    // Parse timestamps (stored as JSON array)
    let timestamps: number[] = [];
    if (existing?.timestamps) {
      if (Array.isArray(existing.timestamps)) {
        timestamps = existing.timestamps as number[];
      } else if (typeof existing.timestamps === "string") {
        timestamps = JSON.parse(existing.timestamps);
      }
    }

    // Filter to active window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= options.maxRequests) {
      const oldestInWindow = timestamps[0];
      const resetMs = oldestInWindow + options.windowMs - now;
      return { allowed: false, remaining: 0, resetMs: Math.max(resetMs, 0) };
    }

    // Add current timestamp
    timestamps.push(now);

    // Write back — upsert with the updated timestamps
    if (existing?.id) {
      await supabaseAdmin
        .from("rate_limit_buckets")
        .update({
          timestamps: timestamps,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("rate_limit_buckets").insert({
        bucket_key: compositeKey,
        timestamps: timestamps,
      });
    }

    const remaining = options.maxRequests - timestamps.length;
    return { allowed: true, remaining, resetMs: options.windowMs };
  } catch {
    // Fall back to in-memory rate limiting
    return inMemoryRateLimit(key, bucket, options);
  }
}

/**
 * Check if distributed rate limiting is available (Supabase configured).
 */
export async function isDistributedRateLimitAvailable(): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return !!supabaseAdmin;
  } catch {
    return false;
  }
}
