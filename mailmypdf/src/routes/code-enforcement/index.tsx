// Thin file-route mount for the code-enforcement/ package's section page (see
// notice-respond/index.tsx here for why these mounts exist). No page content
// lives in this file; it all comes from the canonical package.
import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import codeEnforcementConfig from "../../../../code-enforcement/config"

export const Route = createFileRoute("/code-enforcement/")({
  head: () => createSectionHead(codeEnforcementConfig),
  component: () => <SectionLandingPage config={codeEnforcementConfig} />,
})
