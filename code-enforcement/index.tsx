import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import codeEnforcementConfig from "./config"

export const Route = createFileRoute("/code-enforcement/")({
  head: () => createSectionHead(codeEnforcementConfig),
  component: () => <SectionLandingPage config={codeEnforcementConfig} />,
})
