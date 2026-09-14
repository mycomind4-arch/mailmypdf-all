import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
export const Route = createFileRoute("/business/$")({ component: BusinessWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Business workflow"} — Small Business Mail | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function BusinessWorkflowPage() {
  const { _splat } = Route.useParams();
  const path = `/business/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return <ProductPlaceholderPage product="Small Business Mail" title={_splat ?? "Business workflow"} description="Prepare business correspondence with approval and recordkeeping controls." path={path} />;
}
