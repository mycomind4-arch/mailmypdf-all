// Thin file-route mount for the top-level secured-transactions/workflows/security-agreement-generation/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/security-agreement-generation/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/security-agreement-generation/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/security-agreement-generation/schema"

export const Route = createFileRoute("/secured-transactions/workflows/security-agreement-generation/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
