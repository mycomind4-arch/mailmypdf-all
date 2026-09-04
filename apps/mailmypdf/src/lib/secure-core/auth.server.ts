import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export interface AuthenticatedUserContext {
  supabase: SupabaseClient;
  user: User;
}

export class AuthenticationError extends Error {}

/**
 * Build a user-scoped client. RLS remains the authorization boundary: this
 * module deliberately never accepts or reads a Supabase service-role key.
 */
export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUserContext> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthenticationError("A bearer access token is required");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new AuthenticationError("A bearer access token is required");

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey) throw new Error("Supabase user authentication is not configured");

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // getUser performs a server round trip and does not trust an unverified JWT payload.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new AuthenticationError("The access token is invalid or expired");

  return { supabase, user: data.user };
}
