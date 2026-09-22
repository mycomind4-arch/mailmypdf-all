// Thin file-route mount for the immigration-mail/ package's section page (see
// notice-respond/index.tsx here for why these mounts exist). No page content
// lives in this file; it all comes from the canonical package.
import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import immigrationMailConfig from "../../../../immigration-mail/config"

export const Route = createFileRoute("/immigration-mail/")({
  head: () => createSectionHead(immigrationMailConfig),
  component: () => <SectionLandingPage config={immigrationMailConfig} />,
})
