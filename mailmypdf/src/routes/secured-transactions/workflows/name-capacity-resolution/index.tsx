// Thin file-route mount for the top-level secured-transactions/workflows/name-capacity-resolution/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/name-capacity-resolution/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/name-capacity-resolution/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/name-capacity-resolution/schema"

export const Route = createFileRoute("/secured-transactions/workflows/name-capacity-resolution/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
