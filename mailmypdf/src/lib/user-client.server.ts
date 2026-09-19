import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** User-scoped client for account RPCs. Never uses a service-role credential. */
export function getSupabaseServer({ token }: { token: string }) {
  if (!token.trim()) throw new Error("Sign in to continue");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Account services are not configured");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
