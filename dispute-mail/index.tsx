import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["dispute-mail"]

export const Route = createFileRoute("/dispute-mail/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
