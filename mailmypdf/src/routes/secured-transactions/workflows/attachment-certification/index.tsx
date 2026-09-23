// Thin file-route mount for the top-level secured-transactions/workflows/attachment-certification/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/attachment-certification/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/attachment-certification/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/attachment-certification/schema"

export const Route = createFileRoute("/secured-transactions/workflows/attachment-certification/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
