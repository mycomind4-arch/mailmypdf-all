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

export function initSupabase(
  url: string,
  anonKey: string,
): SupabaseClient {
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
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
