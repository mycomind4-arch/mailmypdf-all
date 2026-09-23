// Thin file-route mount for the top-level appeal-mail/workflows/appeal-denied-claim/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../appeal-mail/workflows/appeal-denied-claim/config"
import workflowSeo from "../../../../../../appeal-mail/workflows/appeal-denied-claim/seo"
import workflowSchema from "../../../../../../appeal-mail/workflows/appeal-denied-claim/schema"

export const Route = createFileRoute("/appeal-mail/workflows/appeal-denied-claim/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
