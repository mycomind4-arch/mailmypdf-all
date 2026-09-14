/**
 * MailMyPDF (main site) — Ecosystem Shell Config
 *
 * The main site is the canonical home for "Mail a PDF".
 * mailPdfUrl is internal (/mail-a-pdf), not external.
 */
import { supabase, ensureSupabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { EcosystemShellConfig } from "./ecosystem-shell";

export function useShellConfig(): EcosystemShellConfig {
  const [user, setUser] = useState<{ email: string; fullName?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function initialize() {
      await ensureSupabase();
      if (!active) return;
      const auth = supabase.auth;
      if (!auth) { setLoading(false); return; }
      let observedEvent = false;
      const applyUser = (sessionUser: User | undefined) => {
        if (!active) return;
        setUser(sessionUser ? {
          email: sessionUser.email ?? "",
          fullName: sessionUser.user_metadata?.full_name ?? sessionUser.user_metadata?.fullName,
          // Profile metadata is user-editable and must not supply a role.
        } : null);
        setLoading(false);
      };
      const { data: listener } = auth.onAuthStateChange((_event, session) => {
        observedEvent = true;
        applyUser(session?.user);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
      const { data } = await auth.getSession();
      if (!observedEvent) applyUser(data.session?.user);
    }
    void initialize().catch(() => {
      if (active) {
        setUser(null);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    brand: "MailMyPDF",
    brandTagline: "Important documents. Delivered further.",
    mailPdfUrl: "/mail-a-pdf",
    workflowsUrl: "/ecosystem",
    howItWorksUrl: "/how-it-works",
    pricingUrl: "/pro",
    authUrl: "/auth",
    startUrl: "/start",
    dashboardUrl: "/dashboard",
    productsUrl: "/products",
    currentProductSlug: "mailmypdf",
    caseTerm: "Cases",
    ctaLabel: "Start a Workflow",
    theme: "default",
    auth: { user, loading, signOut },
  };
}
