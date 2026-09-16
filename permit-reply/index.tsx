import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["permit-reply"]

export const Route = createFileRoute("/permit-reply/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
