/**
 * Appeal Mail — Ecosystem Shell Config
 *
 * Wires the shared EcosystemShell component with Appeal Mail's auth and routes.
 */

import { useAuth } from "@/lib/auth";
import type { EcosystemShellConfig } from "./ecosystem-shell";

export function useShellConfig(): EcosystemShellConfig {
  const { user, loading, signOut } = useAuth();

  return {
    brand: "Appeal Mail",
    brandTagline: "A MailMyPDF product",
    mailPdfUrl: "https://mailmypdf-etc.pages.dev/mail-a-pdf",
    workflowsUrl: "/workflows",
    howItWorksUrl: "/how-it-works",
    pricingUrl: "/pricing",
    authUrl: "/auth",
    startUrl: "/start",
    dashboardUrl: "/dashboard",
    productsUrl: "/products",
    currentProductSlug: "appeal-mail",
    caseTerm: "Cases",
    ctaLabel: "Start Now",
    theme: "default",
    auth: {
      user: user ? {
        email: user.email ?? "",
        fullName: user.fullName,
        role: user.role,
      } : null,
      loading,
      signOut,
    },
  };
}
