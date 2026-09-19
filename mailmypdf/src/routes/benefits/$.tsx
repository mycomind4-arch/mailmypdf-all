import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
import { SsdiDenialWorkflow } from "@/components/workflows/ssdi-denial-workflow";
export const Route = createFileRoute("/benefits/$")({
  component: BenefitsWorkflowPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params._splat ?? "Benefits workflow"} — Benefits Appeal | MailMyPDF` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
function BenefitsWorkflowPage() {
  const { _splat } = Route.useParams();
  if (_splat === "ssdi-denial") return <SsdiDenialWorkflow />;
  const path = `/benefits/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return (
    <ProductPlaceholderPage
      product="Benefits Appeal"
      title={_splat ?? "Benefits workflow"}
      description="Prepare a documented benefits appeal with the MailMyPDF workflow engine."
      path={path}
    />
  );
}
