import { createServerFn } from "@tanstack/react-start";

/* ─────────────────────────────────────────────
   Supabase client utilities.
   Server-side client uses service role key.
   ───────────────────────────────────────────── */

// Node <22 has no native WebSocket, which @supabase/realtime-js requires even
// when realtime isn't used — the RealtimeClient is constructed inside
// createClient() regardless of how lazily these factories are called. Fall
// back to the `ws` package whenever we're not in a browser so SSR/build
// doesn't crash; the browser always has a native WebSocket. `@vite-ignore`
// keeps the bundler from statically resolving `ws` (a Node-only package)
// into the browser build, where this branch never runs.
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

async function websocketOption() {
  if (isBrowser) return {};
  return {
    realtime: {
      transport: (await import(/* @vite-ignore */ "ws")).default as unknown as typeof WebSocket,
    },
  };
}

export async function getSupabaseServer() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(await websocketOption()),
  });
}

/* Client-side Supabase (for auth, real-time, etc.) */
export async function getSupabaseClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    ...(await websocketOption()),
  });
}

/**
 * Resolve the authenticated Supabase user from a bearer token supplied by the
 * browser. The token is verified server-side; callers never submit a trusted
 * userId field.
 */
export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("Authentication required");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) throw new Error("Invalid or expired authentication token");

  return data.user;
}
