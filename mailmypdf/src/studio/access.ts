import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function isLocalDevelopmentHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Studio is an administrator tool. Keep the local-origin guard from the
 * original Private Office implementation, but make the authenticated admin
 * check the actual security boundary for the new top-level route.
 */
export async function studioAccessError(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (!isLocalDevelopmentHost(host) || !isLocalDevelopmentHost(url.host)) {
    return Response.json({ error: "Studio tools are available only on the local development server." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Studio requires a same-origin request." }, { status: 403 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : url.searchParams.get("access_token") ?? "";
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || !supabaseUrl || !publishableKey) {
    return Response.json({ error: "Administrator authentication is required." }, { status: 401 });
  }

  const supabase = createClient<Database>(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) {
    return Response.json({ error: "Administrator authentication is required." }, { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: adminRole, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !adminRole) {
    return Response.json({ error: "Administrator access is required." }, { status: 403 });
  }

  return null;
}
