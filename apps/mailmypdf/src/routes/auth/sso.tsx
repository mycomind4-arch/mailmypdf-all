import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, ensureSupabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const HUB_ORIGIN = "https://mailmypdf-etc.pages.dev";
const ALLOWED_DOMAINS = [
  "appeal-mail.pages.dev","insurance-claims.pages.dev","benefits-appeal.pages.dev","debt-defense.pages.dev","notice-respond.pages.dev","dispute-mail.pages.dev","immigration-mail.pages.dev","govreply.pages.dev","code-enforcement.pages.dev","mycomind4-arch-mailmypdf-smallbusiness.pages.dev","mycomind4-arch-mailmypdf-private-office.pages.dev","mailmypdf-etc.pages.dev",
];

export const Route = createFileRoute("/auth/sso")({
  validateSearch: (s: Record<string, unknown>) => ({ return_to: typeof s.return_to === "string" ? s.return_to : undefined }),
  head: () => ({ meta: [{ title: "Signing you in — MailMyPDF" }, { name: "robots", content: "noindex" }] }),
  component: SSORelayPage,
});
function SSORelayPage() {
  const { return_to } = useSearch({ from: "/auth/sso" });
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function relay() {
      if (!return_to) { setError("Missing return destination. Please go back and try again."); return; }
      let isValid = false;
      try { const url = new URL(return_to); isValid = ALLOWED_DOMAINS.some((d) => url.hostname === d || url.hostname.endsWith("." + d)); } catch { isValid = false; }
      if (!isValid) { setError("Invalid return destination. Please go back and try again."); return; }
      await ensureSupabase();
      const auth = supabase?.auth;
      if (!auth) { setError("Account services are not configured. Please try again later."); return; }
      const { data, error: sessionError } = await auth.getSession();
      if (sessionError) { setError(sessionError.message); return; }
      if (data.session) {
        const returnUrl = new URL(return_to);
        const callbackUrl = new URL("/auth/sso-callback", returnUrl.origin);
        callbackUrl.hash = new URLSearchParams({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: String(data.session.expires_in ?? 3600), return_to }).toString();
        if (active) window.location.href = callbackUrl.toString();
      } else if (active) {
        const loginRedirect = `/auth?redirect=${encodeURIComponent("/auth/sso?return_to=" + encodeURIComponent(return_to))}`;
        void navigate({ to: loginRedirect });
      }
    }
    void relay();
    return () => { active = false; };
  }, [return_to, navigate]);
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-md px-6 py-20 text-center"><div className="postmark mx-auto w-fit">SSO</div><h1 className="mt-4 font-serif text-4xl">{error ? "Sign-in problem" : "Connecting your account…"}</h1><p className="mt-5 text-sm leading-6 text-muted-foreground">{error ?? "One moment — we're signing you in across MailMyPDF products."}</p>{error && <button onClick={() => void navigate({ to: "/auth" })} className="mt-8 rounded-full bg-cobalt px-5 py-2 text-sm font-medium text-white">Back to sign in</button>}</main><SiteFooter /></div>;
}
