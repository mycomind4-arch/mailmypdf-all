import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLandingPage } from "@mailmypdf/design-system";
import workflowConfig from "./config";
import workflowSeo from "./seo";
import workflowSchema from "./schema";

export const Route = createFileRoute("/secured-transactions/workflows/ucc1-preparation-authorization/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
});
