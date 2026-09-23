// Thin file-route mount for the top-level secured-transactions/workflows/secured-transaction-eligibility/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/secured-transaction-eligibility/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/secured-transaction-eligibility/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/secured-transaction-eligibility/schema"

export const Route = createFileRoute("/secured-transactions/workflows/secured-transaction-eligibility/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
