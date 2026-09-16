import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@/migration-copy/section-landing"
import { sectionLandingConfigs } from "@/migration-copy/section-catalog"

const config = sectionLandingConfigs["benefits-appeal"]

export const Route = createFileRoute("/migration-preview/benefits-appeal")({
  head: () => ({
    meta: [
      { title: config.seoTitle + " — Migration Preview" },
      { name: "description", content: config.seoDescription },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://mailmypdf.pages.dev" + config.path }],
  }),
  component: () => <SectionLandingPage config={config} />,
})
