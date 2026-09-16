import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import immigrationMailConfig from "./config"

export const Route = createFileRoute("/immigration-mail/")({
  head: () => createSectionHead(immigrationMailConfig),
  component: () => <SectionLandingPage config={immigrationMailConfig} />,
})
