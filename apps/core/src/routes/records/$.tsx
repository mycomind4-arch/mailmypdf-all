import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
export const Route = createFileRoute("/records/$")({ component: RecordsWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Records workflow"} — Records Request | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function RecordsWorkflowPage() { const { _splat } = Route.useParams(); return <WorkflowAuthorityPage product="Records Request" workflowSlug={_splat ?? "workflow"} pipeline="P08_RECORDS" />; }
