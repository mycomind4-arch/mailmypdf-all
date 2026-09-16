import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import disputeMailConfig from "./config"

export const Route = createFileRoute("/dispute-mail/")({
  head: () => createSectionHead(disputeMailConfig),
  component: () => <SectionLandingPage config={disputeMailConfig} />,
})
