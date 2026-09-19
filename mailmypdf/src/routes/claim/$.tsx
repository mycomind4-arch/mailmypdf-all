import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
export const Route = createFileRoute("/claim/$")({ component: ClaimWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Claim workflow"} — Claim Proof | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function ClaimWorkflowPage() {
  const { _splat } = Route.useParams();
  const path = `/claim/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return <ProductPlaceholderPage product="Claim Proof" title={_splat ?? "Claim workflow"} description="Document and preserve proof of a claim, submission, or delivery." path={path} />;
}
