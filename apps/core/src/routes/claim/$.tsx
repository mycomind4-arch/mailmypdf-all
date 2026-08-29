import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
export const Route = createFileRoute("/claim/$")({ component: ClaimWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Claim workflow"} — Claim Proof | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function ClaimWorkflowPage() { const { _splat } = Route.useParams(); return <WorkflowAuthorityPage product="Claim Proof" workflowSlug={_splat ?? "workflow"} pipeline="P10_CLAIM_PROOF" />; }
