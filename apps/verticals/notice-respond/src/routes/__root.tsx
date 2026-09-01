import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Link, Outlet, Scripts, createRootRouteWithContext, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider, useAuth } from "@/lib/auth";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Notice Respond — Respond to government notices with confidence" },
      { name: "description", content: "Guided workflows to prepare, review, send, and track responses to IRS notices, court summonses, agency actions, and appeals. Physical mail with proof of delivery. Not a law firm." },
      { name: "robots", content: "index,follow" }, { name: "theme-color", content: "#1e293b" },
      { property: "og:title", content: "Notice Respond — Respond to government notices with confidence" },
      { property: "og:description", content: "Prepare, review, send, track, and keep a record of responses to government notices." },
      { property: "og:type", content: "website" }, { property: "og:site_name", content: "Notice Respond" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Notice Respond — Respond to government notices" },
      { name: "twitter:description", content: "Guided workflows, physical mail with tracking, and proof of delivery." },
    ],
    links: [
      { rel: "stylesheet", href: appCss }, { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
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
  return <ErrorBoundary><QueryClientProvider client={queryClient}><AuthProvider><ProtectedContent /></AuthProvider></QueryClientProvider></ErrorBoundary>;
}

function ProtectedContent() {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isWorkflowPath = path.startsWith("/workflows/");
  const isHub = path === "/workflows" || path === "/workflows/";
  const isLanding = /^\/workflows\/[^/]+\/landing\/?$/.test(path);
  const protectedPrefixes = ["/dashboard", "/account", "/workflows/analyze"];
  const requiresAccount = protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) || (isWorkflowPath && !isHub && !isLanding);

  if (!requiresAccount) return <Outlet />;
  if (loading) return <AuthGate message="Loading your MailMyPDF Account…" />;
  if (!isConfigured || !user) return <AuthGate />;
  return <Outlet />;
}

function AuthGate({ message }: { message?: string }) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="postmark mx-auto w-fit">MailMyPDF Account</div><h1 className="mt-6 font-serif text-4xl">{message || "Sign in to start this workflow."}</h1><p className="mt-3 max-w-xl mx-auto text-sm text-muted-foreground">Workflow intake, uploaded documents, drafts, and mailing records are private to your account. Sign in or create an account to begin.</p>{!message && <Link to={`/auth?returnTo=${returnTo}` as never} className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Sign in or create an account</Link>}</main><SiteFooter /></div>;
}

function NotFoundPage() {
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-lg px-6 py-32 text-center"><div className="postmark mx-auto w-fit">404</div><h1 className="mt-6 font-serif text-5xl">Filed in the <span className="italic text-stamp">wrong place.</span></h1><p className="mt-4 text-muted-foreground">The page you're looking for doesn't exist or has moved. Let's get you back on track.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/" className="inline-flex items-center rounded-full border border-input px-5 py-3 text-sm font-medium transition-colors hover:bg-muted">← Home</Link><Link to="/workflows/" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card">View workflows</Link></div></main><SiteFooter /></div>;
}
