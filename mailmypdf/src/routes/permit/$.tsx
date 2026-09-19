import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
export const Route = createFileRoute("/permit/$")({ component: PermitWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Permit workflow"} — Permit Reply | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function PermitWorkflowPage() {
  const { _splat } = Route.useParams();
  const path = `/permit/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return <ProductPlaceholderPage product="Permit Reply" title={_splat ?? "Permit workflow"} description="Prepare a permit, licensing, or regulatory response with requirement-aware review." path={path} />;
}
