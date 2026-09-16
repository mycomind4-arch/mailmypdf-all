import { createFileRoute } from "@tanstack/react-router"
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
  return <AuthenticatedWorkflowDetail sectionId={sectionId} workflowId={workflowId} />
}
