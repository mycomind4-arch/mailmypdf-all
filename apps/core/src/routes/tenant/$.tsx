import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
export const Route = createFileRoute("/tenant/$")({ component: TenantWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Tenant workflow"} — Tenant Reply | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function TenantWorkflowPage() { const { _splat } = Route.useParams(); return <WorkflowAuthorityPage product="Tenant Reply" workflowSlug={_splat ?? "workflow"} pipeline="P09_REGULATORY" />; }
