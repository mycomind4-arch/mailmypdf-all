import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, FileText, Calendar, Stamp, FolderOpen, FileEdit, FileSearch,
  CheckCircle2, Package, Send, Truck, ShieldCheck, Menu, X, ChevronRight,
} from "lucide-react";
import type { WorkflowStep } from "../../domain/workflows";

/* ═══════════════════════════════════════════════════════════
   APPEAL WORKSPACE SHELL
   The persistent application layout that replaces the wizard.
   ═══════════════════════════════════════════════════════════ */

export interface WorkspaceNav {
  step: WorkflowStep;
  label: string;
  icon: typeof FileText;
  completed: boolean;
  attention?: boolean;
}

interface AppShellProps {
  navItems: WorkspaceNav[];
  currentStep: WorkflowStep;
  onNavigate: (step: WorkflowStep) => void;
  appealNumber: string;
  appealTitle: string;
  statusLabel: string;
  deadlineInfo?: { date: string; daysRemaining: number | null; source?: string };
  children: ReactNode;
}

export function AppShell({
  navItems,
  currentStep,
  onNavigate,
  appealNumber,
  appealTitle,
  statusLabel,
  deadlineInfo,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (step: WorkflowStep) => {
    onNavigate(step);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-warm-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-700">
            <Stamp size={16} className="text-stamp" />
          </div>
          <span className="text-base font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>
            Appeal Mail
          </span>
        </div>

        {/* Appeal info */}
        <div className="px-4 py-3 border-b border-warm-border">
          <p className="text-mono" style={{ fontSize: "0.72rem" }}>{appealNumber}</p>
          <p className="text-xs font-medium text-slate-600 mt-0.5 truncate">{appealTitle}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="status-dot status-dot-amber" />
            <span className="text-xs text-slate-500">{statusLabel}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item, i) => (
            <button
              key={item.step}
              onClick={() => handleNavigate(item.step)}
              className={`sidebar-nav-item ${currentStep === item.step ? "active" : ""} ${item.completed ? "completed" : ""}`}
            >
              <span className="nav-number">{item.completed ? "✓" : String(i + 1).padStart(2, "0")}</span>
              <item.icon size={15} className="flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.attention && <span className="status-dot status-dot-amber" />}
              {currentStep === item.step && <ChevronRight size={14} className="flex-shrink-0 opacity-50" />}
            </button>
          ))}
        </nav>

        {/* Deadline footer */}
        {deadlineInfo && (
          <div className="px-4 py-3 border-t border-warm-border">
            <p className="section-label" style={{ marginBottom: "0.35rem" }}>Deadline</p>
            <p className="text-sm font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>
              {formatDate(deadlineInfo.date)}
            </p>
            {deadlineInfo.daysRemaining !== null && (
              <p className={`text-xs font-semibold mt-0.5 ${deadlineInfo.daysRemaining <= 7 ? "text-red-600" : deadlineInfo.daysRemaining <= 30 ? "text-amber-600" : "text-emerald-600"}`}>
                {deadlineInfo.daysRemaining < 0 ? `${Math.abs(deadlineInfo.daysRemaining)} days overdue` : `${deadlineInfo.daysRemaining} days remaining`}
              </p>
            )}
            {deadlineInfo.source && (
              <p className="text-mono mt-1" style={{ fontSize: "0.68rem" }}>{deadlineInfo.source}</p>
            )}
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="app-content">
        {/* Top bar */}
        <div className="app-topbar">
          <div className="flex items-center gap-3">
            <button className="mobile-nav p-1.5 -ml-1.5" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} className="text-indigo-700" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-indigo-700" style={{ fontFamily: "var(--font-sans)" }}>
                {navItems.find((n) => n.step === currentStep)?.label || "Overview"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {deadlineInfo && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="status-dot status-dot-amber" />
                <span className="text-slate-500">
                  {deadlineInfo.daysRemaining !== null && deadlineInfo.daysRemaining >= 0
                    ? `${deadlineInfo.daysRemaining} days to deadline`
                    : "Deadline passed"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <main className="app-main">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS RAIL — visual step progression
   ═══════════════════════════════════════════════════════════ */

export function ProgressRail({
  steps,
  currentStep,
}: {
  steps: { label: string; step: WorkflowStep; status: "done" | "current" | "todo" }[];
  currentStep: WorkflowStep;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((s, i) => (
        <div key={s.step} className="flex items-center flex-shrink-0">
          <div className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${
            s.status === "done" ? "bg-emerald-50" :
            s.status === "current" ? "bg-indigo-50" :
            "bg-slate-50"
          }`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
              s.status === "done" ? "bg-emerald-500 text-white" :
              s.status === "current" ? "bg-indigo-700 text-white" :
              "bg-slate-200 text-slate-500"
            }`}>
              {s.status === "done" ? "✓" : i + 1}
            </span>
            <span className={`text-xs font-medium ${
              s.status === "done" ? "text-emerald-700" :
              s.status === "current" ? "text-indigo-700" :
              "text-slate-400"
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-4 ${s.status === "done" ? "bg-emerald-300" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════ */

export function StatusBadge({
  status,
  children,
}: {
  status: "complete" | "in-progress" | "attention" | "pending" | "error";
  children?: ReactNode;
}) {
  const map = {
    complete: { class: "badge-green", dot: "status-dot-green", label: "Complete" },
    "in-progress": { class: "badge-indigo", dot: "status-dot-amber", label: "In progress" },
    attention: { class: "badge-amber-warn", dot: "status-dot-amber", label: "Needs attention" },
    pending: { class: "badge-gray", dot: "status-dot-gray", label: "Pending" },
    error: { class: "badge-red", dot: "status-dot-red", label: "Error" },
  };
  const m = map[status];
  return (
    <span className={`badge ${m.class}`}>
      <span className={`status-dot ${m.dot}`} />
      {children || m.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEADLINE CARD
   ═══════════════════════════════════════════════════════════ */

export function DeadlineCard({
  date,
  daysRemaining,
  source,
  verified = true,
  warning,
}: {
  date: string;
  daysRemaining: number | null;
  source?: string;
  verified?: boolean;
  warning?: string;
}) {
  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
  const isPassed = daysRemaining !== null && daysRemaining < 0;

  return (
    <div className={`card p-5 ${isUrgent ? "border-red-200" : isPassed ? "border-red-300" : "border-warm-border"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label">Appeal Deadline</p>
          <p className="heading-lg mt-1">{formatDate(date)}</p>
          {daysRemaining !== null && (
            <p className={`mt-1 text-2xl font-bold ${isUrgent ? "text-red-600" : isPassed ? "text-red-700" : daysRemaining <= 30 ? "text-amber-600" : "text-emerald-600"}`}
               style={{ fontFamily: "var(--font-serif)" }}>
              {isPassed ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
            </p>
          )}
        </div>
        <div className="text-right">
          {verified ? (
            <span className="badge badge-green">✓ Verified</span>
          ) : (
            <span className="badge badge-amber-warn">⚠ Unverified</span>
          )}
        </div>
      </div>

      {source && (
        <div className="mt-3 pt-3 border-t border-warm-border">
          <p className="text-muted">Source: {source}</p>
        </div>
      )}

      {warning && (
        <div className="mt-3 alert alert-warning">
          {warning}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SOURCE REFERENCE
   ═══════════════════════════════════════════════════════════ */

export function SourceReference({
  documentName,
  page,
  excerpt,
}: {
  documentName: string;
  page?: number;
  excerpt?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-500">
      <FileText size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
      <div>
        <span className="font-medium text-slate-600">{documentName}</span>
        {page && <span className="text-slate-400"> · p.{page}</span>}
        {excerpt && <p className="mt-0.5 italic text-slate-400 max-w-md">"{excerpt}"</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONFIDENCE BADGE
   ═══════════════════════════════════════════════════════════ */

export function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: { class: "badge-green", label: "High confidence" },
    medium: { class: "badge-amber-warn", label: "Medium confidence" },
    low: { class: "badge-gray", label: "Low confidence" },
  };
  const m = map[level];
  return <span className={`badge ${m.class}`}>{m.label}</span>;
}

/* ═══════════════════════════════════════════════════════════
   ISSUE CARD — actionable warnings
   ═══════════════════════════════════════════════════════════ */

export function IssueCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-amber-200 bg-amber-50/50">
      <span className="status-dot status-dot-amber mt-1.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        {actionLabel && (
          <button onClick={onAction} className="btn-ghost btn-sm mt-1.5">
            {actionLabel} →
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════ */

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: typeof FolderOpen;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon size={36} className="text-slate-300" />
      <p className="heading-sm mt-4 text-slate-600">{title}</p>
      <p className="text-muted mt-1.5 max-w-sm">{description}</p>
      {actionLabel && (
        <button onClick={onAction} className="btn-outline mt-4">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   READINESS SCORE
   ═══════════════════════════════════════════════════════════ */

export function ReadinessScore({
  score,
  label,
  itemsToReview,
}: {
  score: number;
  label: string;
  itemsToReview?: number;
}) {
  const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const barClass = score >= 80 ? "progress-fill-success" : "progress-fill";

  return (
    <div className="card-elevated p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="section-label">Appeal Readiness</p>
          <p className={`text-4xl font-bold ${color} mt-1`} style={{ fontFamily: "var(--font-serif)" }}>{score}</p>
          <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        </div>
        {itemsToReview && itemsToReview > 0 ? (
          <div className="text-right">
            <span className="badge badge-amber-warn">{itemsToReview} to review</span>
          </div>
        ) : (
          <div className="text-right">
            <span className="badge badge-green">Ready</span>
          </div>
        )}
      </div>
      <div className="progress-track mt-4">
        <div className={`progress-fill ${barClass}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AI ACTION BAR
   ═══════════════════════════════════════════════════════════ */

export function AIActionBar({
  actions,
}: {
  actions: { label: string; icon: typeof FileText; onClick: () => void; disabled?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-warm-border bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-40"
        >
          <action.icon size={14} />
          {action.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY FEED
   ═══════════════════════════════════════════════════════════ */

export function ActivityFeed({
  items,
}: {
  items: { description: string; timestamp: string; icon?: typeof FileText }[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const Icon = item.icon || FileText;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cream flex-shrink-0">
              <Icon size={14} className="text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-600">{item.description}</p>
              <p className="text-mono mt-0.5">{item.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED NAV DEFINITIONS
   ═══════════════════════════════════════════════════════════ */

export const NAV_ICONS: Record<string, typeof FileText> = {
  intro: LayoutDashboard,
  document: FileText,
  xray: FileSearch,
  decision: FileText,
  timeline: Calendar,
  grounds: Stamp,
  evidence: FolderOpen,
  arguments: FileText,
  "stress-test": ShieldCheck,
  draft: FileEdit,
  "final-stress-test": ShieldCheck,
  readiness: CheckCircle2,
  packet: Package,
  recipient: FileText,
  mailing: Send,
  checkout: Send,
  proof: ShieldCheck,
  submitted: CheckCircle2,
};

export const NAV_LABELS: Record<string, string> = {
  intro: "Overview",
  document: "Decision",
  xray: "X-Ray",
  decision: "Decision",
  timeline: "Timeline",
  grounds: "Grounds",
  evidence: "Evidence",
  arguments: "Arguments",
  "stress-test": "Stress Test",
  draft: "Draft",
  "final-stress-test": "Final Review",
  readiness: "Readiness",
  packet: "Packet",
  recipient: "Recipient",
  mailing: "Send",
  checkout: "Checkout",
  proof: "Proof",
  submitted: "Complete",
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
