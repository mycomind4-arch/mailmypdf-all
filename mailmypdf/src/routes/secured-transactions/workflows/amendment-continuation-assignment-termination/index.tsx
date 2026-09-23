// Thin file-route mount for the top-level secured-transactions/workflows/amendment-continuation-assignment-termination/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/amendment-continuation-assignment-termination/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/amendment-continuation-assignment-termination/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/amendment-continuation-assignment-termination/schema"

export const Route = createFileRoute("/secured-transactions/workflows/amendment-continuation-assignment-termination/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
