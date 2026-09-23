// Thin file-route mount for the top-level secured-transactions/workflows/perfection-execution/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/perfection-execution/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/perfection-execution/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/perfection-execution/schema"

export const Route = createFileRoute("/secured-transactions/workflows/perfection-execution/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
