import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["claim-proof"]

export const Route = createFileRoute("/claim-proof/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
