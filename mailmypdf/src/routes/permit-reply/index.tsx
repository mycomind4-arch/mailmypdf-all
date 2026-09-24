import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import permitReplyConfig from "../../../../permit-reply/config"

export const Route = createFileRoute("/permit-reply/")({
  head: () => createSectionHead(permitReplyConfig),
  component: () => <SectionLandingPage config={permitReplyConfig} />,
})
