import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["records-request"]

export const Route = createFileRoute("/records-request/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
