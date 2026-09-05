import { createFileRoute } from "@tanstack/react-router";
import { IrsNoticeWorkflow } from "@/components/workflows/irs-notice-workflow";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";

export const Route = createFileRoute("/notice/$")({
  head: ({ params }) => ({ meta: [{ title: `${params._splat === "cp14-response" ? "CP14 Response" : params._splat === "cp2000-response" ? "CP2000 Response" : "Notice Respond"} | MailMyPDF` }] }),
  component: () => {
    const slug = Route.useParams()._splat;
    if (slug === "cp14-response" || slug === "cp2000-response") return <IrsNoticeWorkflow workflow={slug} />;
    return <WorkflowAuthorityPage product="Notice Respond" workflowSlug={slug ?? "irs-notice"} pipeline="P02_OFFICIAL_RESPONSE" />;
  },
});
