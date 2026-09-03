import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/sso-callback")({
  head: () => ({
    meta: [{ title: "Signing you in — MailMyPDF" }, { name: "robots", content: "noindex" }],
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
        // Fetch config from runtime endpoint
        let configUrl: string | null = null;
        let configKey: string | null = null;

        // Try import.meta.env first
        const env = (import.meta as { env?: Record<string, string | undefined> }).env || {};
        configUrl = env.VITE_SUPABASE_URL || null;
        configKey = env.VITE_SUPABASE_ANON_KEY || null;

        // Fall back to runtime config endpoint
        if (!configUrl || !configKey) {
          const res = await fetch("/api/auth/config");
          if (res.ok) {
            const data = await res.json() as { configured: boolean; url: string | null; anonKey: string | null };
            if (data.configured && data.url && data.anonKey) {
              configUrl = data.url;
              configKey = data.anonKey;
            }
          }
        }

        if (!configUrl || !configKey) {
          setError("Account services are not configured.");
          return;
        }

        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(configUrl, configKey, {
          auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
          },
        });

        const { error: sessionError } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (!active) return;

        const inIframe = window.self !== window.top;
        if (inIframe) {
          window.parent?.postMessage(
            { type: "sso-callback", success: true, origin: window.location.origin },
            "*",
          );
          return;
        }

        if (returnTo) {
          window.location.href = returnTo;
        } else {
          void navigate({ to: "/dashboard" });
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to establish session.");
      }
    }

    void handleCallback();
    return () => { active = false; };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl">Sign-in problem</h1>
          <p className="mt-4 text-sm text-muted-foreground">{error}</p>
          <a href="/auth" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl">Signing you in…</h1>
        <p className="mt-4 text-sm text-muted-foreground">Connecting your MailMyPDF account.</p>
      </div>
    </div>
  );
}
