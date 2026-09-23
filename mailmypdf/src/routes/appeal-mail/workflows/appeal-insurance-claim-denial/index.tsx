// Thin file-route mount for the top-level appeal-mail/workflows/appeal-insurance-claim-denial/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../appeal-mail/workflows/appeal-insurance-claim-denial/config"
import workflowSeo from "../../../../../../appeal-mail/workflows/appeal-insurance-claim-denial/seo"
import workflowSchema from "../../../../../../appeal-mail/workflows/appeal-insurance-claim-denial/schema"

export const Route = createFileRoute("/appeal-mail/workflows/appeal-insurance-claim-denial/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
