import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import benefitsAppealConfig from "../../../../benefits-appeal/config"

export const Route = createFileRoute("/benefits-appeal/")({
  head: () => createSectionHead(benefitsAppealConfig),
  component: () => <SectionLandingPage config={benefitsAppealConfig} />,
})
