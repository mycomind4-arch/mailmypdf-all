// Thin file-route mount for the dispute-mail/ package's section page (see
// notice-respond/index.tsx here for why these mounts exist). No page content
// lives in this file; it all comes from the canonical package.
import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import disputeMailConfig from "../../../../dispute-mail/config"

export const Route = createFileRoute("/dispute-mail/")({
  head: () => createSectionHead(disputeMailConfig),
  component: () => <SectionLandingPage config={disputeMailConfig} />,
})
