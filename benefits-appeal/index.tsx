import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["benefits-appeal"]

export const Route = createFileRoute("/benefits-appeal/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
