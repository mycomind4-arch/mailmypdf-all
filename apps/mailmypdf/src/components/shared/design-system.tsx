import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/* ── SectionHeader ─────────────────────────────────────────────────────────── */

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const isCenter = align === "center";
  return (
    <div className={`${isCenter ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2 className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl">{title}</h2>
      {subtitle && (
        <p
          className={`mt-4 text-base leading-7 text-muted-foreground sm:text-lg ${isCenter ? "mx-auto" : ""}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ── CTAButton ─────────────────────────────────────────────────────────────── */

export function CTAButton({
  to,
  children,
  variant = "primary",
  className = "",
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const base = "inline-flex items-center gap-2 text-sm font-medium transition-all duration-200";
  const styles = {
    primary:
      "rounded-full bg-cobalt px-6 py-3.5 text-white shadow-stamp hover:-translate-y-0.5 hover:bg-cobalt/90",
    secondary:
      "rounded-full border border-rule bg-card px-6 py-3.5 text-foreground hover:border-ink/20 hover:bg-paper-deep",
    ghost: "text-cobalt hover:text-cobalt/80",
  };
  return (
    <Link to={to} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/* ── CTASection ────────────────────────────────────────────────────────────── */

export function CTASection({
  title,
  subtitle,
  primaryCTA = { label: "Send a Document", to: "/send" },
  secondaryCTA,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  primaryCTA?: { label: string; to: string };
  secondaryCTA?: { label: string; to: string };
}) {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2 className="text-4xl sm:text-5xl md:text-6xl">{title}</h2>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to={primaryCTA.to}
            className="inline-flex items-center gap-2 rounded-full bg-cobalt px-7 py-3.5 text-sm font-medium text-white shadow-stamp transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt/90"
          >
            {primaryCTA.label} <ArrowRight className="h-4 w-4" />
          </Link>
          {secondaryCTA && (
            <Link
              to={secondaryCTA.to}
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-paper-deep"
            >
              {secondaryCTA.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── TrustStrip ─────────────────────────────────────────────────────────────── */

export function TrustStrip({
  items,
}: {
  items: { icon: ReactNode; label: string; description?: string }[];
}) {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 md:gap-x-8">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rule bg-card text-cobalt">
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── ProcessSteps ───────────────────────────────────────────────────────────── */

export function ProcessSteps({
  steps,
}: {
  steps: { number: string; title: string; text: string }[];
}) {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {steps.map((step, i) => (
        <div key={i} className="envelope-card envelope-card-hover p-7">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm font-medium text-cobalt">{step.number}</span>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <h3 className="mt-4 font-serif text-2xl">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ── WorkflowCard ───────────────────────────────────────────────────────────── */

export function WorkflowCard({
  href,
  label,
  title,
  description,
  capabilities = [],
}: {
  href: string;
  label: string;
  title: string;
  description: string;
  capabilities?: string[];
}) {
  return (
    <a href={href} className="group envelope-card envelope-card-hover flex flex-col p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cobalt">
            {label}
          </div>
          <h3 className="mt-2 font-serif text-2xl">{title}</h3>
        </div>
        <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-cobalt" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      {capabilities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {capabilities.map((cap) => (
            <span
              key={cap}
              className="rounded-full bg-paper-deep px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {cap}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

/* ── ProofTimeline ──────────────────────────────────────────────────────────── */

export function ProofTimeline({
  steps,
}: {
  steps: { label: string; description: string; active?: boolean }[];
}) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                step.active
                  ? "bg-cobalt text-white"
                  : "border border-rule bg-card text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-12 w-px ${step.active ? "bg-cobalt/30" : "bg-rule"}`} />
            )}
          </div>
          <div className="pb-6">
            <div
              className={`text-sm font-medium ${step.active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {step.label}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{step.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── FAQ (static, non-accordion) ─────────────────────────────────────────────── */

export function FAQList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-rule">
      {items.map((item, i) => (
        <div key={i} className="py-5">
          <h3 className="font-medium text-foreground">{item.q}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
        </div>
      ))}
    </div>
  );
}

/* ── StatusBadge ─────────────────────────────────────────────────────────────── */

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-paper-deep text-muted-foreground",
    paid: "bg-cobalt/10 text-cobalt",
    submitted_to_provider: "bg-cobalt/10 text-cobalt",
    provider_processing: "bg-cobalt/10 text-cobalt",
    mailed: "bg-emerald-50 text-emerald-700",
    in_transit: "bg-emerald-50 text-emerald-700",
    delivered: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-paper-deep text-muted-foreground",
    refunded: "bg-paper-deep text-muted-foreground",
  };
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`proof-badge ${styles[status] ?? "bg-paper-deep text-muted-foreground"}`}>
      {label}
    </span>
  );
}

/* ── DocumentPreview ─────────────────────────────────────────────────────────── */

export function DocumentPreview({
  title,
  pages,
  size,
  recipient,
  mailMethod,
}: {
  title: string;
  pages?: number;
  size?: string;
  recipient?: string;
  mailMethod?: string;
}) {
  return (
    <div className="envelope-card p-5">
      <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Document
          </div>
          <div className="mt-1.5 truncate text-base font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {pages && (
              <span>
                {pages} page{pages !== 1 ? "s" : ""}
              </span>
            )}
            {pages && size && <span> · </span>}
            {size && <span>{size}</span>}
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rule bg-paper-deep text-cobalt">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      </div>
      {(recipient || mailMethod) && (
        <div className="mt-4 space-y-2">
          {recipient && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-medium text-foreground">{recipient}</span>
            </div>
          )}
          {mailMethod && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Mailing</span>
              <span className="font-medium text-foreground">{mailMethod}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
