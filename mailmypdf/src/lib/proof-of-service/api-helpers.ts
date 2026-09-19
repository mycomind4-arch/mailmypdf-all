/**
 * Shared helpers for Proof-of-Service API routes.
 *
 * All v1 API routes use these for auth, rate limiting, error handling,
 * and response formatting.
 */

import { authenticateRequest, type AuthenticatedTenant } from "@/lib/proof-of-service/auth";
import { checkTenantRateLimit, addRateLimitHeaders } from "@/lib/proof-of-service/rate-limiting";

/**
 * Get the supabase admin client (lazy import to avoid circular deps).
 */
export async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Authenticate a proof-of-service API request.
 * Returns the tenant, or sends a 401 response.
 */
export async function requireAuth(
  request: Request,
): Promise<{ tenant: AuthenticatedTenant; supabaseAdmin: Awaited<ReturnType<typeof getSupabaseAdmin>> } | { error: Response }> {
  const supabaseAdmin = await getSupabaseAdmin();
  const tenant = await authenticateRequest(request, { supabaseAdmin });

  if (!tenant) {
    return {
      error: Response.json(
        { error: { type: "unauthorized", message: "Missing or invalid API key", code: "UNAUTHORIZED" } },
        { status: 401 },
      ),
    };
  }

  return { tenant, supabaseAdmin };
}

/**
 * Authenticate + rate limit a request.
 * Returns the tenant, or sends a 401/429 response.
 *
 * Usage:
 *   const auth = await requireAuthWithRateLimit(request, "communications.create");
 *   if ("error" in auth) return auth.error;
 *   const { tenant, supabaseAdmin } = auth;
 */
export async function requireAuthWithRateLimit(
  request: Request,
  rateLimitBucket: string,
): Promise<{ tenant: AuthenticatedTenant; supabaseAdmin: Awaited<ReturnType<typeof getSupabaseAdmin>> } | { error: Response }> {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  // Check rate limit (distributed — Supabase-backed for cross-isolate coordination)
  const rateLimitResponse = await checkTenantRateLimit(auth.tenant.id, rateLimitBucket);
  if (rateLimitResponse) return { error: rateLimitResponse };

  return auth;
}

/**
 * Standard error response.
 */
export function errorResponse(
  status: number,
  type: string,
  message: string,
  code: string,
  field?: string,
): Response {
  return Response.json(
    { error: { type, message, code, ...(field ? { field } : {}) } },
    { status },
  );
}

/**
 * Parse and validate a JSON body. Returns the parsed body or an error response.
 */
export async function parseJsonBody<T>(
  request: Request,
  validator: (data: unknown) => T | { error: string; field?: string },
): Promise<T | { error: Response }> {
  try {
    const body = await request.json();
    const result = validator(body);
    if (typeof result === "object" && result !== null && "error" in result) {
      return {
        error: errorResponse(400, "validation_error", (result as { error: string }).error, "VALIDATION_ERROR", (result as { error: string; field?: string }).field),
      };
    }
    return result as T;
  } catch {
    return {
      error: errorResponse(400, "validation_error", "Invalid JSON body", "INVALID_JSON"),
    };
  }
}

/**
 * Wrap a response with rate limit headers.
 */
export function withRateLimitHeaders(
  response: Response,
  tenantId: string,
  bucket: string,
): Response {
  return addRateLimitHeaders(response, tenantId, bucket);
}
