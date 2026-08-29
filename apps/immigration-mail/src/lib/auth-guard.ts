import { createClient, type User } from "@supabase/supabase-js";

export class ImmigrationAuthError extends Error {
  constructor(readonly status: 401 | 403 | 503, message: string, readonly code: string) {
    super(message);
    this.name = "ImmigrationAuthError";
  }
}

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new ImmigrationAuthError(503, "MailMyPDF Account authentication is not configured.", "AUTH_NOT_CONFIGURED");
  return { url, anonKey };
}

function getBearer(request: Request): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new ImmigrationAuthError(401, "Authentication required.", "AUTH_REQUIRED");
  const token = header.slice(7).trim();
  if (!token) throw new ImmigrationAuthError(401, "Authentication required.", "AUTH_REQUIRED");
  return token;
}

async function resolveUser(request: Request): Promise<User> {
  const { url, anonKey } = getConfig();
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(getBearer(request));
  if (error || !data.user) throw new ImmigrationAuthError(401, "Invalid or expired authentication token.", "AUTH_INVALID");
  return data.user;
}

export function requireAuthenticatedUser(request: Request): Promise<User> {
  return resolveUser(request);
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof ImmigrationAuthError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  return Response.json({ error: "Authentication service unavailable." }, { status: 503 });
}
