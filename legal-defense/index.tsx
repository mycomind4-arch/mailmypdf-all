import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["legal-defense"]

export const Route = createFileRoute("/legal-defense/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
