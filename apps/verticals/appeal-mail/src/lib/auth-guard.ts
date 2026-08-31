import { getSupabaseServer } from "@/platform/supabase";

/* ═══════════════════════════════════════════════════════════
   MailMyPDF Account — Server-Side Authorization Guard
   ═══════════════════════════════════════════════════════════

   This is the ONLY security boundary. The React AuthProvider
   is for UI state only — it is NOT a security boundary.

   Every protected server operation must call one of these
   functions. Never trust client-supplied user IDs, roles,
   or organization IDs.

   MailMyPDF is the canonical identity provider (Supabase Auth).
   Appeal Mail does NOT create a competing identity system.
   ═══════════════════════════════════════════════════════════ */

export type UserRole = "customer" | "admin" | "super_admin";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "AuthError";
  }
}

/* ── Configuration Check ── */

export function isAuthConfigured(): boolean {
  return Boolean(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function requireAuthConfigured(): void {
  if (!isAuthConfigured()) {
    throw new AuthError(
      "MailMyPDF Account authentication is not configured. Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      503,
    );
  }
}

/* ── Resolve authenticated user from request ── */

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  requireAuthConfigured();

  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AuthError("Authentication required. Provide a valid Bearer token.", 401);

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) {
    throw new AuthError("Invalid or expired authentication token.", 401);
  }

  const role = await resolveUserRole(data.user.id, data.user.user_metadata);
  return {
    id: data.user.id,
    email: data.user.email || "",
    role,
    fullName: data.user.user_metadata?.full_name as string | undefined,
  };
}

/* ── Resolve user role (server-side only) ── */

async function resolveUserRole(
  userId: string,
  metadata?: Record<string, unknown>,
): Promise<UserRole> {
  // Check user_metadata first (set by MailMyPDF platform)
  if (metadata?.role === "super_admin") return "super_admin";
  if (metadata?.role === "admin") return "admin";
  if (metadata?.is_admin === true) return "admin";

  // Check user_roles table (server-side only — RLS blocks client access)
  try {
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (data?.role === "super_admin" || data?.role === "admin") return data.role;
  } catch {
    // Table may not exist yet — fall through to customer
  }

  return "customer";
}

/* ── Require admin role ── */

export async function requireAdmin(request: Request): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new AuthError("Administrative access required.", 403);
  }
  return user;
}

/* ── Require ownership of a resource ── */

export async function requireOwnership(
  request: Request,
  resourceUserId: string | null | undefined,
): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (resourceUserId && resourceUserId !== user.id) {
    throw new AuthError("You do not own this resource.", 403);
  }
  return user;
}

/* ── Auth status response (for client-side checks) ── */

export async function getAuthStatus(request: Request): Promise<{
  configured: boolean;
  authenticated: boolean;
  user?: { id: string; email: string; role: UserRole };
}> {
  if (!isAuthConfigured()) {
    return { configured: false, authenticated: false };
  }

  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return { configured: true, authenticated: false };

  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) return { configured: true, authenticated: false };

    const role = await resolveUserRole(data.user.id, data.user.user_metadata);
    return {
      configured: true,
      authenticated: true,
      user: { id: data.user.id, email: data.user.email || "", role },
    };
  } catch {
    return { configured: true, authenticated: false };
  }
}
