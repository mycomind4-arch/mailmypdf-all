type RuntimeAuthConfig = { configured: boolean; url: string | null; anonKey: string | null };

async function resolveConfig(): Promise<{ url: string; anonKey: string } | null> {
  const env = (import.meta as { env?: Record<string, string> }).env;
  if (env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_ANON_KEY) {
    return { url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY };
  }
  const response = await fetch("/api/auth/config", { cache: "no-store" });
  if (!response.ok) return null;
  const config = (await response.json()) as RuntimeAuthConfig;
  if (!config.configured || !config.url || !config.anonKey) return null;
  return { url: config.url, anonKey: config.anonKey };
}

export async function getAppealAccessToken(): Promise<string> {
  const config = await resolveConfig();
  if (!config) throw new Error("MailMyPDF Account authentication is not configured.");
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(config.url, config.anonKey);
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Authentication is required.");
  return data.session.access_token;
}

export async function appealAuthFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getAppealAccessToken();
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type") && typeof init.body === "string") {
    headers.set("content-type", "application/json");
  }
  return fetch(input, { ...init, headers, cache: "no-store" });
}
