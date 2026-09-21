// Thin file-route mount. TanStack Router's file-based generator only
// discovers routes under this app's own routesDirectory (src/routes/), so
// the notice-respond/ package's real section page — its config, SEO head,
// and component — needs a matching file here to become reachable. No page
// content lives in this file; it all comes from the canonical package.
import { createFileRoute } from "@tanstack/react-router"
import { SectionLandingPage } from "@mailmypdf/design-system"
import { createSectionHead } from "@mailmypdf/seo"
import noticeRespondConfig from "../../../../notice-respond/config"

export const Route = createFileRoute("/notice-respond/")({
  head: () => createSectionHead(noticeRespondConfig),
  component: () => <SectionLandingPage config={noticeRespondConfig} />,
})
