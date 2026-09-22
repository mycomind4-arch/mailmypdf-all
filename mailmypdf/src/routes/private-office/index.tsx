// Thin file-route mount for the private-office/ package's section page (see
// notice-respond/index.tsx here for why these mounts exist). No page content
// lives in this file; it all comes from the canonical package.
import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import privateOfficeConfig from "../../../../private-office/config"

export const Route = createFileRoute("/private-office/")({
  head: () => createSectionHead(privateOfficeConfig),
  component: () => <SectionLandingPage config={privateOfficeConfig} />,
})
