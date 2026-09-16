import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import noticeRespondConfig from "./config"

export const Route = createFileRoute("/notice-respond/")({
  head: () => createSectionHead(noticeRespondConfig),
  component: () => <SectionLandingPage config={noticeRespondConfig} />,
})
