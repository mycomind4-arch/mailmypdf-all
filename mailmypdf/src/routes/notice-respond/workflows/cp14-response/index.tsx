// Thin file-route mount — see ../../index.tsx (notice-respond section) for
// why this file exists. Page content (config, SEO, schema, component) is
// owned entirely by notice-respond/workflows/cp14-response/.
import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../notice-respond/workflows/cp14-response/config"
import workflowSeo from "../../../../../../notice-respond/workflows/cp14-response/seo"
import workflowSchema from "../../../../../../notice-respond/workflows/cp14-response/schema"

export const Route = createFileRoute("/notice-respond/workflows/cp14-response/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
