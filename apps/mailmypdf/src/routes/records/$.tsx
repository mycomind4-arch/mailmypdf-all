import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
export const Route = createFileRoute("/records/$")({ component: RecordsWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Records workflow"} — Records Request | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function RecordsWorkflowPage() {
  const { _splat } = Route.useParams();
  const path = `/records/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return <ProductPlaceholderPage product="Records Request" title={_splat ?? "Records workflow"} description="Prepare a focused records or information request with recipient, scope, and proof handling." path={path} />;
}
