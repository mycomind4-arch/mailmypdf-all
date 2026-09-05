import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Home, ArrowRight, ShieldAlert } from "lucide-react";
import "../../../../../packages/design-system/src/tokens.css";
import "../../../../../packages/design-system/src/patterns.css";
import "../../../../../packages/design-system/src/workspace.css";
import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider, useAuth } from "@/lib/auth";

const SITE_ORIGIN = "https://dispute-mail.pages.dev";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dispute Mail — Dispute credit errors, debt, and billing issues with confidence" },
      { name: "description", content: "Guided workflows to prepare, review, send, and track dispute letters for credit report errors, debt validation, billing errors, and unauthorized charges. Physical mail with proof of delivery. Not a law firm — you control the facts." },
      { name: "robots", content: "index,follow" }, { name: "theme-color", content: "#2a2d3f" },
      { property: "og:title", content: "Dispute Mail — Dispute credit errors, debt, and billing issues with confidence" },
      { property: "og:description", content: "Prepare, review, send, track, and keep a record of your dispute letters." },
      { property: "og:type", content: "website" }, { property: "og:site_name", content: "Dispute Mail" },
      { property: "og:url", content: SITE_ORIGIN + "/" }, { property: "og:image", content: SITE_ORIGIN + "/og-image.png" },
      { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dispute Mail — Prepare and send dispute letters" },
      { name: "twitter:description", content: "Guided workflows, physical mail with tracking, and proof of delivery." },
      { name: "twitter:image", content: SITE_ORIGIN + "/og-image.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "canonical", href: SITE_ORIGIN + "/" }, { rel: "stylesheet", href: appCss },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) { return <html lang="en"><head><HeadContent /></head><body data-mmp-theme="dispute-mail">{children}<Scripts /></body></html>; }

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><AuthProvider><CheckoutReturnHandler /><ProtectedWorkflowContent /></AuthProvider></QueryClientProvider>;
}

function ProtectedWorkflowContent() {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const workflowPath = path.startsWith("/workflows/");
  const isHub = path === "/workflows" || path === "/workflows/";
  const isLanding = /^\/workflows\/[^/]+\/?$/.test(path);
  const protectedPrefixes = ["/dashboard", "/account"];
  const requiresAccount = protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) || (workflowPath && !isHub && !isLanding);

  if (!requiresAccount) return <Outlet />;
  if (loading) return <AuthGate message="Loading your MailMyPDF Account…" />;
  if (!isConfigured || !user) return <AuthGate />;
  return <Outlet />;
}

function AuthGate({ message }: { message?: string }) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <div className="min-h-screen bg-cream"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="eyebrow">MailMyPDF Account</div><h1 className="mt-6 text-4xl" style={{ fontFamily: "var(--font-serif)" }}>{message || "Sign in to continue."}</h1><p className="mt-3 mx-auto max-w-xl text-sm leading-6 text-slate-500">Your dispute workspace, workflow intake, uploaded documents, drafts, and mailing records are private to your account.</p>{!message && <Link to={`/auth?returnTo=${returnTo}` as never} className="mt-8 inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper">Sign in or create an account <ArrowRight size={16} className="ml-2" /></Link>}</main><SiteFooter /></div>;
}

function CheckoutReturnHandler() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const processed = useRef(false);
  useEffect(() => {
    if (processed.current || !user || !accessToken || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkout === "cancelled") { processed.current = true; navigate({ to: "/dashboard", search: { mailing: "cancelled" } as never }); return; }
    if (checkout !== "success" || !sessionId) return;
    processed.current = true;
    void fetch("/api/mail/response", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ stripeSessionId: sessionId }) }).then(async (response) => { const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.error || `Mailing submission failed (${response.status}).`); navigate({ to: "/dashboard", search: { mailing: "success", order: payload.providerOrderId || "" } as never); }).catch((error) => navigate({ to: "/dashboard", search: { mailing: "error", message: error instanceof Error ? error.message : "Mailing submission failed." } as never }));
  }, [user, accessToken, navigate]);
  return null;
}

function NotFoundPage() {
  return <main className="min-h-screen bg-cream"><SiteHeader /><section className="py-20 md:py-32"><div className="container max-w-lg text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: "color-mix(in oklab, var(--stamp) 10%, transparent)" }}><ShieldAlert size={36} className="text-stamp" /></div><h1 className="mt-8 text-6xl" style={{ fontFamily: "var(--font-serif)" }}>404</h1><h2 className="mt-2 text-xl font-semibold text-ink-soft">This item is being disputed elsewhere</h2><p className="mt-3 text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved. Let's get you back on track.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/" className="btn-primary"><Home size={16} /> Back to home</Link><Link to="/workflows/credit-report" className="btn-amber">View a dispute workflow <ArrowRight size={16} /></Link></div></div></section><SiteFooter /></main>;
}