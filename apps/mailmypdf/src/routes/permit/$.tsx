import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
export const Route = createFileRoute("/permit/$")({ component: PermitWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Permit workflow"} — Permit Reply | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function PermitWorkflowPage() { const { _splat } = Route.useParams(); return <WorkflowAuthorityPage product="Permit Reply" workflowSlug={_splat ?? "workflow"} pipeline="P09_REGULATORY" />; }
