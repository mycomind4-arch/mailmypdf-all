/**
 * MailMyPDF (main site) — Ecosystem Shell Config
 *
 * The main site is the canonical home for "Mail a PDF".
 * mailPdfUrl is internal (/mail-a-pdf), not external.
 */
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { EcosystemShellConfig } from "./ecosystem-shell";

export function useShellConfig(): EcosystemShellConfig {
  const [user, setUser] = useState<{ email: string; fullName?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase.auth) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        setUser({
          email: data.session.user.email ?? "",
          fullName: (data.session.user.user_metadata?.fullName as string) ?? undefined,
          role: (data.session.user.user_metadata?.role as string) ?? undefined,
        });
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser({
          email: session.user.email ?? "",
          fullName: (session.user.user_metadata?.fullName as string) ?? undefined,
          role: (session.user.user_metadata?.role as string) ?? undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
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
    ctaLabel: "Start Now",
    theme: "default",
    auth: { user, loading, signOut },
  };
}
