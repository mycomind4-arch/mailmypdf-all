import { ensureSupabase, supabase } from "@/integrations/supabase/client";

/** Read the session only to transport the token; the server verifies identity. */
export async function authenticatedHeaders(): Promise<Record<string, string>> {
  await ensureSupabase();
  if (!supabase.auth) throw new Error("Account services are not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sign in to continue.");
  return { Authorization: `Bearer ${data.session.access_token}` };
}
