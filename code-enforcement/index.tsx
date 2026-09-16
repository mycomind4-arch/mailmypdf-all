import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["code-enforcement"]

export const Route = createFileRoute("/code-enforcement/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
