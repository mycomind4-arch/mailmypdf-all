// Thin file-route mount for the top-level secured-transactions/workflows/collateral-ownership-classification/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/collateral-ownership-classification/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/collateral-ownership-classification/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/collateral-ownership-classification/schema"

export const Route = createFileRoute("/secured-transactions/workflows/collateral-ownership-classification/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
