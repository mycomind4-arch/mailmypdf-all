import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/sso-callback")({
  head: () => ({
    meta: [{ title: "Signing you in — Appeal Mail" }, { name: "robots", content: "noindex" }],
  }),
  component: SSOCallbackPage,
});

function SSOCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function handleCallback() {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const returnTo = params.get("return_to");
      if (!accessToken || !refreshToken) {
        setError("Missing authentication tokens. Please try signing in again.");
        return;
      }
      try {
        const configRes = await fetch("/api/auth/config");
        if (!configRes.ok) { setError("Account services are not configured."); return; }
        const config = await configRes.json() as { configured: boolean; url: string; anonKey: string };
        if (!config.configured) { setError("Account services are not configured."); return; }
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(config.url, config.anonKey, {
          auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
        });
        const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) { setError(sessionError.message); return; }
        if (!active) return;
        if (window.self !== window.top) {
          window.parent?.postMessage({ type: "sso-callback", success: true, origin: window.location.origin }, "*");
          return;
        }
        if (returnTo) window.location.href = returnTo;
        else void navigate({ to: "/dashboard" });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to establish session.");
      }
    }
    void handleCallback();
    return () => { active = false; };
  }, [navigate]);

  if (error) return <div className="min-h-screen flex items-center justify-center px-6"><div className="max-w-md text-center"><h1 className="font-serif text-3xl">Sign-in problem</h1><p className="mt-4 text-sm text-muted-foreground">{error}</p><a href="/auth" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Back to sign in</a></div></div>;
  return <div className="min-h-screen flex items-center justify-center px-6"><div className="max-w-md text-center"><h1 className="font-serif text-3xl">Signing you in…</h1><p className="mt-4 text-sm text-muted-foreground">Connecting your MailMyPDF account.</p></div></div>;
}
