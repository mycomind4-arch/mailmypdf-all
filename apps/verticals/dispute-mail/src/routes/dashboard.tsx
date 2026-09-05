import { createFileRoute, Link } from "@tanstack/react-router";
import { createElement } from "react";
import { Archive, LayoutDashboard, Plus, UserRound, Workflow } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import { workflows } from "@/domain/workflows";
import {
  createWorkflowHub,
  createWorkspacePageHeader,
  createWorkspaceShell,
  createWorkspaceTopbar,
} from "../../../../../packages/design-system/src/index";

const WorkspaceShell = createWorkspaceShell(createElement);
const WorkspaceTopbar = createWorkspaceTopbar(createElement);
const WorkspacePageHeader = createWorkspacePageHeader(createElement);
const WorkflowHub = createWorkflowHub(createElement);

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dispute Mail Workspace — MailMyPDF" },
    { name: "description", content: "Private workspace for credit, debt, billing, and transaction dispute workflows." },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();

  if (authLoading) return <main className="min-h-screen bg-cream"><SiteHeader /><div className="py-32 text-center text-sm text-muted-foreground">Loading your MailMyPDF Account…</div><SiteFooter /></main>;
  if (!isConfigured || !user) return <main className="min-h-screen bg-cream"><SiteHeader /><section className="py-24"><div className="container max-w-md text-center"><div className="eyebrow">MailMyPDF Account</div><h1 className="mt-5 font-serif text-4xl text-teal-700">Sign in to open your Dispute Mail workspace.</h1><p className="mt-3 text-sm leading-6 text-slate-500">Your dispute intake, uploaded records, drafts, approval state, and mailing records are private to your account.</p><Link to="/auth" className="btn-rose mt-6">Sign in or create an account</Link></div></section><SiteFooter /></main>;

  const accountName = user.email?.split("@")[0] || "Account";
  const initials = accountName.slice(0, 2).toUpperCase();
  const workflowIds = ["credit-report", "debt-validation", "billing-error", "unauthorized-charge", "medical-collections", "follow-up-no-response"] as const;
  const hubItems = workflowIds.map((id) => workflows[id]).filter(Boolean).map((workflow) => ({
    title: workflow.title,
    description: workflow.description,
    href: `/workflows/${workflow.id}`,
    eyebrow: "Dispute workflow",
    badge: workflow.lifecycle === "gold" ? "Gold" : workflow.lifecycle === "executable" ? "Executable" : "Available",
    meta: `${workflow.goldStandardStages.length} governed stages`,
    icon: <Workflow />,
  }));

  const sections = [
    { label: "Workspace", items: [
      { label: "Overview", href: "/dashboard", icon: <LayoutDashboard />, active: true },
      { label: "Workflow Hub", href: "/workflows", icon: <Workflow /> },
      { label: "Recent", href: "/dashboard#recent", icon: <Archive /> },
    ] },
    { label: "Account", items: [{ label: "Account settings", href: "/account", icon: <UserRound /> }] },
  ];

  return (
    <WorkspaceShell
      theme="dispute-mail"
      productName="Dispute Mail"
      productLabel="MailMyPDF"
      homeHref="/"
      sections={sections}
      mailPdfHref="/mail-a-pdf"
      ecosystemHref="https://mailmypdf.pages.dev/products"
      footer={<><strong>{user.email}</strong><br />Private workspace · noindex</>}
      topbar={
        <WorkspaceTopbar
          eyebrow="MailMyPDF Account"
          title="Dispute Mail"
          subtitle="Document → Verify → Dispute → Review → Send → Prove"
          actions={<Link to="/workflows" className="mmp-button-secondary">Workflows</Link>}
          account={<Link to="/account" className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">{initials || "DM"}</span><span>{accountName}</span></Link>}
        />
      }
    >
      <WorkspacePageHeader
        eyebrow="Workspace overview"
        title="Build disputes from the record, not from a generic letter template."
        description="Choose the exact dispute problem, preserve the documents and account facts behind it, connect evidence to the issue being challenged, review the draft, approve the final packet, and keep mailing proof separate from generated content."
        actions={<Link to="/workflows/credit-report" className="mmp-button-primary"><Plus size={15} /> New dispute</Link>}
        meta={<><span>{Object.keys(workflows).length} available dispute workflows</span><span>Account required for execution</span></>}
      />

      <WorkflowHub
        title="Choose the dispute that matches what actually happened."
        description="Credit reporting, debt validation, billing errors, unauthorized charges, collections, and escalation each keep their own facts and evidence requirements while sharing the same review and fulfillment system."
        actions={<Link to="/workflows" className="mmp-button-secondary">Browse full catalog</Link>}
        items={hubItems}
      />

      <section id="recent" className="mmp-workspace-section">
        <div className="mmp-workspace-section__head"><h2>Mailing and dispute history</h2></div>
        <div className="mmp-workspace-panel mmp-workspace-empty">
          <h3>No fabricated history.</h3>
          <p>The previous dashboard displayed sample mailings, tracking numbers, delivery times, and status counts. Those placeholders have been removed. This area will render persisted account records when a real Dispute Mail history source is connected.</p>
          <Link to="/workflows" className="mmp-button-primary mt-5">Open Workflow Hub</Link>
        </div>
      </section>
    </WorkspaceShell>
  );
}
