export interface AuthenticatedUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export async function requireAuthenticatedUser(request: Request, env: Record<string, string | undefined>): Promise<AuthenticatedUser> {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Response(JSON.stringify({ error: "MailMyPDF Account authentication is not configured." }), { status: 503, headers: { "content-type": "application/json" } });

  const authorization = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { "content-type": "application/json" } });
  const token = authorization.slice(7).trim();
  if (!token) throw new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { "content-type": "application/json" } });

  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Response(JSON.stringify({ error: "Invalid or expired MailMyPDF Account session." }), { status: 401, headers: { "content-type": "application/json" } });
  return await response.json() as AuthenticatedUser;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
