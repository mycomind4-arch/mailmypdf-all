import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  Link,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/lib/auth";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "Private Office — High-stakes correspondence, professionally prepared, provably delivered",
      },
      {
        name: "description",
        content:
          "Private Office provides professional correspondence preparation, evidence organization, certified mailing, and proof of delivery for high-stakes matters. Part of the MailMyPDF ecosystem.",
      },
      { name: "robots", content: "index,follow" },
      { name: "theme-color", content: "#1E3A5F" },
      {
        property: "og:title",
        content: "Private Office — High-stakes correspondence, professionally prepared",
      },
      {
        property: "og:description",
        content:
          "Prepare, review, send, track, and document your most important correspondence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Private Office" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Private Office — High-stakes correspondence",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFoundPage() {
  return (
    <main className="min-h-screen bg-ivory">
      <SiteHeader />
      <section className="py-24 md:py-32">
        <div className="container max-w-lg text-center">
          <div className="font-mono text-xs text-stone tracking-widest uppercase">404</div>
          <h1 className="mt-6 text-5xl md:text-6xl text-charcoal">
            This page is not available
          </h1>
          <p className="mt-4 text-stone text-lg leading-relaxed">
            The page you're looking for doesn't exist or has moved.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">
              Back to home
            </Link>
            <Link to="/workflows" className="btn-outline">
              Explore Workflows
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
