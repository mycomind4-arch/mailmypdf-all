import { createFileRoute } from "@tanstack/react-router"
import { AuthenticatedWorkflowBrowser } from "@/components/authenticated-workflow-browser"

export const Route = createFileRoute("/_authenticated/dashboard/workflows/$sectionId")({
  head: () => ({
    meta: [
      { title: "Workflows — MailMyPDF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SectionWorkflowBrowser,
})

function SectionWorkflowBrowser() {
  const { sectionId } = Route.useParams()
  return <AuthenticatedWorkflowBrowser sectionId={sectionId} />
}
