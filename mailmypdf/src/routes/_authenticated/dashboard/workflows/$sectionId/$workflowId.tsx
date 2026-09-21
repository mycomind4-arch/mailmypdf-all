import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { AuthenticatedWorkflowDetail } from "@/components/authenticated-workflow-detail"

export const Route = createFileRoute("/_authenticated/dashboard/workflows/$sectionId/$workflowId")({
  head: () => ({
    meta: [
      { title: "Workflow — MailMyPDF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkflowWorkspace,
})

function WorkflowWorkspace() {
  const { sectionId, workflowId } = Route.useParams()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isStartRoute = pathname.endsWith("/start")

  return isStartRoute
    ? <Outlet />
    : <AuthenticatedWorkflowDetail sectionId={sectionId} workflowId={workflowId} />
}
