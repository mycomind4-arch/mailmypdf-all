import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import smallBusinessConfig from "./config"

export const Route = createFileRoute("/small-business/")({
  head: () => createSectionHead(smallBusinessConfig),
  component: () => <SectionLandingPage config={smallBusinessConfig} />,
})
