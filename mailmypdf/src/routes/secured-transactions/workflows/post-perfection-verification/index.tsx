// Thin file-route mount for the top-level secured-transactions/workflows/post-perfection-verification/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/post-perfection-verification/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/post-perfection-verification/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/post-perfection-verification/schema"

export const Route = createFileRoute("/secured-transactions/workflows/post-perfection-verification/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
