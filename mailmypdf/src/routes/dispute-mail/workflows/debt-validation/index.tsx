// Non-indexable landing mount for the unfinished debt-validation workflow.
// Do not advertise payment, fulfillment or a production-ready execution path.
import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLandingPage } from "@mailmypdf/design-system";
import workflowConfig from "../../../../../../dispute-mail/workflows/debt-validation/config";

export const Route = createFileRoute("/dispute-mail/workflows/debt-validation/")({
  head: () => ({
    meta: [
      { title: workflowConfig.seoTitle },
      { name: "description", content: workflowConfig.seoDescription },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
});
