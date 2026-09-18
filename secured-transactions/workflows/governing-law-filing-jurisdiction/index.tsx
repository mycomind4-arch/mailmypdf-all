import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLandingPage } from "@mailmypdf/design-system";
import workflowConfig from "./config";
import workflowSeo from "./seo";
import workflowSchema from "./schema";

export const Route = createFileRoute("/secured-transactions/workflows/governing-law-filing-jurisdiction/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
});
