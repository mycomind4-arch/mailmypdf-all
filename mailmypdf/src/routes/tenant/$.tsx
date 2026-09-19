import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
export const Route = createFileRoute("/tenant/$")({ component: TenantWorkflowPage, head: ({ params }) => ({ meta: [{ title: `${params._splat ?? "Tenant workflow"} — Tenant Reply | MailMyPDF` }, { name: "robots", content: "noindex,nofollow" }] }) });
function TenantWorkflowPage() {
  const { _splat } = Route.useParams();
  const path = `/tenant/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return <ProductPlaceholderPage product="Tenant Reply" title={_splat ?? "Tenant workflow"} description="Prepare a documented housing or tenant-related response." path={path} />;
}
