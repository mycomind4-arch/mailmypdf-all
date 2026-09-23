// Thin file-route mount for the top-level secured-transactions/workflows/ucc1-preparation-authorization/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../secured-transactions/workflows/ucc1-preparation-authorization/config"
import workflowSeo from "../../../../../../secured-transactions/workflows/ucc1-preparation-authorization/seo"
import workflowSchema from "../../../../../../secured-transactions/workflows/ucc1-preparation-authorization/schema"

export const Route = createFileRoute("/secured-transactions/workflows/ucc1-preparation-authorization/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema: unknown) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
