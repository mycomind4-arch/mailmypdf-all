// Thin file-route mount for the top-level secured-transactions/workflows/first-priority-determination/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/first-priority-determination/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/first-priority-determination/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/first-priority-determination/schema"

export const Route = createFileRoute("/secured-transactions/workflows/first-priority-determination/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
