import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";

export const Route = createFileRoute("/mail/$")({
  component: MailWorkflowPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params._splat ?? "Mail workflow"} — MailMyPDF` },
      { name: "description", content: "A permanent MailMyPDF workflow authority hub and mailing workflow page." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function MailWorkflowPage() {
  const { _splat } = Route.useParams();
  const path = `/mail/${_splat ?? ""}`;
  const page = workflowAuthorityForPath(path);
  if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
  if (page) return <WorkflowAuthorityPage page={page} />;
  return <ProductPlaceholderPage product="MailMyPDF" title={_splat ?? "Mail workflow"} description="A permanent MailMyPDF workflow authority hub and mailing workflow page." path={path} />;
}
