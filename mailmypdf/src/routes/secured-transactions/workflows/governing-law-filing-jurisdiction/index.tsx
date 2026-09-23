// Thin file-route mount for the top-level secured-transactions/workflows/governing-law-filing-jurisdiction/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/governing-law-filing-jurisdiction/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/governing-law-filing-jurisdiction/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/governing-law-filing-jurisdiction/schema"

export const Route = createFileRoute("/secured-transactions/workflows/governing-law-filing-jurisdiction/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
