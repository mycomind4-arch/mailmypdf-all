import { createFileRoute, Link } from "@tanstack/react-router";
import { createElement, useEffect, useState } from "react";
import { Archive, BriefcaseBusiness, LayoutDashboard, Plus, UserRound, Workflow } from "lucide-react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { useAuth } from "@/lib/use-auth";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { compoundWorkflows } from "@/domain/compound-workflows";
import type { CompoundMatterState } from "@/domain/compound-workflow-runtime";
import { listCompoundMatters } from "@/lib/fns/compound-matter";
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
  head: () => ({ meta: [{ title: "Private Office Workspace — MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading, isConfigured } = useAuth();
  const [compoundMatters, setCompoundMatters] = useState<CompoundMatterState[]>([]);
  const [mattersLoading, setMattersLoading] = useState(false);
  const [mattersError, setMattersError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCompoundMatters([]);
      return;
    }
    let cancelled = false;
    setMattersLoading(true);
    setMattersError(null);
    listCompoundMatters()
      .then((result) => {
        if (!cancelled) setCompoundMatters(result.matters as CompoundMatterState[]);
      })
      .catch((cause) => {
        if (!cancelled) setMattersError(cause instanceof Error ? cause.message : "Unable to load matters.");
      })
      .finally(() => {
        if (!cancelled) setMattersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return <main className="min-h-screen bg-ivory"><PrivateOfficeChrome /><div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center"><span className="font-mono text-sm text-stone">Loading Private Office…</span></div></main>;
  }

  if (!isConfigured || !user) {
    return (
      <main className="min-h-screen bg-ivory">
        <PrivateOfficeChrome />
        <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-20">
          <div className="w-full max-w-md text-center">
            <div className="section-kicker">Private Access</div>
            <h1 className="mt-4 text-4xl text-charcoal">Sign in to your Private Office.</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone">Your matters, evidence, correspondence, approvals, and delivery records are isolated to your MailMyPDF Account.</p>
            <Link to="/auth" className="btn-primary mt-7">Sign in</Link>
          </div>
        </section>
      </main>
    );
  }

  const accountName = user.email?.split("@")[0] || "Account";
  const initials = accountName.slice(0, 2).toUpperCase();
  const catalog = Object.values(workflows);
  const featured = catalog.slice(0, 6);
  const sections = [
    { label: "Workspace", items: [
      { label: "Overview", href: "/dashboard", icon: <LayoutDashboard />, active: true },
      { label: "Workflow Hub", href: "/workflows", icon: <Workflow /> },
      { label: "Matters", href: "/dashboard#matters", icon: <BriefcaseBusiness /> },
      { label: "Recent", href: "/dashboard#matters", icon: <Archive /> },
    ] },
    { label: "Account", items: [{ label: "Account settings", href: "/account", icon: <UserRound /> }] },
  ];

  return (
    <WorkspaceShell
      theme="private-office"
      productName="Private Office"
      productLabel="MailMyPDF"
      homeHref="/"
      sections={sections}
      mailPdfHref="/mail-a-pdf"
      ecosystemHref="/products"
      footer={<><strong>{user.email}</strong><br />Private workspace · noindex</>}
      topbar={
        <WorkspaceTopbar
          eyebrow="MailMyPDF Account"
          title="Private Office"
          subtitle="Facts → Evidence → Analysis → Review → Delivery → Proof"
          actions={<Link to="/workflows" className="mmp-button-secondary">Workflows</Link>}
          account={<Link to="/account" className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">{initials || "PO"}</span><span>{accountName}</span></Link>}
        />
      }
    >
      <WorkspacePageHeader
        eyebrow="Private workspace"
        title="One controlled record from the first fact to final proof."
        description="Private Office is the premium workspace for consequential correspondence. Each matter keeps source facts, evidence, AI-assisted analysis, drafting, human review, authorization, mailing, and proof as separate controlled stages."
        actions={<Link to="/workflows" className="mmp-button-primary"><Plus size={15} /> New matter</Link>}
        meta={<><span>{catalog.length} focused workflows + {Object.keys(compoundWorkflows).length} compound workflows</span><span>Human review before consequential actions</span></>}
      />

      <WorkflowHub
        title="Choose the matter that deserves a controlled record."
        description="Each workflow keeps its own domain language, evidence requirements, risk controls, and analysis while using the same Private Office execution and fulfillment architecture."
        actions={<Link to="/workflows" className="mmp-button-secondary">Browse all workflows</Link>}
        items={featured.map((workflow) => {
          const profile = workflowProfiles[workflow.id];
          return {
            title: workflow.title,
            description: workflow.description,
            href: `/workflows/${workflow.id}`,
            eyebrow: profile?.family ?? "Private matter",
            badge: "Controlled",
            meta: profile ? `${profile.evidenceRequirements.length} evidence categories` : undefined,
            icon: <BriefcaseBusiness />,
          };
        })}
      />

      <section id="matters" className="mmp-workspace-section">
        <div className="mmp-workspace-section__head"><h2>Your compound matters</h2></div>

        {mattersLoading ? (
          <div className="mmp-workspace-panel mmp-workspace-empty">
            <p>Loading persisted matters…</p>
          </div>
        ) : mattersError ? (
          <div className="mmp-workspace-panel mmp-workspace-empty">
            <h3>Unable to load matters</h3>
            <p>{mattersError}</p>
          </div>
        ) : compoundMatters.length === 0 ? (
          <div className="mmp-workspace-panel mmp-workspace-empty">
            <h3>No compound matters yet.</h3>
            <p>Start one of the new compound workflows to create a durable, owner-scoped orchestration record.</p>
            <Link to="/workflows" className="mmp-button-primary mt-5">Start a compound matter</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {compoundMatters.map((matter) => {
              const workflow = compoundWorkflows[matter.workflowId];
              const complete = matter.phases.filter((phase) => phase.status === "complete").length;
              const active = matter.phases.find((phase) => phase.status === "in_progress");
              const blocked = matter.phases.find((phase) => phase.status === "blocked");
              return (
                <Link
                  key={matter.id}
                  to={`/workflows/${matter.workflowId}` as "/workflows"}
                  className="mmp-workspace-panel block transition hover:-translate-y-0.5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="section-kicker">{workflow.family}</div>
                      <h3 className="mt-2 text-xl text-charcoal">{workflow.title}</h3>
                      <p className="mt-2 text-sm text-stone">
                        {complete}/{matter.phases.length} phases complete
                        {active ? ` · Active: ${workflow.phases.find((p) => p.id === active.phaseId)?.title ?? active.phaseId}` : ""}
                        {blocked ? ` · Blocked: ${workflow.phases.find((p) => p.id === blocked.phaseId)?.title ?? blocked.phaseId}` : ""}
                      </p>
                    </div>
                    <div className="font-mono text-xs text-stone-light">
                      v{matter.version}<br />{matter.updatedAt.slice(0, 10)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
