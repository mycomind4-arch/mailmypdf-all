import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import legalDefenseConfig from "../../../../legal-defense/config"

export const Route = createFileRoute("/legal-defense/")({
  head: () => createSectionHead(legalDefenseConfig),
  component: () => <SectionLandingPage config={legalDefenseConfig} />,
})
