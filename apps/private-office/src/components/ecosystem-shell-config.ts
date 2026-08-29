/**
 * Private Office — Ecosystem Shell Config
 */
import { useAuth } from "@/lib/use-auth";
import type { EcosystemShellConfig } from "./ecosystem-shell";

export function useShellConfig(): EcosystemShellConfig {
  const { user, loading, signOut } = useAuth();
  return {
    brand: "Private Office",
    brandTagline: "A MailMyPDF product",
    mailPdfUrl: "https://mailmypdf-etc.pages.dev/mail-a-pdf",
    workflowsUrl: "/workflows",
    howItWorksUrl: "/how-it-works",
    pricingUrl: "/pricing",
    authUrl: "/auth",
    startUrl: "/start",
    dashboardUrl: "/dashboard",
    productsUrl: "/products",
    currentProductSlug: "private-office",
    caseTerm: "Matters",
    ctaLabel: "Start a Matter",
    theme: "private-office",
    auth: {
      user: user ? { email: user?.email ?? "", fullName: user?.fullName, role: user?.role } : null,
      loading,
      signOut,
    },
  };
}
