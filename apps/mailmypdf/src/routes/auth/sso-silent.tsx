import { createFileRoute } from "@tanstack/react-router";
import { supabase, ensureSupabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/sso-silent")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: SSOSilentPage,
});

function SSOSilentPage() {
  if (typeof window !== "undefined") {
    void (async () => {
      await ensureSupabase();
      const auth = supabase?.auth;
      const originParam = new URLSearchParams(window.location.search).get("origin");
      const origin = originParam && /^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(originParam) ? originParam : "*";
      if (!auth) {
        window.parent?.postMessage({ type: "sso-session", hasSession: false }, origin);
        return;
      }
      const { data } = await auth.getSession();
      if (data.session) {
        window.parent?.postMessage({ type: "sso-session", hasSession: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in ?? 3600 }, origin);
      } else {
        window.parent?.postMessage({ type: "sso-session", hasSession: false }, origin);
      }
    })();
  }
  return null;
}
