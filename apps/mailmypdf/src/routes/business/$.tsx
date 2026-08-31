import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
export const Route = createFileRoute("/business/$")({ component: BusinessWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Business workflow"} — Small Business Mail | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function BusinessWorkflowPage() { const { _splat } = Route.useParams(); return <WorkflowAuthorityPage product="Small Business Mail" workflowSlug={_splat ?? "workflow"} pipeline="P07_BUSINESS" />; }
