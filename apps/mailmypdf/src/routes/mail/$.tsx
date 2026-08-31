import { createFileRoute } from "@tanstack/react-router";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";

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
  return <WorkflowAuthorityPage product="MailMyPDF" workflowSlug={_splat ?? "workflow"} pipeline="P01_CORE_MAIL" />;
}
