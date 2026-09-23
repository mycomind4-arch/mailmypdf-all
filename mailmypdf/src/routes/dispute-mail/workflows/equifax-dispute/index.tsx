// Thin file-route mount — see ../../../../../../dispute-mail/index.tsx
// (dispute-mail section) for why this file exists. Page content (config,
// SEO, schema, component) is owned entirely by
// dispute-mail/workflows/equifax-dispute/.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../dispute-mail/workflows/equifax-dispute/config"
import workflowSeo from "../../../../../../dispute-mail/workflows/equifax-dispute/seo"
import workflowSchema from "../../../../../../dispute-mail/workflows/equifax-dispute/schema"

export const Route = createFileRoute("/dispute-mail/workflows/equifax-dispute/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
