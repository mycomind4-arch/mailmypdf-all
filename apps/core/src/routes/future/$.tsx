import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
export const Route = createFileRoute("/future/$")({ component: FutureWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Future workflow"} — MailMyPDF | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function FutureWorkflowPage() { const { _splat } = Route.useParams(); return <WorkflowAuthorityPage product="Future Mail" workflowSlug={_splat ?? "workflow"} pipeline="P01_CORE_MAIL" />; }
