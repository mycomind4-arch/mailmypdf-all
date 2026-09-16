import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["small-business"]

export const Route = createFileRoute("/small-business/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
