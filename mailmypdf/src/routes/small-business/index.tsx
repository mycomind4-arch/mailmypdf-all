// Thin file-route mount for the small-business/ package's section page (see
// notice-respond/index.tsx here for why these mounts exist). No page content
// lives in this file; it all comes from the canonical package.
import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import smallBusinessConfig from "../../../../small-business/config"

export const Route = createFileRoute("/small-business/")({
  head: () => createSectionHead(smallBusinessConfig),
  component: () => <SectionLandingPage config={smallBusinessConfig} />,
})
