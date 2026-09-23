import { createFileRoute } from "@tanstack/react-router"
import { WorkflowLandingPage } from "@mailmypdf/design-system"
import workflowConfig from "../../../../../../notice-respond/workflows/cp2000-response/config"
import workflowSeo from "../../../../../../notice-respond/workflows/cp2000-response/seo"
import workflowSchema from "../../../../../../notice-respond/workflows/cp2000-response/schema"

export const Route = createFileRoute("/notice-respond/workflows/cp2000-response/")({
  head: () => ({
    ...workflowSeo,
    scripts: workflowSchema.map((schema) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  }),
  component: () => <WorkflowLandingPage config={workflowConfig} />,
})
