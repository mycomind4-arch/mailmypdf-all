import { createClient } from "@supabase/supabase-js";

export async function validateAdminSession(sessionToken: string | undefined): Promise<boolean> {
  if (!sessionToken || sessionToken.split(".").length !== 3) return false;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;

  const authClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${sessionToken}` } },
  });
  const { data, error } = await authClient.auth.getUser(sessionToken);
  if (error || !data.user) return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !roleError && !!role;
}
