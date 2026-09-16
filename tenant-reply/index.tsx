import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["tenant-reply"]

export const Route = createFileRoute("/tenant-reply/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
