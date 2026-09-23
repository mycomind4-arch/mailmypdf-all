// Thin file-route mount for the top-level secured-transactions/workflows/obligation-value/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/obligation-value/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/obligation-value/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/obligation-value/schema"

export const Route = createFileRoute("/secured-transactions/workflows/obligation-value/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
