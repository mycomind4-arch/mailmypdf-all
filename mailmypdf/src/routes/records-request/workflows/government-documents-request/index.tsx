// Thin file-route mount for the top-level records-request/workflows/government-documents-request/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../records-request/workflows/government-documents-request/config"
import workflowSeo from "../../../../../../records-request/workflows/government-documents-request/seo"
import workflowSchema from "../../../../../../records-request/workflows/government-documents-request/schema"

export const Route = createFileRoute("/records-request/workflows/government-documents-request/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
