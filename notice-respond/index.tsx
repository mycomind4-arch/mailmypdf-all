import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["notice-respond"]

export const Route = createFileRoute("/notice-respond/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
