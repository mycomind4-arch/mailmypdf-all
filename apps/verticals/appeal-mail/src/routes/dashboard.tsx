import { createFileRoute, Link } from "@tanstack/react-router";
import { createElement } from "react";
import { Archive, FolderOpen, LayoutDashboard, Plus, UserRound, Workflow } from "lucide-react";
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
  head: () => ({
    meta: [
      { title: "Appeal Mail Workspace — MailMyPDF" },
      { name: "description", content: "Your private Appeal Mail workspace for appeal workflows, drafts, review, mailing, and proof." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">Loading your MailMyPDF Account…</div>
        <SiteFooter />
      </main>
    );
  }

  if (!isConfigured || !user) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <section className="py-20 md:py-32">
          <div className="container max-w-md text-center">
            <div className="postmark mx-auto w-fit">MailMyPDF Account</div>
            <h1 className="mt-6 font-serif text-4xl text-ink">Sign in to open your Appeal Mail workspace.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Your workflow intake, uploaded decisions, drafts, review state, and mailing records are private to your account.</p>
            <Link to="/auth" className="btn-amber mt-6">Sign in or create an account</Link>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const accountName = user.fullName || user.email?.split("@")[0] || "Account";
  const initials = accountName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const catalog = Object.values(workflows);
  const featured = catalog.slice(0, 6);

  const sections = [
    {
      label: "Workspace",
      items: [
        { label: "Overview", href: "/dashboard", icon: <LayoutDashboard />, active: true },
        { label: "Workflow Hub", href: "/workflows", icon: <Workflow /> },
        { label: "Recent", href: "/dashboard#recent", icon: <Archive /> },
      ],
    },
    {
      label: "Account",
      items: [{ label: "Account settings", href: "/account", icon: <UserRound /> }],
    },
  ];

  const topbar = (
    <WorkspaceTopbar
      eyebrow="MailMyPDF Account"
      title="Appeal Mail"
      subtitle="Understand → Build → Review → Approve → Send → Prove"
      actions={<Link to="/workflows" className="mmp-button-secondary">Workflows</Link>}
      account={
        <Link to="/account" className="mmp-workspace-account">
          <span className="mmp-workspace-account__avatar">{initials || "AM"}</span>
          <span>{accountName}</span>
        </Link>
      }
    />
  );

  return (
    <WorkspaceShell
      theme="appeal-mail"
      productName="Appeal Mail"
      productLabel="MailMyPDF"
      homeHref="/"
      sections={sections}
      mailPdfHref="https://mailmypdf.pages.dev/start"
      ecosystemHref="https://mailmypdf.pages.dev/products"
      topbar={topbar}
      footer={<><strong>{user.email}</strong><br />Private workspace · noindex</>}
    >
      <WorkspacePageHeader
        eyebrow="Workspace overview"
        title="Turn an adverse decision into an organized, reviewable appeal record."
        description="Start with the actual decision, preserve the facts and deadlines it contains, connect supporting evidence, build the appeal, review the exact packet, and keep fulfillment and proof separate from drafting."
        actions={<Link to="/workflows" className="mmp-button-primary"><Plus size={15} /> New appeal</Link>}
        meta={<><span>{catalog.length} available appeal workflows</span><span>Human approval before mailing</span></>}
      />

      <WorkflowHub
        title="Choose the appeal that matches the decision you received."
        description="The hub is generated from Appeal Mail's real workflow catalog. Each workflow keeps its own decision fields, focus areas, deadline guidance, evidence logic, and drafting prompt while using the same shared execution and fulfillment system."
        actions={<Link to="/workflows" className="mmp-button-secondary">Browse full catalog</Link>}
        items={featured.map((workflow) => ({
          title: workflow.title,
          description: workflow.description,
          href: `/workflows/${workflow.id}`,
          eyebrow: "Appeal workflow",
          badge: workflow.acceptsDocuments ? "Document-led" : undefined,
          meta: workflow.focusAreas.slice(0, 3).join(" · "),
          icon: <FolderOpen />,
        }))}
      />

      <section id="recent" className="mmp-workspace-section">
        <div className="mmp-workspace-section__head"><h2>Your appeal record</h2></div>
        <div className="mmp-workspace-panel mmp-workspace-empty">
          <h3>Case summaries are not fabricated here.</h3>
          <p>This dashboard does not currently query a consolidated Appeal Mail case-history endpoint. Start or resume work through the real workflow catalog; when persisted case summaries are available to this account, this section can render those records instead of placeholder counts.</p>
          <Link to="/workflows" className="mmp-button-primary mt-5">Open Workflow Hub</Link>
        </div>
      </section>
    </WorkspaceShell>
  );
}
