import { SECTION_REGISTRY } from "./section-registry"
import { workflowsForSection } from "./workflow-registry"

export type WorkflowNavigationItem = {
  slug: string
  label: string
  publicHref: string
  workspaceHref: string
}

export type WorkflowNavigationSection = {
  id: string
  label: string
  publicHref: string
  workspaceHref: string
  workflows: readonly WorkflowNavigationItem[]
}

/** Compatibility projection; identity and maturity live in the shared registry. */
export const WORKFLOW_REGISTRY_SECTIONS: readonly WorkflowNavigationSection[] = SECTION_REGISTRY.map((section) => ({
  id: section.id,
  label: section.name,
  publicHref: `/${section.id}/workflows`,
  workspaceHref: `/dashboard/workflows/${section.id}`,
  workflows: workflowsForSection(section.id).map(({ slug, label, publicHref, workspaceHref }) => ({ slug, label, publicHref, workspaceHref })),
}))

export const WORKFLOW_NAV_SECTIONS = WORKFLOW_REGISTRY_SECTIONS

export const WORKFLOW_NAV_COUNT = WORKFLOW_NAV_SECTIONS.reduce(
  (total, section) => total + section.workflows.length,
  0,
)

export function workflowNavigationSection(id: string | undefined) {
  return WORKFLOW_NAV_SECTIONS.find((section) => section.id === id) ?? null
}

export function workflowNavigationItem(sectionId: string | undefined, workflowId: string | undefined) {
  const section = workflowNavigationSection(sectionId)
  if (!section) return null
  const workflow = section.workflows.find((item) => item.slug === workflowId) ?? null
  return workflow ? { section, workflow } : null
}

export function findWorkflowNavigationItem(pathname: string) {
  for (const section of WORKFLOW_NAV_SECTIONS) {
    const workflow = section.workflows.find(
      (item) => pathname === item.workspaceHref || pathname.startsWith(item.workspaceHref + "/"),
    )
    if (workflow) return { section, workflow }
  }
  return null
}


/**
 * Backwards-compatible public product grouping derived from the canonical
 * navigation sections. Keep consumers on one source of truth while older
 * product-family pages migrate to WORKFLOW_NAV_SECTIONS.
 */
export const WORKFLOW_NAV_GROUPS = WORKFLOW_NAV_SECTIONS.map((section) => ({
  product: section.label,
  route: section.publicHref,
  workflows: section.workflows.map((workflow) => ({
    slug: workflow.slug,
    label: workflow.label,
    href: workflow.publicHref,
    pipeline: "Guided workflow",
  })),
}))
