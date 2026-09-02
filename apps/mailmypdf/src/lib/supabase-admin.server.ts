/**
 * Supabase Admin Client
 *
 * Server-side only. Uses service_role key for full access.
 * NEVER expose this to the browser.
 */

import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create the admin Supabase client.
 *
 * Uses service_role key from environment.
 * Cached in memory (single connection per server process).
 */
export async function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

/**
 * Execute a Supabase query with admin privileges.
 *
 * Usage:
 *   const data = await withAdmin(async (db) => {
 *     const { data } = await db.from('table').select('*');
 *     return data;
 *   });
 */
export async function withAdmin<T>(
  fn: (db: ReturnType<typeof createClient>) => Promise<T>
): Promise<T> {
  const admin = await getSupabaseAdmin();
  if (!admin) {
    throw new Error("Failed to initialize admin database client");
  }
  return fn(admin);
}
