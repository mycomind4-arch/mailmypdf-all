import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NarrationButton, VoiceBadge } from "@/components/voice-controls";
import { buildScript, createSegment } from "@/domain/voice";
import { useAuth } from "@/lib/auth";
import type { CaseSummary } from "@/domain/notice";
import { NOTICE_TYPE_META } from "@/domain/notice-type";
import { EmptyState } from "@/components/ui-primitives";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Cases — Notice Respond" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: DashboardPage,
});

const STATUS_BADGE: Record<string, string> = {
  intake: "badge badge-gray",
  analyzed: "badge badge-amber",
  in_progress: "badge badge-amber",
  ready: "badge badge-green",
  mailed: "badge badge-amber",
  delivered: "badge badge-green",
  closed: "badge badge-gray",
  archived: "badge badge-gray",
};
const STATUS_LABEL: Record<string, string> = {
  intake: "Intake",
  analyzed: "Analyzed",
  in_progress: "In progress",
  ready: "Ready",
  mailed: "Mailed",
  delivered: "Delivered",
  closed: "Closed",
  archived: "Archived",
};

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return iso; }
}

function normalizeSummary(row: Record<string, unknown>): CaseSummary {
  return {
    id: String(row.id),
    workflowId: typeof row.workflow_id === "string" ? row.workflow_id : undefined,
    status: String(row.status || "intake") as CaseSummary["status"],
    noticeType: String(row.notice_type || "other"),
    agency: typeof row.agency === "string" ? row.agency : undefined,
    referenceNumber: typeof row.reference_number === "string" ? row.reference_number : undefined,
    noticeDate: typeof row.notice_date === "string" ? row.notice_date : undefined,
    deadlineDate: typeof row.deadline_date === "string" ? row.deadline_date : undefined,
    readinessScore: Number(row.readiness_score || 0),
    hasDraft: Boolean(row.has_draft),
    hasMailing: Boolean(row.has_mailing),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  } as CaseSummary;
}

function DashboardPage() {
  const { user, accessToken, loading: authLoading, isConfigured } = useAuth();
  const [summaries, setSummaries] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !accessToken) return;
    let active = true;
    setLoading(true);
    setError(null);
    void fetch("/api/cases", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || `Unable to load cases (${response.status}).`);
        return Array.isArray(payload?.cases) ? payload.cases.map(normalizeSummary) : [];
      })
      .then((data) => { if (active) setSummaries(data); })
      .catch((cause) => { if (active) { setSummaries([]); setError(cause instanceof Error ? cause.message : "Unable to load cases."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user, accessToken]);

  const activeCases = useMemo(() => summaries.filter((s) => s.status === "in_progress" || s.status === "analyzed" || s.status === "intake"), [summaries]);
  const readyCases = useMemo(() => summaries.filter((s) => s.status === "ready"), [summaries]);
  const mailedCases = useMemo(() => summaries.filter((s) => s.status === "mailed" || s.status === "delivered"), [summaries]);

  const summaryScript = buildScript("summary", "Dashboard Summary", [
    createSegment("Your case dashboard.", "heading", { pauseAfter: 500 }),
    createSegment(`You have ${summaries.length} total cases. ${activeCases.length} in progress, ${readyCases.length} ready to mail.`, "body", { pauseAfter: 400 }),
    createSegment("To analyze a new notice, click the Analysis Studio button.", "instruction", { pauseAfter: 500 }),
  ]);

  if (authLoading) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="text-sm text-muted-foreground">Loading your MailMyPDF Account…</p></main><SiteFooter /></div>;
  if (!isConfigured || !user) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="postmark mx-auto w-fit">MailMyPDF Account</div><h1 className="mt-6 font-serif text-4xl">Sign in to view your cases.</h1><p className="mt-3 text-sm text-muted-foreground">Your Notice Respond records are private to your MailMyPDF Account.</p><Link to="/auth" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Sign in</Link></main><SiteFooter /></div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="postmark w-fit">My Responses</div>
              <VoiceBadge active={true} />
            </div>
            <h1 className="mt-3 font-serif text-4xl">Welcome back.</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track your notice responses and case status.</p>
          </div>
          <div className="flex items-center gap-3">
            <NarrationButton script={summaryScript} label="Listen to summary" />
            <Link to="/account" className="rounded-full border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">Account</Link>
            <Link to="/workflows/analyze" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Start New Response
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* Summary bars */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <SummaryBar label="Active responses" count={activeCases.length} variant="active" />
          <SummaryBar label="Ready to mail" count={readyCases.length} variant="ready" />
          <SummaryBar label="Mailed / delivered" count={mailedCases.length} variant="mailed" />
        </div>

        {/* Active responses */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl">Active responses</h2>
            {summaries.length > 0 && (
              <span className="text-xs text-muted-foreground">{activeCases.length} active</span>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-rule bg-card p-10 text-center text-sm text-muted-foreground">Loading cases…</div>
          ) : summaries.length === 0 ? (
            <div className="rounded-xl border border-rule bg-card">
              <EmptyState
                title="No active responses"
                description="Start with the notice you received. Notice Response will help organize the document, facts, evidence, response, and mailing process."
                ctaLabel="Start a Response"
                ctaTo="/workflows/analyze"
                icon={
                  <svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* All cases — horizontal progress cards */}
              {summaries.map((s) => (
                <CaseRow key={s.id} summary={s} />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SummaryBar({ label, count, variant }: { label: string; count: number; variant: "active" | "ready" | "mailed" }) {
  const barColor = {
    active: "bg-ink",
    ready: "bg-stamp",
    mailed: "bg-success",
  }[variant];
  return (
    <div className="rounded-xl border border-rule bg-card p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="font-serif text-2xl">{count}</span>
      </div>
      <div className="mt-3 progress-track">
        <div className={`progress-fill ${barColor === "bg-stamp" ? "progress-fill-amber" : barColor === "bg-success" ? "progress-fill-success" : ""}`} style={{ width: `${count > 0 ? 100 : 0}%` }} />
      </div>
    </div>
  );
}

function CaseRow({ summary }: { summary: CaseSummary }) {
  const label = (NOTICE_TYPE_META as Record<string, { label?: string }>)[summary.noticeType]?.label || summary.noticeType;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-rule bg-card p-4 transition-colors hover:border-ink/20">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">{label}</span>
          <span className={STATUS_BADGE[summary.status] || "badge badge-gray"}>{STATUS_LABEL[summary.status] || summary.status}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{summary.agency || "Unknown agency"}</span>
          {summary.referenceNumber && (
            <>
              <span>·</span>
              <span className="font-mono">{summary.referenceNumber}</span>
            </>
          )}
          <span>·</span>
          <span>Updated {formatDate(summary.updatedAt)}</span>
        </div>
      </div>
      <div className="hidden sm:block">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-stamp" style={{ width: `${summary.readinessScore}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{summary.readinessScore}%</span>
        </div>
      </div>
      {summary.deadlineDate && (
        <div className="hidden md:block text-right">
          <div className="text-xs text-muted-foreground">Deadline</div>
          <div className="text-sm font-medium">{formatDate(summary.deadlineDate)}</div>
        </div>
      )}
    </div>
  );
}
