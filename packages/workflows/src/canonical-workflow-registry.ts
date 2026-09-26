import seeds from "./canonical-workflows.json" with { type: "json" };

export type WorkflowId = `${string}/${string}`;
export type CanonicalWorkflowMaturity = "catalog" | "source-verified" | "domain-ready" | "executable";
export type RuntimePolicyFamily = "insurance-appeal" | "ssa-reconsideration" | "immigration-cover-letter" | "records-request" | "notice-response";
export type WorkflowExecutionBinding = Readonly<{
  entry: "workspace-start" | "public-start";
  /** Separate, explicit verification for an authority-page execution CTA. */
  verified?: boolean;
  definition?: "step-workflow";
} & ({ kind: "platform"; policyFamily: RuntimePolicyFamily } | { kind: "local" })>;

export type WorkflowSeed = Readonly<{
  id: string;
  label: string;
  execution?: WorkflowExecutionBinding;
  authority?: Readonly<{ module: string; reviewedAt: string }>;
  legacyGoldId?: string;
}>;

export type WorkflowDefinition = Readonly<{
  id: WorkflowId;
  sectionId: string;
  slug: string;
  label: string;
  publicHref: `/${string}`;
  workspaceHref: `/${string}`;
  topLevelPath: string;
  maturity: CanonicalWorkflowMaturity;
  execution: WorkflowExecutionBinding | null;
  executionHref: `/${string}` | null;
  authority: WorkflowSeed["authority"] | null;
  legacyGoldId: string | null;
}>;

const policyFamilies = new Set<RuntimePolicyFamily>([
  "insurance-appeal", "ssa-reconsideration", "immigration-cover-letter", "records-request", "notice-response",
]);

/** Validate authored metadata, then derive every path and maturity label once. */
export function buildCanonicalWorkflowRegistry(input: readonly WorkflowSeed[]): readonly WorkflowDefinition[] {
  const ids = new Set<string>();
  const runtimeIds = new Set<string>();
  const authorityModules = new Set<string>();
  return Object.freeze(input.map((seed): WorkflowDefinition => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seed.id)) {
      throw new Error(`Invalid canonical workflow id '${seed.id}'.`);
    }
    if (ids.has(seed.id)) throw new Error(`Duplicate canonical workflow id '${seed.id}'.`);
    ids.add(seed.id);
    if (!seed.label?.trim()) throw new Error(`Workflow '${seed.id}' has no label.`);
    const [sectionId, slug] = seed.id.split("/");
    const publicHref = `/${sectionId}/workflows/${slug}` as const;
    const workspaceHref = `/dashboard/workflows/${sectionId}/${slug}` as const;
    const execution = seed.execution ? Object.freeze({ ...seed.execution }) : null;
    if (execution) {
      if (!["workspace-start", "public-start"].includes(execution.entry)) {
        throw new Error(`Invalid execution entry for '${seed.id}'.`);
      }
      if (execution.kind === "platform") {
        if (!policyFamilies.has(execution.policyFamily)) throw new Error(`Unknown policy family for '${seed.id}'.`);
        // Existing runtime APIs use unqualified slugs. Never pick the first of
        // two colliding runtime IDs or silently dispatch to another section.
        if (runtimeIds.has(slug)) throw new Error(`Ambiguous runtime workflow id '${slug}'.`);
        runtimeIds.add(slug);
      } else if (execution.kind !== "local") {
        throw new Error(`Invalid execution kind for '${seed.id}'.`);
      }
    }
    const authority = seed.authority ? Object.freeze({ ...seed.authority }) : null;
    if (authority) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(authority.module) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(authority.reviewedAt) ||
          !Number.isFinite(Date.parse(authority.reviewedAt)) ||
          new Date(authority.reviewedAt).toISOString().slice(0, 10) !== authority.reviewedAt) {
        throw new Error(`Invalid authority review for '${seed.id}'.`);
      }
      if (authorityModules.has(authority.module)) throw new Error(`Duplicate authority module '${authority.module}'.`);
      authorityModules.add(authority.module);
    }
    return Object.freeze({
      id: seed.id as WorkflowId, sectionId, slug, label: seed.label,
      publicHref, workspaceHref, topLevelPath: `${sectionId}/workflows/${slug}`,
      // A local analytical intake is domain-ready; it is not a mailing runtime.
      // Editorial "gold" copy never certifies runtime or fulfillment quality.
      maturity: execution?.kind === "platform" ? "executable" : execution?.kind === "local" ? "domain-ready" : authority ? "source-verified" : "catalog",
      execution,
      executionHref: execution ? `${execution.entry === "workspace-start" ? workspaceHref : publicHref}/start` : null,
      authority, legacyGoldId: seed.legacyGoldId ?? null,
    });
  }));
}

export const WORKFLOW_REGISTRY = buildCanonicalWorkflowRegistry(seeds as readonly WorkflowSeed[]);
export const WORKFLOW_REGISTRY_COUNT = WORKFLOW_REGISTRY.length;
const byId = new Map(WORKFLOW_REGISTRY.map((workflow) => [workflow.id, workflow]));
const byRuntimeId = new Map(WORKFLOW_REGISTRY.filter((workflow) => workflow.execution?.kind === "platform").map((workflow) => [workflow.slug, workflow]));
const byPublicPath = new Map(WORKFLOW_REGISTRY.map((workflow) => [workflow.publicHref, workflow]));
const sections = new Map<string, readonly WorkflowDefinition[]>();
for (const workflow of WORKFLOW_REGISTRY) {
  if (!sections.has(workflow.sectionId)) {
    sections.set(workflow.sectionId, Object.freeze(WORKFLOW_REGISTRY.filter((item) => item.sectionId === workflow.sectionId)));
  }
}
const emptySection: readonly WorkflowDefinition[] = Object.freeze([]);
const normalizePath = (path: string) => `/${path.trim().replace(/^\/+|\/+$/g, "")}`;

export function workflowById(id: string | undefined): WorkflowDefinition | null {
  return id ? byId.get(id as WorkflowId) ?? null : null;
}
export function workflowByRuntimeId(id: string): WorkflowDefinition | null {
  return byRuntimeId.get(id.trim()) ?? null;
}
export function workflowByPublicPath(path: string): WorkflowDefinition | null {
  return byPublicPath.get(normalizePath(path) as `/${string}`) ?? null;
}
export function workflowByWorkspacePath(path: string): WorkflowDefinition | null {
  const normalized = normalizePath(path);
  return WORKFLOW_REGISTRY.find((workflow) => normalized === workflow.workspaceHref || normalized.startsWith(workflow.workspaceHref + "/")) ?? null;
}
export function workflowsForSection(sectionId: string | undefined): readonly WorkflowDefinition[] {
  return sectionId ? sections.get(sectionId) ?? emptySection : emptySection;
}
export function canonicalWorkflowId(sectionId: string, slug: string): WorkflowId {
  return `${sectionId}/${slug}`;
}

/** Deterministic compatibility artifact. Test results require separate evidence. */
export function projectWorkflowInventory() {
  return {
    generatedFrom: "packages/workflows/src/canonical-workflows.json",
    total: WORKFLOW_REGISTRY_COUNT,
    workflows: WORKFLOW_REGISTRY.map((workflow) => ({
      id: workflow.id, vertical: workflow.sectionId, route: workflow.publicHref,
      maturity: workflow.maturity,
      hasGoldContent: workflow.legacyGoldId !== null,
      hasApiEndpoint: workflow.execution?.kind === "platform",
      sourceVerified: workflow.authority !== null,
      testStatus: "pending",
      lastReviewed: workflow.authority?.reviewedAt ?? null,
    })),
  };
}
