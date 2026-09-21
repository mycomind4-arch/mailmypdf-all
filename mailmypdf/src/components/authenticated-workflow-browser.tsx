import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { WorkflowBrowser } from "../../../packages/workflow-ui/src/WorkflowBrowser"
import { isCurrentUserAdmin } from "@/lib/admin.functions"
import {
  WORKFLOW_NAV_COUNT,
  WORKFLOW_NAV_SECTIONS,
  workflowNavigationSection,
} from "@/lib/workflow-navigation"
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry"
import { workflowExecutionRecord } from "@mailmypdf/workflows"

export function AuthenticatedWorkflowBrowser({ sectionId }: { sectionId?: string }) {
  const section = workflowNavigationSection(sectionId)
  const checkAdmin = useServerFn(isCurrentUserAdmin)
  const { data: adminAccess } = useQuery({
    queryKey: ["workflow-browser-admin-access"],
    queryFn: () => checkAdmin(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const isAdmin = adminAccess?.isAdmin === true

  const sourceSections = section ? [section] : WORKFLOW_NAV_SECTIONS
  const items = sourceSections.flatMap((group) =>
    group.workflows.map((workflow) => {
      const authority = workflowAuthorityForPath(workflow.publicHref)
      // Readiness comes from the new-architecture execution registry, never
      // from SEO/authority state -- authority remains admin-only display metadata.
      const ready = workflowExecutionRecord(group.id, workflow.slug)?.executionStatus === "executable"
      const adminMeta = isAdmin
        ? [
            authority?.publicationState ?? "DRAFT",
            authority?.indexable ? "SEO indexable" : "SEO noindex",
            authority?.authorityScore == null ? null : `Authority ${authority.authorityScore}`,
          ].filter(Boolean).join(" · ")
        : undefined

      return {
        id: `${group.id}:${workflow.slug}`,
        title: workflow.label,
        sectionId: group.id,
        sectionLabel: group.label,
        href: workflow.workspaceHref,
        ready,
        meta: adminMeta,
      }
    }),
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md border border-rule bg-card px-4 text-sm font-medium hover:border-cobalt/40"
        >
          My Cases
        </Link>
      </div>

      {!section && (
        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workflow families">
          {WORKFLOW_NAV_SECTIONS.map((group) => (
            <a
              key={group.id}
              href={group.workspaceHref}
              className="group flex items-center justify-between rounded-md border border-rule/70 bg-card px-4 py-3 transition hover:border-cobalt/40 hover:bg-paper-deep/40"
            >
              <span>
                <span className="block text-sm font-semibold">{group.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{group.workflows.length} workflows</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-cobalt" />
            </a>
          ))}
        </section>
      )}

      <WorkflowBrowser
        items={items}
        eyebrow={section ? "Workflow family" : "MailMyPDF workspace"}
        title={section ? section.label : "Workflows"}
        description={
          section
            ? `${section.workflows.length} workflows in this family`
            : `${WORKFLOW_NAV_COUNT} workflows across ${WORKFLOW_NAV_SECTIONS.length} products`
        }
        readyLabel="Ready to start"
        unavailableLabel="Runtime not connected"
      />

      {isAdmin && (
        <div className="flex items-start gap-3 rounded-md border border-rule/70 bg-paper-deep/30 p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />
          <div>
            <div className="text-sm font-semibold">Admin operational view</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Publication, indexing, authority, and runtime status are shown here for maintenance. Customer accounts see only workflow availability.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
