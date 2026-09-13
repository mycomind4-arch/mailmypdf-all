/* ═══════════════════════════════════════════════════════════
   SUPABASE CLIENT

   Lazily-initialized Supabase client. Reads URL and anon key
   from environment variables. Returns null if not configured.

   On Cloudflare Workers, env vars come from the `env` object.
   In dev/SSR, they come from process.env.

   This module bridges both by checking both sources.
   ═══════════════════════════════════════════════════════════ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Node <22 has no native WebSocket, which @supabase/realtime-js requires even
// when realtime isn't used — the RealtimeClient is constructed inside
// createClient() regardless of how lazily this module's own factories are
// called. Fall back to the `ws` package whenever we're not in a browser so
// SSR/build doesn't crash; the browser always has a native WebSocket.
// `@vite-ignore` keeps the bundler from statically resolving `ws` (a
// Node-only package) into the browser build, where this branch never runs.
// Computed once at module load (top-level await), matching this file's own
// singleton-getter style rather than introducing async factory functions.
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const websocketOption = isBrowser
  ? {}
  : {
      realtime: {
        transport: (await import(/* @vite-ignore */ "ws")).default as unknown as typeof WebSocket,
      },
    };

export function initSupabase(
  url: string,
  anonKey: string,
): SupabaseClient {
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    ...websocketOption,
  });
  return client;
}

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key) return initSupabase(url, key);
  return null;
}

export function hasSupabase(): boolean {
  return getSupabase() !== null;
}

let browserClient: SupabaseClient | null = null;

/**
 * Browser-side Supabase accessor for the step-matter engine's
 * `accountAuthMiddleware` (see `src/lib/server-function-auth.ts`). Unlike
 * `getSupabase()` above — which reads `process.env` and backs the
 * pre-existing case repository — this reads `import.meta.env.VITE_*`, the
 * only env source Vite actually exposes to client bundles (mirrors the
 * pattern already used by `src/lib/auth.tsx`'s internal `loadSupabase()`).
 * Returns null when unconfigured rather than throwing, so callers can
 * surface "Authentication is not configured" instead of crashing.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (browserClient) return browserClient;
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  browserClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}
