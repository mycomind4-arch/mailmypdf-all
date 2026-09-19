import { createFileRoute } from "@tanstack/react-router";
import { IrsNoticeWorkflow } from "@/components/workflows/irs-notice-workflow";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
import { isNoticeWorkflowId, NOTICE_WORKFLOW_CONFIGS } from "@/lib/notice-workflow-registry";

export const Route = createFileRoute("/notice/$")({
  head: ({ params }) => ({ meta: [{ title: `${isNoticeWorkflowId(params._splat) ? `${NOTICE_WORKFLOW_CONFIGS[params._splat].noticeLabel} Response` : "Notice Respond"} | MailMyPDF` }] }),
  component: () => {
    const slug = Route.useParams()._splat;
    if (isNoticeWorkflowId(slug)) return <IrsNoticeWorkflow workflow={slug} />;
    const path = `/notice/${slug ?? "irs-notice"}`;
    const page = workflowAuthorityForPath(path);
    if (page?.authority) return <WorkflowAuthorityRichPage page={{ ...page, authority: page.authority }} />;
    if (page) return <WorkflowAuthorityPage page={page} />;
    return <ProductPlaceholderPage product="Notice Respond" title={slug ?? "irs-notice"} description="Organize a notice, understand its requirements, prepare a response, and preserve the mailing record." path={path} />;
  },
});
