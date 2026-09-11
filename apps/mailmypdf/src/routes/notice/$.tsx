import { createFileRoute } from "@tanstack/react-router";
import { IrsNoticeWorkflow } from "@/components/workflows/irs-notice-workflow";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { isNoticeWorkflowId, NOTICE_WORKFLOW_CONFIGS } from "@/lib/notice-workflow-registry";

export const Route = createFileRoute("/notice/$")({
  head: ({ params }) => ({ meta: [{ title: `${isNoticeWorkflowId(params._splat) ? `${NOTICE_WORKFLOW_CONFIGS[params._splat].noticeLabel} Response` : "Notice Respond"} | MailMyPDF` }] }),
  component: () => {
    const slug = Route.useParams()._splat;
    if (isNoticeWorkflowId(slug)) return <IrsNoticeWorkflow workflow={slug} />;
    return <WorkflowAuthorityPage product="Notice Respond" workflowSlug={slug ?? "irs-notice"} pipeline="P02_OFFICIAL_RESPONSE" />;
  },
});
