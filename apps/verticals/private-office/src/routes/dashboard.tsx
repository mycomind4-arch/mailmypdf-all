import { createFileRoute, Link } from "@tanstack/react-router";
import { createElement } from "react";
import { Archive, BriefcaseBusiness, LayoutDashboard, Plus, UserRound, Workflow } from "lucide-react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { useAuth } from "@/lib/use-auth";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";
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
        meta={<><span>{catalog.length} available Private Office workflows</span><span>Human review before consequential actions</span></>}
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
        <div className="mmp-workspace-section__head"><h2>Your matters</h2></div>
        <div className="mmp-workspace-panel mmp-workspace-empty">
          <h3>Matter history needs a real repository before it is displayed.</h3>
          <p>The previous dashboard initialized an empty in-memory matter list and then treated it as account state. That placeholder has been removed. This area is reserved for persisted, owner-scoped matter summaries when the Private Office repository is connected.</p>
          <Link to="/workflows" className="mmp-button-primary mt-5">Start a Private Office matter</Link>
        </div>
      </section>
    </WorkspaceShell>
  );
}
