import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import insuranceClaimsConfig from "../../../../insurance-claims/config"

export const Route = createFileRoute("/insurance-claims/")({
  head: () => createSectionHead(insuranceClaimsConfig),
  component: () => <SectionLandingPage config={insuranceClaimsConfig} />,
})
