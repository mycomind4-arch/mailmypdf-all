import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import privateOfficeConfig from "./config"

export const Route = createFileRoute("/private-office/")({
  head: () => createSectionHead(privateOfficeConfig),
  component: () => <SectionLandingPage config={privateOfficeConfig} />,
})
