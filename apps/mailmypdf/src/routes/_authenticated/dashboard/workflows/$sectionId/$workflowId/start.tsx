import { createFileRoute } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { workflowNavigationItem } from "@/lib/workflow-navigation"
import { workflowStartComponent } from "@/lib/workflow-start-registry"
import { workflowExecutionRecord } from "@mailmypdf/workflows"

// Generic host bridge for every executable new-architecture workflow. This
// route never falls back to apps/verticals/**: if the execution registry
// does not mark (sectionId, workflowId) executable, or no real start
// component is wired for it, this renders a fail-closed "Not connected"
// state rather than guessing at a legacy implementation.
export const Route = createFileRoute(
  "/_authenticated/dashboard/workflows/$sectionId/$workflowId/start",
)({
  head: () => ({
    meta: [
      { title: "Start workflow — MailMyPDF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkflowStartBridge,
})

function WorkflowStartBridge() {
  const { sectionId, workflowId } = Route.useParams()
  const entry = workflowNavigationItem(sectionId, workflowId)
  const execution = workflowExecutionRecord(sectionId, workflowId)
  const StartComponent =
    execution?.executionStatus === "executable"
      ? workflowStartComponent(sectionId, workflowId)
      : undefined

  if (!entry) {
    return (
      <div className="rounded-md border border-rule bg-card p-8">
        <h1 className="font-serif text-3xl">Workflow not found</h1>
        <Link to="/dashboard/workflows" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cobalt">
          <ArrowLeft className="h-4 w-4" /> Back to workflows
        </Link>
      </div>
    )
  }

  if (!StartComponent) {
    return (
      <div className="rounded-md border border-rule bg-card p-8">
        <h1 className="font-serif text-3xl">Not connected</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {entry.workflow.label} does not yet have a real runtime implementation wired into the new
          architecture. It cannot be started from here.
        </p>
        <Link
          to="/dashboard/workflows/$sectionId/$workflowId"
          params={{ sectionId, workflowId }}
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cobalt"
        >
          <ArrowLeft className="h-4 w-4" /> Back to workflow
        </Link>
      </div>
    )
  }

  return <StartComponent />
}
