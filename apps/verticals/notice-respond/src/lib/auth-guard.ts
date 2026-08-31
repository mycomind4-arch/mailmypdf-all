import { createClient, type User } from "@supabase/supabase-js";

export class NoticeRespondAuthError extends Error {
  constructor(readonly status: 401 | 403 | 503, message: string, readonly code: string) {
    super(message);
    this.name = "NoticeRespondAuthError";
  }
}

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new NoticeRespondAuthError(503, "MailMyPDF Account authentication is not configured.", "AUTH_NOT_CONFIGURED");
  return { url, anonKey };
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new NoticeRespondAuthError(401, "Authentication required.", "AUTH_REQUIRED");
  const token = header.slice("Bearer ".length).trim();
  if (!token) throw new NoticeRespondAuthError(401, "Authentication required.", "AUTH_REQUIRED");
  return token;
}

async function resolveUser(request: Request): Promise<User> {
  const { url, anonKey } = getConfig();
  const token = bearerToken(request);
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new NoticeRespondAuthError(401, "Invalid or expired authentication token.", "AUTH_INVALID");
  return data.user;
}

export async function requireAuthenticatedUser(request: Request): Promise<User> {
  return resolveUser(request);
}

export async function requireAdmin(request: Request): Promise<User> {
  const user = await resolveUser(request);
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) throw new NoticeRespondAuthError(503, "MailMyPDF Account admin authorization is not configured.", "ADMIN_NOT_CONFIGURED");
  const { url } = getConfig();
  const adminClient = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: role, error } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (error) throw new NoticeRespondAuthError(503, "MailMyPDF Account role lookup failed.", "ADMIN_ROLE_LOOKUP_FAILED");
  const roleName = typeof role?.role === "string" ? role.role : "";
  if (!["admin", "super_admin"].includes(roleName)) throw new NoticeRespondAuthError(403, "Administrative access required.", "ADMIN_REQUIRED");
  return user;
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof NoticeRespondAuthError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  return Response.json({ error: "Authentication service unavailable." }, { status: 503 });
}
