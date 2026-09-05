import { createFileRoute, Link } from "@tanstack/react-router";
import { createElement, useEffect, useMemo, useState } from "react";
import { Archive, FileSearch, LayoutDashboard, Mail, Plus, UserRound, Workflow } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NarrationButton, VoiceBadge } from "@/components/voice-controls";
import { buildScript, createSegment } from "@/domain/voice";
import { useAuth } from "@/lib/auth";
import type { CaseSummary } from "@/domain/notice";
import { NOTICE_TYPE_META } from "@/domain/notice-type";
import {
  createWorkflowHub,
  createWorkspaceMetrics,
  createWorkspacePageHeader,
  createWorkspaceShell,
  createWorkspaceTopbar,
} from "../../../../../packages/design-system/src/index";

const WorkspaceShell = createWorkspaceShell(createElement);
const WorkspaceTopbar = createWorkspaceTopbar(createElement);
const WorkspacePageHeader = createWorkspacePageHeader(createElement);
const WorkspaceMetrics = createWorkspaceMetrics(createElement);
const WorkflowHub = createWorkflowHub(createElement);

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Notice Respond Workspace — MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: DashboardPage,
});

const STATUS_BADGE: Record<string, string> = {
  intake: "badge badge-gray", analyzed: "badge badge-amber", in_progress: "badge badge-amber",
  ready: "badge badge-green", mailed: "badge badge-amber", delivered: "badge badge-green",
  closed: "badge badge-gray", archived: "badge badge-gray",
};
const STATUS_LABEL: Record<string, string> = {
  intake: "Intake", analyzed: "Analyzed", in_progress: "In progress", ready: "Ready",
  mailed: "Mailed", delivered: "Delivered", closed: "Closed", archived: "Archived",
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
    createSegment("Your Notice Respond workspace.", "heading", { pauseAfter: 500 }),
    createSegment(`You have ${summaries.length} total cases. ${activeCases.length} in progress, ${readyCases.length} ready to mail.`, "body", { pauseAfter: 400 }),
    createSegment("To start from a new notice, open Analyze Document.", "instruction", { pauseAfter: 500 }),
  ]);

  if (authLoading) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="text-sm text-muted-foreground">Loading your MailMyPDF Account…</p></main><SiteFooter /></div>;
  if (!isConfigured || !user) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="postmark mx-auto w-fit">MailMyPDF Account</div><h1 className="mt-6 font-serif text-4xl">Sign in to view your cases.</h1><p className="mt-3 text-sm text-muted-foreground">Your Notice Respond records are private to your MailMyPDF Account.</p><Link to="/auth" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Sign in</Link></main><SiteFooter /></div>;

  const accountName = user.email?.split("@")[0] || "Account";
  const initials = accountName.slice(0, 2).toUpperCase();
  const sections = [
    { label: "Workspace", items: [
      { label: "Overview", href: "/dashboard", icon: <LayoutDashboard />, active: true },
      { label: "Workflow Hub", href: "/workflows", icon: <Workflow /> },
      { label: "Analyze Document", href: "/workflows/analyze", icon: <FileSearch /> },
      { label: "Recent", href: "/dashboard#recent", icon: <Archive /> },
    ] },
    { label: "Account", items: [{ label: "Account settings", href: "/account", icon: <UserRound /> }] },
  ];

  return (
    <WorkspaceShell
      theme="notice-respond"
      productName="Notice Respond"
      productLabel="MailMyPDF"
      homeHref="/"
      sections={sections}
      mailPdfHref="/mail-a-pdf"
      ecosystemHref="https://mailmypdf.pages.dev/products"
      footer={<><strong>{user.email}</strong><br />Private workspace · noindex</>}
      topbar={
        <WorkspaceTopbar
          eyebrow="MailMyPDF Account"
          title="Notice Respond"
          subtitle="Understand → Verify → Respond → Approve → Mail → Prove"
          actions={<><NarrationButton script={summaryScript} label="Listen to summary" /><Link to="/workflows/analyze" className="mmp-button-primary"><Plus size={15} /> New response</Link></>}
          account={<Link to="/account" className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">{initials || "NR"}</span><span>{accountName}</span></Link>}
        />
      }
    >
      <WorkspacePageHeader
        eyebrow="Workspace overview"
        title="Know what the notice says, what is due, and what happens next."
        description="Notice Respond starts from the actual document. The workspace keeps extracted facts, deadlines, response work, mailing state, and the case record together without replacing source documents with generated assumptions."
        actions={<div className="flex items-center gap-2"><VoiceBadge active={true} /><Link to="/workflows/analyze" className="mmp-button-primary">Analyze a notice</Link></div>}
        meta={<><span>{summaries.length} total case{summaries.length === 1 ? "" : "s"}</span><span>Account data only</span></>}
      />

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <WorkspaceMetrics metrics={[
        { label: "Active responses", value: activeCases.length },
        { label: "Ready to mail", value: readyCases.length },
        { label: "Mailed / delivered", value: mailedCases.length },
        { label: "Total cases", value: summaries.length },
      ]} />

      <WorkflowHub
        title="Start with the notice or agency action in front of you."
        description="These routes are present in Notice Respond today. The shared hub surfaces them consistently while each workflow keeps its own extraction, evidence, deadline, drafting, review, and safety logic."
        actions={<Link to="/workflows" className="mmp-button-secondary">Browse all workflows</Link>}
        items={[
          { title: "Analyze My Notice", description: "Upload the notice first and use its contents to route into the right response workflow.", href: "/workflows/analyze", eyebrow: "Document routing", badge: "Live", icon: <FileSearch /> },
          { title: "IRS CP2000 Response", description: "Review the proposed income changes, discrepancy details, response deadline, evidence, and reply packet.", href: "/workflows/cp2000-response", eyebrow: "IRS", badge: "Live", icon: <Workflow /> },
          { title: "IRS CP14 Response", description: "Organize a balance-due notice, account details, payment or dispute facts, and a reviewable written response.", href: "/workflows/cp14-response", eyebrow: "IRS", badge: "Live", icon: <Mail /> },
          { title: "IRS CP504 Response", description: "Work from the final-balance-due notice, dates, account facts, available records, and the response you intend to make.", href: "/workflows/cp504-response", eyebrow: "IRS", badge: "Live", icon: <Mail /> },
          { title: "Court Summons", description: "Organize the summons, court and case details, response date, source facts, and the records relevant to the next step.", href: "/workflows/court-summons", eyebrow: "Court", badge: "Live", icon: <Workflow /> },
          { title: "Agency Action", description: "Start from a government or agency action and preserve the stated findings, instructions, dates, and response record.", href: "/workflows/agency-action", eyebrow: "Agency", badge: "Live", icon: <Workflow /> },
        ]}
      />

      <section id="recent" className="mmp-workspace-section">
        <div className="mmp-workspace-section__head"><h2>Recent cases</h2><span className="text-xs text-muted-foreground">{activeCases.length} active</span></div>
        <div className="mmp-workspace-panel">
          {loading ? (
            <div className="mmp-workspace-empty"><p>Loading cases…</p></div>
          ) : summaries.length === 0 ? (
            <div className="mmp-workspace-empty"><h3>No cases yet</h3><p>Start with the notice you received. Analyze it, verify the extracted facts, then move into the response workflow that matches the document.</p><Link to="/workflows/analyze" className="mmp-button-primary mt-5">Start a response</Link></div>
          ) : (
            <div className="mmp-workspace-list">{summaries.slice(0, 10).map((summary) => <CaseRow key={summary.id} summary={summary} />)}</div>
          )}
        </div>
      </section>
    </WorkspaceShell>
  );
}

function CaseRow({ summary }: { summary: CaseSummary }) {
  const label = (NOTICE_TYPE_META as Record<string, { label?: string }>)[summary.noticeType]?.label || summary.noticeType;
  return (
    <div className="mmp-workspace-row">
      <div className="mmp-workspace-row__main">
        <div className="flex items-center gap-2"><span className="mmp-workspace-row__title">{label}</span><span className={STATUS_BADGE[summary.status] || "badge badge-gray"}>{STATUS_LABEL[summary.status] || summary.status}</span></div>
        <div className="mmp-workspace-row__meta">{summary.agency || "Unknown agency"}{summary.referenceNumber ? ` · ${summary.referenceNumber}` : ""} · Updated {formatDate(summary.updatedAt)}</div>
      </div>
      <div className="hidden sm:block min-w-24 text-right"><div className="text-xs text-muted-foreground">Readiness</div><div className="text-sm font-medium">{summary.readinessScore}%</div></div>
      {summary.deadlineDate && <div className="hidden md:block min-w-28 text-right"><div className="text-xs text-muted-foreground">Deadline</div><div className="text-sm font-medium">{formatDate(summary.deadlineDate)}</div></div>}
    </div>
  );
}
