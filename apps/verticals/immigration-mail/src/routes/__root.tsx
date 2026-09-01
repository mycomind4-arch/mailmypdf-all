import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider, useAuth } from "@/lib/auth";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Immigration Mail — Prepare and mail important immigration correspondence" },
      { name: "description", content: "Guided workflows to prepare, review, send, and track important immigration correspondence. Physical mail with proof of delivery. Not a law firm — you control the facts." },
      { name: "robots", content: "index,follow" }, { name: "theme-color", content: "#2a3340" },
      { property: "og:title", content: "Immigration Mail — Prepare and mail important immigration correspondence" },
      { property: "og:description", content: "Prepare, review, send, track, and keep a record of important immigration correspondence." },
      { property: "og:type", content: "website" }, { property: "og:site_name", content: "Immigration Mail" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Immigration Mail — Prepare and send immigration correspondence" },
      { name: "twitter:description", content: "Guided workflows, physical mail with tracking, and proof of delivery." },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }, { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss }, { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) { return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>; }

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><AuthProvider><CheckoutReturnHandler /><ProtectedWorkflowContent /></AuthProvider></QueryClientProvider>;
}

function ProtectedWorkflowContent() {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isWorkflowPath = path.startsWith("/workflows/");
  const isHub = path === "/workflows" || path === "/workflows/";
  const requiresAccount = isWorkflowPath && !isHub;

  if (!requiresAccount) return <Outlet />;
  if (loading) return <AuthGate loading />;
  if (!isConfigured || !user) return <AuthGate />;
  return <Outlet />;
}

function AuthGate({ loading = false }: { loading?: boolean }) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <div className="min-h-screen page-fade"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="postmark mx-auto w-fit">MailMyPDF Account</div><h1 className="mt-6 font-serif text-4xl">{loading ? "Loading your account…" : "Sign in to start this workflow."}</h1>{!loading && <><p className="mt-3 text-sm text-muted-foreground">Your workflow intake, uploaded documents, drafts, and mailing records are private to your account.</p><Link to={`/auth?returnTo=${returnTo}` as never} className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Sign in or create an account</Link></>}</main><SiteFooter /></div>;
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
    void fetch("/api/mail/response", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ stripeSessionId: sessionId }) }).then(async (response) => { const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.error || `Mailing submission failed (${response.status}).`); navigate({ to: "/dashboard", search: { mailing: "success", order: payload.providerOrderId || "" } as never); }).catch((error) => { navigate({ to: "/dashboard", search: { mailing: "error", message: error instanceof Error ? error.message : "Mailing submission failed." } as never }); });
  }, [user, accessToken, navigate]);
  return null;
}

function NotFoundPage() {
  return <div className="min-h-screen page-fade"><SiteHeader /><main className="mx-auto max-w-lg px-6 py-32 text-center"><div className="postmark mx-auto w-fit">404</div><h1 className="mt-6 text-6xl" style={{ fontFamily: "var(--font-serif)" }}>Lost in <span className="italic text-stamp">transit.</span></h1><p className="mt-4 text-muted-foreground">The page you're looking for doesn't exist or has moved. Let's get you back on track.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/" className="inline-flex items-center gap-2 rounded-full border border-input px-5 py-3 text-sm font-medium transition-colors hover:bg-muted">← Home</Link><Link to="/respond-to-a-uscis-notice" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5">View workflows</Link></div></main><SiteFooter /></div>;
}
