/**
 * Notice Respond — Ecosystem Shell Config
 */
import { useAuth } from "@/lib/auth";
import type { EcosystemShellConfig } from "./ecosystem-shell";

export function useShellConfig(): EcosystemShellConfig {
  const { user, loading, signOut } = useAuth();
  return {
    brand: "Notice Respond",
    brandTagline: "A MailMyPDF product",
    mailPdfUrl: "https://mailmypdf-etc.pages.dev/mail-a-pdf",
    workflowsUrl: "/workflows",
    howItWorksUrl: "/how-it-works",
    pricingUrl: "/pricing",
    authUrl: "/auth",
    startUrl: "/start",
    dashboardUrl: "/dashboard",
    productsUrl: "/products",
    currentProductSlug: "notice-respond",
    caseTerm: "Cases",
    ctaLabel: "Start Now",
    theme: "default",
    auth: {
      user: user ? { email: user.email ?? "", fullName: (user as any).fullName, role: (user as any).role } : null,
      loading,
      signOut,
    },
  };
}
