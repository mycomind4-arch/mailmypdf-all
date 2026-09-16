import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { ArrowLeft, ExternalLink, ShieldCheck, Wrench } from "lucide-react"
import { WorkflowDetailSummary } from "../../../../packages/workflow-ui/src/WorkflowDetailSummary"
import { isCurrentUserAdmin } from "@/lib/admin.functions"
import { workflowNavigationItem } from "@/lib/workflow-navigation"
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry"

export function AuthenticatedWorkflowDetail({
  sectionId,
  workflowId,
}: {
  sectionId: string
  workflowId: string
}) {
  const entry = workflowNavigationItem(sectionId, workflowId)
  const checkAdmin = useServerFn(isCurrentUserAdmin)
  const { data: adminAccess } = useQuery({
    queryKey: ["workflow-detail-admin-access"],
    queryFn: () => checkAdmin(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const isAdmin = adminAccess?.isAdmin === true

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

  const { section, workflow } = entry
  const authority = workflowAuthorityForPath(workflow.publicHref)
  const executionHref = authority?.executionHref ?? undefined

  return (
    <div className="space-y-6">
      <WorkflowDetailSummary
        title={workflow.label}
        sectionLabel={section.label}
        backHref={section.workspaceHref}
        startHref={executionHref}
        metrics={[
          { label: "Execution", value: executionHref ? "Ready" : "Not connected", tone: executionHref ? "success" : "neutral" },
          { label: "Workspace", value: "Available", tone: "success" },
          { label: "Account", value: "Authenticated", tone: "success" },
          { label: "Product", value: section.label },
        ]}
      />

      {isAdmin && (
        <section className="rounded-md border border-rule/70 bg-card">
          <div className="flex items-center gap-2 border-b border-rule/70 px-5 py-4">
            <Wrench className="h-4 w-4 text-cobalt" />
            <h2 className="text-sm font-semibold">Studio / Admin</h2>
          </div>
          <div className="grid gap-px bg-rule/60 sm:grid-cols-2 lg:grid-cols-3">
            <AdminMetric label="Publication" value={authority?.publicationState ?? "DRAFT"} />
            <AdminMetric label="SEO" value={authority?.indexable ? "Indexable" : "Noindex"} />
            <AdminMetric label="Authority score" value={authority?.authorityScore == null ? "Not scored" : String(authority.authorityScore)} />
            <AdminMetric label="Last reviewed" value={authority?.reviewedAt ?? "Not reviewed"} />
            <AdminMetric label="Runtime" value={executionHref ? "Connected" : "Not connected"} />
            <AdminMetric label="Workflow ID" value={workflow.slug} mono />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-rule/70 p-4">
            <a href="/admin" className="inline-flex items-center gap-2 rounded-md border border-rule bg-background px-3 py-2 text-xs font-medium hover:border-cobalt/40">
              <ShieldCheck className="h-3.5 w-3.5" /> Open Studio
            </a>
            <a href={workflow.publicHref} className="inline-flex items-center gap-2 rounded-md border border-rule bg-background px-3 py-2 text-xs font-medium hover:border-cobalt/40">
              <ExternalLink className="h-3.5 w-3.5" /> Preview public SEO page
            </a>
            {executionHref && (
              <a href={executionHref} className="inline-flex items-center gap-2 rounded-md border border-rule bg-background px-3 py-2 text-xs font-medium hover:border-cobalt/40">
                <ExternalLink className="h-3.5 w-3.5" /> Open runtime
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function AdminMetric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-card p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`mt-2 break-words text-sm font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  )
}
