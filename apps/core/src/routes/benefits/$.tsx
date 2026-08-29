import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
export const Route = createFileRoute("/benefits/$")({ component: BenefitsWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Benefits workflow"} — Benefits Appeal | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function BenefitsWorkflowPage() { const { _splat } = Route.useParams(); return <WorkflowAuthorityPage product="Benefits Appeal" workflowSlug={_splat ?? "workflow"} pipeline="P03_APPEAL" />; }
