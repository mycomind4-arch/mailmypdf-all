// Thin file-route mount for the top-level secured-transactions/workflows/pre-filing-lien-priority-search/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/pre-filing-lien-priority-search/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/pre-filing-lien-priority-search/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/pre-filing-lien-priority-search/schema"

export const Route = createFileRoute("/secured-transactions/workflows/pre-filing-lien-priority-search/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
