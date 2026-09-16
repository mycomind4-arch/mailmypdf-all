import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["private-office"]

export const Route = createFileRoute("/private-office/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
