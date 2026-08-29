/**
 * Reusable vertical landing page template for MailMyPDF product verticals.
 *
 * Each vertical passes its config (name, tagline, description, features, etc.)
 * and gets a consistent, polished landing page with its own accent color.
 *
 * Usage in a route file:
 *   <VerticalLanding config={noticeResponseConfig} />
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Mail, Shield, Clock3, FileText, Sparkles } from "lucide-react";
import { SiteFooter } from "./site-chrome";
import type { LucideIcon } from "lucide-react";

export interface VerticalFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface VerticalStep {
  title: string;
  description: string;
}

export interface VerticalConfig {
  /** Product name, e.g. "NoticeResponse" */
  name: string;
  /** Short route path, e.g. "/notice-response" */
  route: string;
  /** One-line tagline shown in hero */
  tagline: string;
  /** Longer description for hero and meta */
  description: string;
  /** Meta description for SEO */
  metaDescription: string;
  /** Accent color — a hex color used for buttons, badges, highlights */
  accent: string;
  /** Light background tint (rgba or hex with alpha) */
  accentLight: string;
  /** 3-4 feature cards */
  features: VerticalFeature[];
  /** 3 how-it-works steps */
  steps: VerticalStep[];
  /** Who it's for */
  audience: string;
  /** Whether the product is live or coming soon */
  status: "live" | "coming-soon";
  /** Optional: which MailMyPDF product it's powered by */
  poweredBy?: string;
}

export function VerticalLanding({ config }: { config: VerticalConfig }) {
  const { name, tagline, description, metaDescription, accent, accentLight, features, steps, audience, status, poweredBy } = config;

  return (
    <div className="min-h-screen bg-[#f3f1eb] text-[#1b211e] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1b211e]/10 bg-[#f3f1eb]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-10 items-center justify-center rounded-sm border border-[#1b211e]" style={{ backgroundColor: accent }}>
              <Mail size={15} className="text-white" />
            </span>
            <span className="font-serif text-xl tracking-tight">{name}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#1b211e]/55 md:flex">
            <Link to="/ecosystem" className="hover:text-[#1b211e] transition-colors">Ecosystem</Link>
            <Link to="/" className="hover:text-[#1b211e] transition-colors">MailMyPDF</Link>
            {status === "live" && (
              <Link to={config.route} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-medium text-white" style={{ backgroundColor: accent }}>
                Launch <ArrowRight size={14} />
              </Link>
            )}
            {status === "coming-soon" && (
              <span className="rounded-full border border-[#1b211e]/15 px-3 py-1 text-xs font-medium text-[#1b211e]/50">Coming soon</span>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#1b211e]/10">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
          {status === "coming-soon" && (
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: accentLight, color: accent }}>
              <Sparkles size={13} /> Coming Soon
            </span>
          )}
          {status === "live" && (
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: accentLight, color: accent }}>
              <Check size={13} /> Live
            </span>
          )}
          <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">{tagline}</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[#1b211e]/65">{description}</p>
          <p className="mt-3 text-sm text-[#1b211e]/45">For {audience}</p>
          <div className="mt-10 flex items-center justify-center gap-3">
            {status === "live" ? (
              <>
                <Link to={config.route} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5" style={{ backgroundColor: accent }}>
                  Get started <ArrowRight size={16} />
                </Link>
                <Link to="/ecosystem" className="rounded-full border border-[#1b211e]/20 px-6 py-3 text-sm font-medium hover:border-[#1b211e]/40">
                  See how it works
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5" style={{ backgroundColor: accent }}>
                  Join the waitlist <ArrowRight size={16} />
                </Link>
                <Link to="/ecosystem" className="rounded-full border border-[#1b211e]/20 px-6 py-3 text-sm font-medium hover:border-[#1b211e]/40">
                  Explore the ecosystem
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-[#1b211e]/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center font-serif text-3xl md:text-4xl">What {name} does</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-[#1b211e]/55">Built for the real world — not a chatbot, but a workflow that produces a mailed, tracked, provable document.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="rounded-2xl border border-[#1b211e]/10 bg-white p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: accentLight }}>
                    <Icon size={22} style={{ color: accent }} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#1b211e]/60">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-[#1b211e]/10 bg-[#faf9f6]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-center font-serif text-3xl md:text-4xl">How it works</h2>
          <div className="mt-12 space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: accent }}>
                  {i + 1}
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-[#1b211e]/60">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-b border-[#1b211e]/10">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1b211e]/15 px-4 py-1.5 text-xs font-medium text-[#1b211e]/55">
            Part of the MailMyPDF ecosystem
          </div>
          <h2 className="mt-6 font-serif text-3xl md:text-4xl">One platform. Many verticals.</h2>
          <p className="mx-auto mt-4 max-w-lg text-[#1b211e]/60">
            {name} is built on MailMyPDF's delivery infrastructure — USPS mailing, tracking, certified mail, and proof of service.
            {poweredBy ? ` Powered by ${poweredBy}.` : ""} Every document is printed, mailed, and tracked with evidence-grade custody.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/ecosystem" className="rounded-full border border-[#1b211e]/20 px-5 py-2.5 text-sm font-medium hover:border-[#1b211e]/40">
              Explore the ecosystem
            </Link>
            <Link to="/proof-of-service" className="rounded-full border border-[#1b211e]/20 px-5 py-2.5 text-sm font-medium hover:border-[#1b211e]/40">
              ProofOfService
            </Link>
            <Link to="/fair-process" className="rounded-full border border-[#1b211e]/20 px-5 py-2.5 text-sm font-medium hover:border-[#1b211e]/40">
              FairProcess
            </Link>
            {config.route !== "/appeal-reply" && (
              <Link to="/appeal-reply" className="rounded-full border border-[#1b211e]/20 px-5 py-2.5 text-sm font-medium hover:border-[#1b211e]/40">
                AppealReply
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1b211e] py-20 text-center text-[#f3f1eb]">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-serif text-3xl md:text-4xl">{status === "live" ? "Ready to get started?" : "Be the first to know."}</h2>
          <p className="mx-auto mt-4 max-w-md text-[#f3f1eb]/65">
            {status === "live"
              ? `${name} is live. Upload your document and we'll handle the rest.`
              : `${name} is coming soon. Join the waitlist and we'll let you know the moment it launches.`}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {status === "live" ? (
              <Link to={config.route} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[#1b211e] transition-transform hover:-translate-y-0.5" style={{ backgroundColor: accent }}>
                Launch {name} <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to="/" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[#1b211e] transition-transform hover:-translate-y-0.5" style={{ backgroundColor: accent }}>
                Join the waitlist <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// ── Common icon exports for convenience ──────────────────────────────────────
export { Mail, Shield, Clock3, FileText, ArrowRight, Check, Sparkles };
