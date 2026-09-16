import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import {
  ArrowRight,
  CheckCircle2,
  CircleSlash2,
  FileText,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react"
import { useMemo, useState } from "react"
import { isCurrentUserAdmin } from "@/lib/admin.functions"
import {
  WORKFLOW_NAV_COUNT,
  WORKFLOW_NAV_SECTIONS,
  workflowNavigationSection,
  type WorkflowNavigationItem,
  type WorkflowNavigationSection,
} from "@/lib/workflow-navigation"
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry"

type AvailabilityFilter = "all" | "ready" | "not-connected"

function operationalData(section: WorkflowNavigationSection, workflow: WorkflowNavigationItem) {
  const authority = workflowAuthorityForPath(workflow.publicHref)
  return {
    section,
    workflow,
    authority,
    ready: Boolean(authority?.executionHref),
  }
}

export function AuthenticatedWorkflowBrowser({ sectionId }: { sectionId?: string }) {
  const [query, setQuery] = useState("")
  const [availability, setAvailability] = useState<AvailabilityFilter>("all")
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
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sourceSections.flatMap((group) =>
      group.workflows
        .map((workflow) => operationalData(group, workflow))
        .filter(({ section: itemSection, workflow, ready }) => {
          const matchesText =
            !needle ||
            workflow.label.toLowerCase().includes(needle) ||
            workflow.slug.toLowerCase().includes(needle) ||
            itemSection.label.toLowerCase().includes(needle)
          const matchesAvailability =
            availability === "all" ||
            (availability === "ready" && ready) ||
            (availability === "not-connected" && !ready)
          return matchesText && matchesAvailability
        }),
    )
  }, [availability, query, sourceSections])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-rule/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {section ? "Workflow family" : "MailMyPDF workspace"}
          </div>
          <h1 className="mt-2 font-serif text-4xl leading-none">
            {section ? section.label : "Workflows"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {section ? `${section.workflows.length} workflows` : `${WORKFLOW_NAV_COUNT} workflows across ${WORKFLOW_NAV_SECTIONS.length} products`}
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md border border-rule bg-card px-4 text-sm font-medium hover:border-cobalt/40"
        >
          My Matters
        </Link>
      </header>

      {!section && (
        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="rounded-md border border-rule/70 bg-card">
        <div className="flex flex-col gap-3 border-b border-rule/70 p-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={section ? `Search ${section.label} workflows` : "Search all workflows"}
              className="h-10 w-full rounded-md border border-rule bg-background pl-9 pr-3 text-sm outline-none focus:border-cobalt/50"
            />
          </label>
          <label className="relative sm:w-52">
            <Settings2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
              className="h-10 w-full appearance-none rounded-md border border-rule bg-background pl-9 pr-3 text-sm outline-none focus:border-cobalt/50"
            >
              <option value="all">All statuses</option>
              <option value="ready">Executable</option>
              <option value="not-connected">Runtime not connected</option>
            </select>
          </label>
        </div>

        <div className="divide-y divide-rule/60">
          {rows.map(({ section: itemSection, workflow, authority, ready }) => (
            <a
              key={workflow.workspaceHref}
              href={workflow.workspaceHref}
              className="group grid gap-3 px-4 py-4 transition hover:bg-paper-deep/35 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-cobalt/70" />
                  <h2 className="truncate text-sm font-semibold text-foreground">{workflow.label}</h2>
                  {!section && (
                    <span className="rounded-full border border-rule px-2 py-0.5 text-[10px] text-muted-foreground">
                      {itemSection.label}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
                    ready ? "bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground"
                  }`}>
                    {ready ? <CheckCircle2 className="h-3 w-3" /> : <CircleSlash2 className="h-3 w-3" />}
                    {ready ? "Ready to start" : "Runtime not connected"}
                  </span>
                  {isAdmin && (
                    <>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-800">
                        {authority?.publicationState ?? "DRAFT"}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                        authority?.indexable ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                      }`}>
                        {authority?.indexable ? "SEO indexable" : "SEO noindex"}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                {isAdmin && authority?.authorityScore != null && (
                  <span className="text-xs tabular-nums text-muted-foreground">Authority {authority.authorityScore}</span>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-cobalt" />
              </div>
            </a>
          ))}
          {rows.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium">No workflows match those filters.</p>
              <p className="mt-1 text-xs text-muted-foreground">Clear the search or change the status filter.</p>
            </div>
          )}
        </div>
      </section>

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
