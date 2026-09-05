import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createElement, useCallback, useEffect, useState } from "react";
import { Archive, FileSearch, FolderOpen, LayoutDashboard, Mail, Plus, UserRound, Workflow } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import {
  fetchMailingOrders,
  fetchCorrespondence,
  formatPrice,
  formatMailMethod,
  formatDate,
  type MailingOrder,
  type Correspondence,
} from "@/lib/cases";
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
  head: () => ({
    meta: [
      { title: "Immigration Mail Workspace — MailMyPDF" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mailings, setMailings] = useState<MailingOrder[]>([]);
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [mailingsResult, correspondenceResult] = await Promise.all([
      fetchMailingOrders(user.id),
      fetchCorrespondence(user.id),
    ]);
    if (mailingsResult.error || correspondenceResult.error) {
      setError(mailingsResult.error || correspondenceResult.error);
    } else {
      setMailings(mailingsResult.data ?? []);
      setCorrespondence(correspondenceResult.data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadData(); }, [loadData]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rule border-t-brass" />
            <p className="mt-4 text-sm text-muted-foreground">Loading your MailMyPDF Account…</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!user) return null;

  const inTransit = mailings.filter((m) => m.status === "in_transit" || m.status === "pending").length;
  const delivered = mailings.filter((m) => m.status === "delivered" || m.status === "completed").length;
  const accountName = user.fullName || user.email?.split("@")[0] || "Account";
  const initials = accountName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const navigation = [
    {
      label: "Workspace",
      items: [
        { label: "Overview", href: "/dashboard", icon: <LayoutDashboard />, active: true },
        { label: "Workflow Hub", href: "/workflows", icon: <Workflow /> },
        { label: "Cases", href: "/cases", icon: <FolderOpen /> },
        { label: "Analyze Document", href: "/analyze", icon: <FileSearch /> },
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
      title="Immigration Mail"
      subtitle="Understand → Structure → Prepare → Review → Send → Track → Prove"
      actions={<Link to="/workflows" className="mmp-button-secondary">Workflows</Link>}
      account={
        <Link to="/account" className="mmp-workspace-account">
          <span className="mmp-workspace-account__avatar">{initials || "IM"}</span>
          <span>{accountName}</span>
        </Link>
      }
    />
  );

  return (
    <WorkspaceShell
      theme="immigration-mail"
      productName="Immigration Mail"
      productLabel="MailMyPDF"
      homeHref="/"
      sections={navigation}
      mailPdfHref="https://mailmypdf.pages.dev/start"
      ecosystemHref="https://mailmypdf.pages.dev/products"
      topbar={topbar}
      footer={<><strong>{user.email}</strong><br />Private workspace · noindex</>}
    >
      <WorkspacePageHeader
        eyebrow="Workspace overview"
        title="Keep every immigration matter moving from document to proof."
        description="Your workspace is grounded in the records actually saved to your account. Start a workflow, review the extracted facts, prepare correspondence, approve the exact packet, and keep mailing history together."
        actions={<Link to="/workflows/respond-to-notice" className="mmp-button-primary"><Plus size={15} /> New matter</Link>}
        meta={<><span>{mailings.length} mailing{mailings.length === 1 ? "" : "s"}</span><span>{correspondence.length} saved draft{correspondence.length === 1 ? "" : "s"}</span></>}
      />

      {error && <div className="alert alert-error">{error}</div>}

      <WorkspaceMetrics metrics={[
        { label: "Total mailings", value: mailings.length },
        { label: "In transit", value: inTransit },
        { label: "Delivered", value: delivered },
        { label: "Saved drafts", value: correspondence.length },
      ]} />

      <WorkflowHub
        title="Start from the work you actually need to do."
        description="These are live Immigration Mail workflows already present in the product. The hub is a discovery layer; the underlying workflow, review, approval, payment, mailing, and proof boundaries remain unchanged."
        actions={<Link to="/workflows" className="mmp-button-secondary">Browse all workflows</Link>}
        items={[
          { title: "Respond to a Notice", description: "Start from the USCIS or immigration notice you received and build a source-linked response record.", href: "/workflows/respond-to-notice", eyebrow: "Flagship", badge: "Live", icon: <Workflow /> },
          { title: "Supporting Documents", description: "Organize a supporting-document package around the facts and records that belong with the correspondence.", href: "/workflows/supporting-documents", eyebrow: "Evidence", badge: "Live", icon: <FolderOpen /> },
          { title: "Explanation Letter", description: "Prepare a factual explanation letter from reviewed information without inventing facts, requirements, or legal conclusions.", href: "/workflows/explanation-letter", eyebrow: "Correspondence", badge: "Live", icon: <Mail /> },
        ]}
      />

      <section id="recent" className="mmp-workspace-section">
        <div className="mmp-workspace-section__head">
          <h2>Recent mailing activity</h2>
          <span className="text-xs text-muted-foreground">Account data only</span>
        </div>
        <div className="mmp-workspace-panel">
          {loading ? (
            <div className="mmp-workspace-empty"><p>Loading your mailing history…</p></div>
          ) : mailings.length === 0 ? (
            <div className="mmp-workspace-empty">
              <Mail size={24} className="mx-auto text-brass" />
              <h3 className="mt-4">No mailings yet</h3>
              <p>Complete a workflow and approve the packet when you are ready to create your first tracked mailing record.</p>
              <Link to="/workflows" className="mmp-button-primary mt-5">Choose a workflow</Link>
            </div>
          ) : (
            <div className="mmp-workspace-list">
              {mailings.slice(0, 8).map((m) => (
                <div key={m.id} className="mmp-workspace-row">
                  <div className="mmp-workspace-row__main">
                    <div className="mmp-workspace-row__title">{m.recipient_name || "Recipient"}</div>
                    <div className="mmp-workspace-row__meta">{m.workflow_id.replace(/-/g, " ")} · {formatMailMethod(m.mail_method)} · {formatPrice(m.price_cents)} · {formatDate(m.created_date)}</div>
                    {m.tracking_number && <div className="mt-1 font-mono text-xs text-brass">{m.tracking_number}</div>}
                  </div>
                  <span className={`badge-base ${m.status === "delivered" || m.status === "completed" ? "badge-success" : m.status === "in_transit" || m.status === "pending" ? "badge-brass" : "badge-muted"}`}>{m.status.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {correspondence.length > 0 && (
        <section className="mmp-workspace-section">
          <div className="mmp-workspace-section__head"><h2>Saved drafts</h2></div>
          <div className="mmp-workspace-panel mmp-workspace-list">
            {correspondence.slice(0, 8).map((c) => (
              <div key={c.id} className="mmp-workspace-row">
                <div className="mmp-workspace-row__main">
                  <div className="mmp-workspace-row__title">{c.title}</div>
                  <div className="mmp-workspace-row__meta">{c.workflow_id.replace(/-/g, " ")} · {formatDate(c.created_date)}</div>
                </div>
                <span className={`badge-base ${c.status === "approved" ? "badge-success" : c.status === "pending" ? "badge-brass" : "badge-muted"}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}
