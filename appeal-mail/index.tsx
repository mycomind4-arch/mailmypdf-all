import { createFileRoute } from "@tanstack/react-router"
import { createSectionHead, SectionLandingPage } from "../shared/section-landing"
import { sectionLandingConfigs } from "../shared/section-catalog"

const config = sectionLandingConfigs["appeal-mail"]

export const Route = createFileRoute("/appeal-mail/")({
  head: () => createSectionHead(config),
  component: () => <SectionLandingPage config={config} />,
})
