import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

export const listAdminProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: profileError, count } = await supabaseAdmin
      .from("user_profiles")
      .select("id,full_name,phone,company,marketing_opt_in,created_at,updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(100);
    if (profileError) throw new Error(profileError.message);

    const ids = (profiles ?? []).map((profile) => profile.id);
    const roles = ids.length
      ? await supabaseAdmin
          .from("user_roles")
          .select("user_id,role")
          .in("user_id", ids)
      : { data: [], error: null };

    if (roles.error) throw new Error(roles.error.message);
    const roleByUser = new Map((roles.data ?? []).map((row) => [row.user_id, row.role]));

    return {
      total: count ?? profiles?.length ?? 0,
      limit: 100,
      profiles: (profiles ?? []).map((profile) => ({
        ...profile,
        role: roleByUser.get(profile.id) ?? "user",
      })),
    };
  });
