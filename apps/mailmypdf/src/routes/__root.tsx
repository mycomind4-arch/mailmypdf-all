import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "../../../../packages/design-system/src/tokens.css";
import "../../../../packages/design-system/src/patterns.css";
import appCss from "../styles.css?url";
import { AnalyticsConsent } from "../components/analytics-consent";
import { startPageTracking } from "../lib/analytics";
import { reportLovableError } from "../lib/lovable-error-reporting";

// Analytics domain — when set, Plausible loads. Privacy-friendly, no cookies.
const ANALYTICS_DOMAIN = process.env.PUBLIC_PLAUSIBLE_DOMAIN || process.env.PLAUSIBLE_DOMAIN;
const ANALYTICS_SCRIPT = ANALYTICS_DOMAIN
  ? `https://plausible.io/js/script.js`
  : null;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="postmark mx-auto mb-6">404 — Not found</div>
        <h1 className="text-7xl text-foreground">404</h1>
        <h2 className="mt-4 text-xl text-foreground">This page never made it to the mailbox</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The address you followed doesn't match anything we have on file.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-cobalt px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cobalt/90"
          >
            Back to MailMyPDF
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cobalt/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MailMyPDF — Mail a PDF letter without a printer" },
      { name: "description", content: "Upload a PDF, enter an address, and we'll print, stamp, and mail it via USPS. U.S. domestic mail from $4.99. No account required." },
      { name: "author", content: "MailMyPDF" },
      { property: "og:title", content: "MailMyPDF — Mail a PDF letter without a printer" },
      { property: "og:description", content: "Upload a PDF, enter an address, and we'll print, stamp, and mail it via USPS. U.S. domestic mail from $4.99. No account required." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MailMyPDF — Mail a PDF letter without a printer" },
      { name: "twitter:description", content: "Upload a PDF, enter an address, and we'll print, stamp, and mail it via USPS. U.S. domestic mail from $4.99. No account required." },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: ANALYTICS_DOMAIN
      ? [
          {
            src: ANALYTICS_SCRIPT!,
            defer: true,
            "data-domain": ANALYTICS_DOMAIN,
          },
        ]
      : [],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body data-mmp-theme="mailmypdf">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const cleanup = startPageTracking();
    const handleConsent = () => {
      startPageTracking();
    };
    window.addEventListener("mmp-consent-changed", handleConsent);
    return () => {
      cleanup();
      window.removeEventListener("mmp-consent-changed", handleConsent);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <AnalyticsConsent />
    </QueryClientProvider>
  );
}
