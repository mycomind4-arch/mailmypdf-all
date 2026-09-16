import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import appealMailConfig from "./config"

export const Route = createFileRoute("/appeal-mail/")({
  head: () => createSectionHead(appealMailConfig),
  component: () => <SectionLandingPage config={appealMailConfig} />,
})
