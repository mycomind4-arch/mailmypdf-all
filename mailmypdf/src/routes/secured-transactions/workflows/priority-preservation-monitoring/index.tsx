// Thin file-route mount for the top-level secured-transactions/workflows/priority-preservation-monitoring/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/priority-preservation-monitoring/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/priority-preservation-monitoring/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/priority-preservation-monitoring/schema"

export const Route = createFileRoute("/secured-transactions/workflows/priority-preservation-monitoring/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
