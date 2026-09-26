import { SECTION_IDS, type SectionId } from "./section-registry"
import { WORKFLOW_REGISTRY_SECTIONS } from "./workflow-navigation"

export type WorkflowId = `${SectionId}/${string}`

export type WorkflowDefinition = {
  id: WorkflowId
  sectionId: SectionId
  slug: string
  label: string
  publicHref: `/${string}`
  workspaceHref: `/${string}`
}

const knownSectionIds = new Set<string>(SECTION_IDS)
const definitions: WorkflowDefinition[] = []
const ids = new Set<string>()
const publicPaths = new Set<string>()
const workspacePaths = new Set<string>()

for (const section of WORKFLOW_REGISTRY_SECTIONS) {
  if (!knownSectionIds.has(section.id)) {
    throw new Error(`Workflow topology references unknown section '${section.id}'.`)
  }

  const sectionId = section.id as SectionId
  const expectedSectionPublicHref = `/${sectionId}/workflows`
  const expectedSectionWorkspaceHref = `/dashboard/workflows/${sectionId}`

  if (section.publicHref !== expectedSectionPublicHref) {
    throw new Error(`Workflow section '${sectionId}' has non-canonical publicHref '${section.publicHref}'.`)
  }
  if (section.workspaceHref !== expectedSectionWorkspaceHref) {
    throw new Error(`Workflow section '${sectionId}' has non-canonical workspaceHref '${section.workspaceHref}'.`)
  }

  for (const workflow of section.workflows) {
    const id = `${sectionId}/${workflow.slug}` as WorkflowId
    const publicHref = `/${sectionId}/workflows/${workflow.slug}` as const
    const workspaceHref = `/dashboard/workflows/${sectionId}/${workflow.slug}` as const

    if (workflow.publicHref !== publicHref) {
      throw new Error(`Workflow '${id}' has non-canonical publicHref '${workflow.publicHref}'.`)
    }
    if (workflow.workspaceHref !== workspaceHref) {
      throw new Error(`Workflow '${id}' has non-canonical workspaceHref '${workflow.workspaceHref}'.`)
    }
    if (ids.has(id)) throw new Error(`Duplicate canonical workflow id '${id}'.`)
    if (publicPaths.has(publicHref)) throw new Error(`Duplicate public workflow path '${publicHref}'.`)
    if (workspacePaths.has(workspaceHref)) throw new Error(`Duplicate workspace workflow path '${workspaceHref}'.`)

    ids.add(id)
    publicPaths.add(publicHref)
    workspacePaths.add(workspaceHref)
    definitions.push({
      id,
      sectionId,
      slug: workflow.slug,
      label: workflow.label,
      publicHref,
      workspaceHref,
    })
  }
}

export const WORKFLOW_REGISTRY: readonly WorkflowDefinition[] = Object.freeze(definitions)
export const WORKFLOW_REGISTRY_COUNT = WORKFLOW_REGISTRY.length

const BY_ID = new Map(WORKFLOW_REGISTRY.map((workflow) => [workflow.id, workflow] as const))
const BY_PUBLIC_PATH = new Map(WORKFLOW_REGISTRY.map((workflow) => [workflow.publicHref, workflow] as const))
const BY_WORKSPACE_PATH = new Map(WORKFLOW_REGISTRY.map((workflow) => [workflow.workspaceHref, workflow] as const))
const BY_SECTION = new Map<SectionId, WorkflowDefinition[]>()

for (const workflow of WORKFLOW_REGISTRY) {
  const section = BY_SECTION.get(workflow.sectionId)
  if (section) section.push(workflow)
  else BY_SECTION.set(workflow.sectionId, [workflow])
}

function normalizePath(path: string): string {
  const value = path.trim()
  if (!value) return "/"
  const withSlash = value.startsWith("/") ? value : `/${value}`
  return withSlash.replace(/\/+$/, "") || "/"
}

export function workflowById(id: string | undefined): WorkflowDefinition | null {
  return id ? BY_ID.get(id as WorkflowId) ?? null : null
}

export function workflowByPublicPath(path: string): WorkflowDefinition | null {
  return BY_PUBLIC_PATH.get(normalizePath(path) as WorkflowDefinition["publicHref"]) ?? null
}

export function workflowByWorkspacePath(path: string): WorkflowDefinition | null {
  const normalized = normalizePath(path)
  const exact = BY_WORKSPACE_PATH.get(normalized as WorkflowDefinition["workspaceHref"])
  if (exact) return exact

  for (const workflow of WORKFLOW_REGISTRY) {
    if (normalized.startsWith(workflow.workspaceHref + "/")) return workflow
  }
  return null
}

export function workflowsForSection(sectionId: SectionId | string | undefined): readonly WorkflowDefinition[] {
  if (!sectionId || !knownSectionIds.has(sectionId)) return []
  return BY_SECTION.get(sectionId as SectionId) ?? []
}

export function canonicalWorkflowId(sectionId: SectionId, slug: string): WorkflowId {
  return `${sectionId}/${slug}` as WorkflowId
}
