import { createElement } from "react";
import { createWorkspacePageHeader, createWorkspaceShell, createWorkspaceTopbar } from "@mailmypdf/design-system";

const WorkspaceShell = createWorkspaceShell(createElement);
const WorkspaceTopbar = createWorkspaceTopbar(createElement);
const WorkspacePageHeader = createWorkspacePageHeader(createElement);

export function SecuredTransactionWorkflowStartScaffold(props: {
  title: string;
  description: string;
}) {
  return (
    <WorkspaceShell
      theme="secured-transactions"
      productName="Secured Transactions"
      homeHref="/secured-transactions"
      sections={[{
        label: "Workspace",
        items: [
          { label: "Workflows", href: "/secured-transactions/workflows", active: true },
          { label: "My Matters", href: "/matters" },
          { label: "Documents", href: "/documents" },
        ],
      }]}
      topbar={<WorkspaceTopbar title={props.title} subtitle="Authenticated workflow workspace" />}
    >
      <WorkspacePageHeader
        eyebrow="Secured Transactions"
        title={props.title}
        description={props.description}
        meta={<span>Scaffolded · execution disabled while workflow rules and authority coverage are incomplete.</span>}
      />
      <section className="mmp-workspace-panel">
        <div className="mmp-eyebrow">Build status</div>
        <h2>This workflow is wired as a non-executable scaffold.</h2>
        <p>It can be developed against the shared identity/capacity and workflow architecture without exposing unfinished consequential actions.</p>
      </section>
    </WorkspaceShell>
  );
}
