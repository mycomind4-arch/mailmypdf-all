import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
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
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hasNestedWorkflow = pathname.split("/").filter(Boolean).length > 3

  return hasNestedWorkflow ? <Outlet /> : <AuthenticatedWorkflowBrowser sectionId={sectionId} />
}
