import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
export const Route = createFileRoute("/future/$")({ component: FutureWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Future workflow"} — MailMyPDF | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function FutureWorkflowPage() {
  const { _splat } = Route.useParams();
  const path = `/future/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return <ProductPlaceholderPage product="Future Mail" title={_splat ?? "Future workflow"} description="A reserved MailMyPDF workflow URL." path={path} />;
}
