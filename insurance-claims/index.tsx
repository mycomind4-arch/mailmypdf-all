import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["insurance-claims"]

export const Route = createFileRoute("/insurance-claims/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
