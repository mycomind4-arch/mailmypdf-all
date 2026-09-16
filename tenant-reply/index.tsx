import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import tenantReplyConfig from "./config"

export const Route = createFileRoute("/tenant-reply/")({
  head: () => createSectionHead(tenantReplyConfig),
  component: () => <SectionLandingPage config={tenantReplyConfig} />,
})
