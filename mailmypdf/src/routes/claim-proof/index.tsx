import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import claimProofConfig from "../../../../claim-proof/config"

export const Route = createFileRoute("/claim-proof/")({
  head: () => createSectionHead(claimProofConfig),
  component: () => <SectionLandingPage config={claimProofConfig} />,
})
