/**
 * Shared Vertical Shell Component
 *
 * Provides a product-page layout for vertical landing pages.
 * Each vertical gets a distinctive hero, feature highlights, and a
 * "what's included" section — making each one feel like its own product.
 */

import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-chrome";
import type { VerticalDefinition } from "@/verticals";

interface VerticalShellProps {
  vertical: VerticalDefinition;
  children: ReactNode;
}

const ICON_PATHS: Record<string, string> = {
  Landmark: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6",
  Scale: "M12 3v18M5 7l-3 7h6L5 7zm14 0l-3 7h6l-3-7zM5 7h14M8 21h8",
  Clock: "M12 6v6l4 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z",
  ShieldAlert: "M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7l8-4zM12 8v4M12 16h.01",
  FileCheck: "M9 12l2 2 4-4M5 3h14v18l-7-3-7 3V3z",
  Home: "M3 12l9-9 9 9M5 10v10h14V10",
  FileText: "M5 3h10l4 4v14H5V3zM9 7h6M9 11h6M9 15h4",
  HeartPulse: "M3 12h3l3-8 3 16 3-8h6",
  ShieldCheck: "M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7l8-4zM9 12l2 2 4-4",
  FolderOpen: "M3 7l2-2h5l2 2h7v12H3V7z",
};

/**
 * Standard vertical landing page shell — product-page style.
 */
export function VerticalShell({ vertical, children }: VerticalShellProps) {
  const isLive = vertical.status === "live";
  const isSoon = vertical.status === "soon";
  const iconPath = ICON_PATHS[vertical.icon] ?? ICON_PATHS.FileText;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* Product Hero */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/products" className="hover:text-cobalt transition-colors">Products</Link>
              <span>/</span>
              <span className="text-foreground">{vertical.name}</span>
            </div>

            {/* Product header */}
            <div className="mt-8 flex items-start gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-rule bg-paper-deep">
                <svg className="h-8 w-8 text-cobalt" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d={iconPath} />
                </svg>
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{vertical.name}</h1>
                  {isLive && (
                    <span className="rounded bg-cobalt/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cobalt">Live</span>
                  )}
                  {isSoon && (
                    <span className="rounded border border-rule px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Coming Soon</span>
                  )}
                  {vertical.status === "planned" && (
                    <span className="rounded border border-rule px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">In Development</span>
                  )}
                </div>
                <p className="mt-2 text-lg text-ink-soft">{vertical.tagline}</p>
              </div>
            </div>

            {/* Description */}
            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {vertical.description}
            </p>

            {/* CTA */}
            <div className="mt-8">
              {isLive ? (
                <Link
                  to={vertical.route}
                  className="inline-flex items-center gap-2 rounded-md bg-cobalt px-6 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
                >
                  {vertical.primaryCTA}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/send"
                    className="inline-flex items-center gap-2 rounded-md bg-cobalt px-6 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
                  >
                    Upload a PDF
                  </Link>
                  <Link
                    to="/write"
                    search={{ template: undefined }}
                    className="inline-flex items-center rounded-md border border-rule px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Write a letter
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {vertical.capabilities.supportsMailing && (
                <FeatureBadge label="Certified Mail" icon="M22 12h-4l-3 9L9 3l-3 9H2" />
              )}
              {vertical.capabilities.requiresAI && (
                <FeatureBadge label="AI-Assisted" icon="M12 2a5 5 0 0 1 5 5c0 1.5-.5 3-1.5 4 .5 1 1.5 1.5 1.5 3a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3c0-1.5 1-2 1.5-3-1-1-1.5-2.5-1.5-4a5 5 0 0 1 5-5z" />
              )}
              {vertical.capabilities.supportsEvidence && (
                <FeatureBadge label="Evidence Upload" icon="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66z" />
              )}
              <FeatureBadge label="Proof of Delivery" icon="M9 12l2 2 4-4M5 3h14v18l-7-3-7 3V3z" />
            </div>
          </div>
        </section>

        {/* Vertical content (How it works, etc.) */}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function FeatureBadge({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rule bg-card">
        <svg className="h-4 w-4 text-cobalt" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
