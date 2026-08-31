import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/* ── Logo / Wordmark ─────────────────────────────────────────────────── */
export function Logo() {
  return (
    <span aria-hidden className="relative inline-flex h-8 w-9 items-center justify-center rounded-sm border border-ink/20 bg-paper-deep overflow-hidden">
      <span className="absolute inset-x-1.5 top-1.5 h-[6px] border-b border-ink/30" />
      <span className="absolute right-1 top-1.5 h-2 w-2 rounded-[1px] bg-brass/70" />
      <span className="absolute bottom-1.5 left-1.5 right-1.5 h-px bg-ink/15" />
      <span className="absolute bottom-1 left-1.5 h-3 w-[2px] bg-brass/50" />
    </span>
  );
}

/* ── Button ───────────────────────────────────────────────────────────── */
export function Button({
  children,
  variant = "primary",
  to,
  href,
  onClick,
  disabled,
  type = "button",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  to?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  [key: string]: unknown;
}) {
  const cls = `btn-${variant} ${className}`;
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  return <button type={type} className={cls} onClick={onClick} disabled={disabled} {...rest}>{children}</button>;
}

/* ── Badge ────────────────────────────────────────────────────────────── */
export function Badge({
  children,
  variant = "brass",
  className = "",
}: {
  children: ReactNode;
  variant?: "brass" | "navy" | "success" | "muted" | "amber";
  className?: string;
}) {
  return <span className={`badge-base badge-${variant} ${className}`}>{children}</span>;
}

/* ── Card ─────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`envelope-card ${hover ? "envelope-card-hover" : ""} ${className}`}>{children}</div>;
}

/* ── Section Header ───────────────────────────────────────────────────── */
export function SectionHeader({
  eyebrow,
  title,
  description,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">{title}</h2>
      {description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
    </div>
  );
}

/* ── Page Header ───────────────────────────────────────────────────────── */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl">{title}</h1>
      {description && <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

/* ── Breadcrumbs ──────────────────────────────────────────────────────── */
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {item.to ? (
            <Link to={item.to} className="hover:text-foreground transition-colors">{item.label}</Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="text-rule">/</span>}
        </span>
      ))}
    </nav>
  );
}

/* ── ProgressRail (vertical step indicator) ───────────────────────────── */
export function ProgressRail({
  steps,
  current,
}: {
  steps: { id: string; label: string }[];
  current: number;
}) {
  return (
    <div className="progress-rail">
      {steps.map((step, i) => {
        const isCompleted = i < current;
        const isCurrent = i === current;
        return (
          <div key={step.id} className="relative flex items-center gap-3 pb-5 pl-0">
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isCompleted
                  ? "border-navy bg-navy text-paper"
                  : isCurrent
                  ? "border-brass bg-card"
                  : "border-rule bg-card"
              }`}
            >
              {isCompleted && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isCurrent && <span className="h-2 w-2 rounded-full bg-brass" />}
            </span>
            <span className={`text-sm ${isCompleted || isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="absolute left-[11px] top-6 h-[calc(100%-0.75rem)] w-[2px] bg-rule" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── StatusIndicator ───────────────────────────────────────────────────── */
export function StatusIndicator({ status }: { status: string }) {
  const variant: "brass" | "navy" | "success" | "muted" | "amber" =
    status === "delivered" || status === "completed" || status === "active" ? "success" :
    status === "in_transit" || status === "pending" || status === "draft" ? "brass" :
    status === "cancelled" || status === "error" ? "amber" :
    "muted";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

/* ── Alert ─────────────────────────────────────────────────────────────── */
export function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: "info" | "warning" | "error" | "success";
  children: ReactNode;
  className?: string;
}) {
  return <div className={`alert alert-${variant} ${className}`}>{children}</div>;
}

/* ── EmptyState ────────────────────────────────────────────────────────── */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3 className="font-serif text-xl text-foreground">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ── FormSection ───────────────────────────────────────────────────────── */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="font-serif text-lg text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ── ProvenanceBadge ───────────────────────────────────────────────────── */
export function ProvenanceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    user: "User provided",
    document: "Document extracted",
    ai: "AI suggested",
    system: "System generated",
    external: "External source",
  };
  return <Badge variant="muted">{labels[source] ?? source}</Badge>;
}

/* ── Icons ────────────────────────────────────────────────────────────── */
export function ArrowRight() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
}
export function CheckIcon() {
  return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}
