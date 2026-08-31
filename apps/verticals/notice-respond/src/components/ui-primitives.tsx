/**
 * Notice Response — Shared UI Primitives
 *
 * Reusable design system components for the Notice Response product.
 * These are used across both the public/SEO layer and the command-center
 * application layer.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/* ════════════════════════════════════════════════════════════════════════
   SectionHeader
   ════════════════════════════════════════════════════════════════════════ */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className={`mt-3 text-sm leading-6 text-muted-foreground sm:text-base ${align === "center" ? "mx-auto" : ""} max-w-2xl`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Badge
   ════════════════════════════════════════════════════════════════════════ */
export function Badge({
  variant = "default",
  children,
  className = "",
}: {
  variant?: "default" | "success" | "warning" | "danger" | "outline" | "stamp";
  children: ReactNode;
  className?: string;
}) {
  const cls = {
    default: "badge badge-gray",
    success: "badge badge-green",
    warning: "badge badge-amber-warn",
    danger: "badge badge-red",
    outline: "badge badge-outline",
    stamp: "badge badge-amber",
  }[variant];
  return <span className={`${cls} ${className}`}>{children}</span>;
}

/* ════════════════════════════════════════════════════════════════════════
   ProvenanceBadge
   ════════════════════════════════════════════════════════════════════════ */
export function ProvenanceBadge({ source }: { source: "user" | "document" | "ai" | "system" }) {
  const labels = { user: "You", document: "Document", ai: "AI suggestion", system: "System" };
  const cls = {
    user: "provenance-badge provenance-user",
    document: "provenance-badge provenance-doc",
    ai: "provenance-badge provenance-ai",
    system: "provenance-badge provenance-system",
  };
  return <span className={cls[source]}>{labels[source]}</span>;
}

/* ════════════════════════════════════════════════════════════════════════
   StatusIndicator
   ════════════════════════════════════════════════════════════════════════ */
export function StatusIndicator({
  status,
  label,
}: {
  status: "complete" | "current" | "future" | "blocked";
  label: string;
}) {
  const dotCls = {
    complete: "status-dot status-dot-green",
    current: "status-dot status-dot-amber",
    future: "status-dot status-dot-gray",
    blocked: "status-dot status-dot-red",
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={dotCls} />
      <span className="text-xs font-medium">{label}</span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Card
   ════════════════════════════════════════════════════════════════════════ */
export function Card({
  children,
  className = "",
  variant = "default",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "flat";
  hover?: boolean;
}) {
  const cls = {
    default: "card",
    elevated: "card-elevated",
    flat: "card-flat",
  }[variant];
  return <div className={`${cls} ${hover ? "card-hover" : ""} ${className}`}>{children}</div>;
}

/* ════════════════════════════════════════════════════════════════════════
   EmptyState
   ════════════════════════════════════════════════════════════════════════ */
export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaTo,
  icon,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="font-serif text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Alert
   ════════════════════════════════════════════════════════════════════════ */
export function Alert({
  variant = "info",
  title,
  children,
  action,
}: {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const cls = {
    info: "alert alert-info",
    success: "alert alert-success",
    warning: "alert alert-warning",
    danger: "alert alert-danger",
  }[variant];
  return (
    <div className={cls}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="flex items-start justify-between gap-3">
        <div>{children}</div>
        {action}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ProgressRail — Response Lifecycle
   ════════════════════════════════════════════════════════════════════════ */
export interface LifecycleStep {
  id: string;
  label: string;
}

export const RESPONSE_LIFECYCLE: LifecycleStep[] = [
  { id: "intake", label: "Intake" },
  { id: "understand", label: "Understand" },
  { id: "facts", label: "Facts" },
  { id: "evidence", label: "Evidence" },
  { id: "timeline", label: "Timeline" },
  { id: "findings", label: "Findings" },
  { id: "strategy", label: "Response Path" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "approval", label: "Approval" },
  { id: "payment", label: "Payment" },
  { id: "mailing", label: "Mailing" },
  { id: "proof", label: "Proof" },
];

export function ProgressRail({
  steps = RESPONSE_LIFECYCLE,
  currentStep,
  completedSteps = 0,
  blockedStep,
}: {
  steps?: LifecycleStep[];
  currentStep: number;
  completedSteps?: number;
  blockedStep?: number;
}) {
  return (
    <nav className="lifecycle-rail" aria-label="Response lifecycle">
      {steps.map((step, i) => {
        const status = blockedStep === i ? "blocked" : i < completedSteps ? "completed" : i === currentStep ? "current" : "future";
        return (
          <div key={step.id} className={`lifecycle-step ${status}`}>
            <div className="lifecycle-step-marker">
              {status === "completed" ? "✓" : String(i + 1).padStart(2, "0")}
            </div>
            <div className="lifecycle-step-label">{step.label}</div>
          </div>
        );
      })}
    </nav>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DeadlineIndicator
   ════════════════════════════════════════════════════════════════════════ */
export function DeadlineIndicator({
  date,
  daysLeft,
  label = "Response date",
  source,
}: {
  date?: string;
  daysLeft?: number;
  label?: string;
  source?: string;
}) {
  if (!date) {
    return (
      <div className="rounded-lg border border-rule p-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-semibold text-muted-foreground">Not established</div>
      </div>
    );
  }
  const urgency = daysLeft === undefined ? "unknown" : daysLeft < 0 ? "expired" : daysLeft <= 7 ? "urgent" : daysLeft <= 30 ? "upcoming" : "comfortable";
  const urgencyCls = {
    expired: "text-danger border-danger-border bg-danger-bg",
    urgent: "text-warning border-warning-border bg-warning-bg",
    upcoming: "text-foreground border-rule bg-card",
    comfortable: "text-foreground border-rule bg-card",
    unknown: "text-muted-foreground border-rule bg-card",
  }[urgency];
  return (
    <div className={`rounded-lg border p-3 ${urgencyCls}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      {daysLeft !== undefined && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
        </div>
      )}
      {source && <div className="mt-1 text-xs italic text-muted-foreground">Source: {source}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   EvidenceItem
   ════════════════════════════════════════════════════════════════════════ */
export function EvidenceItem({
  description,
  status,
  source,
  linkedDoc,
  date,
  action,
}: {
  description: string;
  status: "required" | "missing" | "provided" | "verified" | "conflict";
  source?: string;
  linkedDoc?: string;
  date?: string;
  action?: ReactNode;
}) {
  return (
    <div className="evidence-row">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="evidence-status {status}">{status}</span>
        </div>
        <p className="mt-1 text-sm text-foreground">{description}</p>
        {(source || date || linkedDoc) && (
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {source && <span>Source: {source}</span>}
            {date && <span>{date}</span>}
            {linkedDoc && <span>Linked: {linkedDoc}</span>}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   FactItem
   ════════════════════════════════════════════════════════════════════════ */
export function FactItem({
  label,
  value,
  provenance,
  confidence,
  action,
}: {
  label: string;
  value: string;
  provenance: "user" | "document" | "ai" | "system";
  confidence?: "high" | "medium" | "low";
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-rule bg-card p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <ProvenanceBadge source={provenance} />
          {confidence && (
            <span className="text-xs text-muted-foreground">
              {confidence} confidence
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{value}</p>
      </div>
      {action}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Breadcrumbs
   ════════════════════════════════════════════════════════════════════════ */
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumbs">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-rule">/</span>}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Timeline
   ════════════════════════════════════════════════════════════════════════ */
export function Timeline({
  items,
}: {
  items: {
    label: string;
    date?: string;
    status: "completed" | "current" | "future";
    source?: string;
  }[];
}) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="timeline-item">
          <div className={`timeline-dot ${item.status}`}>
            {item.status === "completed" && (
              <svg className="h-3 w-3 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex-1 pb-2">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            {item.date && <p className="mt-0.5 text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
            {item.source && <p className="mt-0.5 text-xs italic text-muted-foreground">{item.source}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   FindingCard
   ════════════════════════════════════════════════════════════════════════ */
export function FindingCard({
  type,
  title,
  description,
  provenance,
  action,
}: {
  type: "fact" | "observation" | "issue" | "question";
  title: string;
  description: string;
  provenance?: "user" | "document" | "ai" | "system";
  action?: ReactNode;
}) {
  const typeMeta = {
    fact: { label: "Fact", variant: "success" as const },
    observation: { label: "Observation", variant: "default" as const },
    issue: { label: "Potential issue", variant: "warning" as const },
    question: { label: "Question to resolve", variant: "outline" as const },
  };
  const meta = typeMeta[type];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <h4 className="mt-2 text-sm font-semibold text-foreground">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          {provenance && (
            <div className="mt-2">
              <ProvenanceBadge source={provenance} />
            </div>
          )}
        </div>
        {action}
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ResponseOption
   ════════════════════════════════════════════════════════════════════════ */
export function ResponseOption({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-4 transition-all ${
        selected
          ? "border-stamp bg-stamp/5 shadow-stamp"
          : "border-rule bg-card hover:border-ink/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-stamp bg-stamp" : "border-rule"
          }`}
        >
          {selected && (
            <svg className="h-3 w-3 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ApprovalPanel
   ════════════════════════════════════════════════════════════════════════ */
export function ApprovalPanel({
  draftVersion,
  lastModified,
  factsReferenced,
  evidenceLinked,
  approved,
  onApprove,
}: {
  draftVersion: string;
  lastModified: string;
  factsReferenced: number;
  evidenceLinked: number;
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg">Approval</h3>
        {approved ? (
          <Badge variant="success">Approved</Badge>
        ) : (
          <Badge variant="warning">Pending approval</Badge>
        )}
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Draft version</span>
          <span className="font-mono text-foreground">{draftVersion}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last modified</span>
          <span className="text-foreground">{lastModified}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Facts referenced</span>
          <span className="text-foreground">{factsReferenced}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Evidence linked</span>
          <span className="text-foreground">{evidenceLinked}</span>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-rule bg-paper-deep p-3 text-xs text-muted-foreground">
        Approval applies to this exact version. Any change after approval creates a new version requiring re-approval.
      </div>
      <button
        type="button"
        onClick={onApprove}
        disabled={approved}
        className="mt-4 w-full rounded-md bg-stamp px-4 py-3 text-sm font-semibold text-paper transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {approved ? "✓ This draft is approved" : "Approve this draft"}
      </button>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PaymentStatus
   ════════════════════════════════════════════════════════════════════════ */
export function PaymentStatus({
  amount,
  method,
  status,
}: {
  amount: string;
  method: string;
  status: "pending" | "paid" | "failed" | "not_required";
}) {
  const statusMeta = {
    pending: { label: "Payment pending", variant: "warning" as const },
    paid: { label: "Payment complete", variant: "success" as const },
    failed: { label: "Payment failed", variant: "danger" as const },
    not_required: { label: "Not required", variant: "default" as const },
  };
  const meta = statusMeta[status];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg">Payment</h3>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-serif text-lg text-foreground">{amount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mailing service</span>
          <span className="text-foreground">{method}</span>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-rule bg-paper-deep p-3 text-xs text-muted-foreground">
        Payment confirms your selected mailing service. Required approval and fulfillment checks still apply.
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MailingStatus
   ════════════════════════════════════════════════════════════════════════ */
export function MailingStatus({
  readinessChecks,
}: {
  readinessChecks: { label: string; complete: boolean }[];
}) {
  return (
    <Card variant="elevated" className="p-6">
      <h3 className="font-serif text-lg">Mailing readiness</h3>
      <div className="mt-4 space-y-2">
        {readinessChecks.map((check) => (
          <div key={check.label} className="flex items-center gap-2.5 text-sm">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                check.complete ? "bg-success" : "border-2 border-rule"
              }`}
            >
              {check.complete && (
                <svg className="h-3 w-3 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={check.complete ? "text-foreground" : "text-muted-foreground"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ProofTimeline
   ════════════════════════════════════════════════════════════════════════ */
export function ProofTimeline({
  events,
}: {
  events: {
    label: string;
    date?: string;
    status: "completed" | "current" | "future";
    detail?: string;
  }[];
}) {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center gap-2">
        <div className="postmark">Proof</div>
        <h3 className="font-serif text-lg">Documented correspondence event</h3>
      </div>
      <div className="mt-6">
        <Timeline items={events} />
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   NoticeSummary
   ════════════════════════════════════════════════════════════════════════ */
export function NoticeSummary({
  noticeType,
  agency,
  noticeDate,
  receivedDate,
  referenceNumber,
  actionRequested,
  confidence,
  detectedFields,
  userFields,
  needsReviewFields,
}: {
  noticeType?: string;
  agency?: string;
  noticeDate?: string;
  receivedDate?: string;
  referenceNumber?: string;
  actionRequested?: string;
  confidence?: number;
  detectedFields: { label: string; value?: string }[];
  userFields: { label: string; value?: string }[];
  needsReviewFields: { label: string; value?: string }[];
}) {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="postmark w-fit">Notice Summary</div>
          <h3 className="mt-3 font-serif text-2xl">{noticeType || "Notice type pending"}</h3>
          {agency && <p className="mt-1 text-sm text-muted-foreground">{agency}</p>}
        </div>
        {confidence !== undefined && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="font-serif text-xl">{Math.round(confidence * 100)}%</div>
          </div>
        )}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {detectedFields.length > 0 && (
          <div>
            <div className="section-label">Detected from document</div>
            <dl className="mt-2 space-y-1.5">
              {detectedFields.map((f) => (
                <div key={f.label} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="font-medium text-foreground">{f.value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {userFields.length > 0 && (
          <div>
            <div className="section-label">Provided by you</div>
            <dl className="mt-2 space-y-1.5">
              {userFields.map((f) => (
                <div key={f.label} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="font-medium text-foreground">{f.value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      {needsReviewFields.length > 0 && (
        <div className="mt-4 rounded-lg border border-warning-border bg-warning-bg p-3">
          <div className="section-label text-warning">Needs review</div>
          <dl className="mt-2 space-y-1.5">
            {needsReviewFields.map((f) => (
              <div key={f.label} className="flex justify-between text-sm">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="font-medium text-foreground">{f.value || "Missing"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DocumentCard
   ════════════════════════════════════════════════════════════════════════ */
export function DocumentCard({
  name,
  type,
  size,
  uploaded,
}: {
  name: string;
  type?: string;
  size?: string;
  uploaded?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rule bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rule bg-paper-deep">
        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {type && <span>{type}</span>}
          {size && <span>{size}</span>}
          {uploaded && <span>Uploaded {uploaded}</span>}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   AuthorityReference
   ════════════════════════════════════════════════════════════════════════ */
export function AuthorityReference({
  title,
  source,
  date,
  jurisdiction,
  relevance,
  provenance,
}: {
  title: string;
  source?: string;
  date?: string;
  jurisdiction?: string;
  relevance?: string;
  provenance?: "user" | "document" | "ai" | "system";
}) {
  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {source && <span>Source: {source}</span>}
        {date && <span>Date: {date}</span>}
        {jurisdiction && <span>Jurisdiction: {jurisdiction}</span>}
      </div>
      {relevance && <p className="mt-2 text-xs leading-5 text-muted-foreground">{relevance}</p>}
      {provenance && (
        <div className="mt-2">
          <ProvenanceBadge source={provenance} />
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CommandCenterTopBar
   ════════════════════════════════════════════════════════════════════════ */
export function CommandCenterTopBar({
  noticeType,
  status,
  currentStage,
  lastUpdated,
  nextAction,
}: {
  noticeType: string;
  status: string;
  currentStage: string;
  lastUpdated: string;
  nextAction?: ReactNode;
}) {
  return (
    <div className="cmd-topbar">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-serif text-lg">{noticeType}</span>
            <Badge variant="stamp">{status}</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Stage: {currentStage}</span>
            <span>·</span>
            <span>Updated {lastUpdated}</span>
          </div>
        </div>
      </div>
      {nextAction && <div className="shrink-0">{nextAction}</div>}
    </div>
  );
}
