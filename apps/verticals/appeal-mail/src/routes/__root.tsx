import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, ArrowRight, Stamp } from "lucide-react";
import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider, useAuth } from "@/lib/auth";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Appeal Mail — Understand the Decision. Build the Appeal. Mail It." },
      { name: "description", content: "Understand adverse decisions, organize evidence, build supported appeals, and mail them with proof of delivery. A MailMyPDF product." },
      { name: "robots", content: "index,follow" },
      { name: "theme-color", content: "#2a2d3f" },
      { property: "og:title", content: "Appeal Mail — Understand the Decision. Build the Appeal. Mail It." },
      { property: "og:description", content: "Analyze decisions, organize evidence, build supported appeals, and send with proof of delivery. A MailMyPDF product." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Appeal Mail" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Appeal Mail — Understand the Decision. Build the Appeal. Mail It." },
      { name: "twitter:description", content: "Guided workflows, physical mail with tracking, and proof of delivery. A MailMyPDF product." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><AuthProvider><ProtectedWorkflowContent /></AuthProvider></QueryClientProvider>;
}

function ProtectedWorkflowContent() {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const workflowPath = path.startsWith("/workflows/");
  const isHub = path === "/workflows" || path === "/workflows/";
  const isLanding = /^\/workflows\/[^/]+\/?$/.test(path);
  const requiresAccount = workflowPath && !isHub && !isLanding;

  if (!requiresAccount) return <Outlet />;
  if (loading) return <AuthGate message="Loading your MailMyPDF Account…" />;
  if (!isConfigured || !user) return <AuthGate />;
  return <Outlet />;
}

function AuthGate({ message }: { message?: string }) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <div className="min-h-screen bg-cream"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="postmark mx-auto w-fit">MailMyPDF Account</div><h1 className="mt-6 font-serif text-4xl">{message || "Sign in to start this workflow."}</h1><p className="mt-3 mx-auto max-w-xl text-sm leading-6 text-muted-foreground">Workflow intake, uploaded documents, drafts, and mailing records are private to your account. Sign in or create an account to begin.</p>{!message && <Link to={`/auth?returnTo=${returnTo}` as never} className="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper">Sign in or create an account <ArrowRight size={16} className="ml-2" /></Link>}</main><SiteFooter /></div>;
}

function NotFoundPage() {
  return <main className="min-h-screen bg-cream"><SiteHeader /><section className="py-20 md:py-32"><div className="container max-w-lg text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: "color-mix(in oklab, var(--stamp) 10%, transparent)" }}><Stamp size={36} className="text-stamp" /></div><h1 className="mt-8 text-6xl" style={{ fontFamily: "var(--font-serif)" }}>404</h1><h2 className="mt-2 text-xl font-semibold text-ink-soft">This ruling is being appealed elsewhere</h2><p className="mt-3 text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved. Let's get you back on track.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/" className="btn-primary"><Home size={16} /> Back to home</Link><Link to="/workflows/denied-claim" className="btn-amber">View an appeal workflow <ArrowRight size={16} /></Link></div></div></section><SiteFooter /></main>;
}
