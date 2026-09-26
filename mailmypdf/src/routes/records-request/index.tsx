import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import recordsRequestConfig from "../../../../records-request/config"

export const Route = createFileRoute("/records-request/")({
  head: () => createSectionHead(recordsRequestConfig),
  component: () => <SectionLandingPage config={recordsRequestConfig} />,
})
