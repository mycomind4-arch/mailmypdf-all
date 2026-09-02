import type { ApprovalAction } from "./approval-gate.js";

export type WorkflowBuildStatus =
  | "AWAITING_APPROVAL"
  | "READY_TO_BUILD"
  | "BUILDING"
  | "PAUSED_FOR_BUDGET";

export interface PrimarySource {
  readonly title: string;
  readonly url: string;
  readonly publisher: string;
}

export interface WorkflowBuildSpec {
  readonly schemaVersion: 1;
  readonly target: {
    readonly verticalId: string;
    readonly repository: string;
    readonly route: string;
  };
  readonly workflow: {
    readonly id: string;
    readonly title: string;
    readonly primaryInput: "document" | "case" | "event" | "request" | "claim";
  };
  readonly sources: readonly PrimarySource[];
  readonly acceptanceTests: readonly string[];
  readonly budget: {
    readonly maxCostUsd: number;
    readonly maxAgentTokens: number;
  };
}

export interface WorkflowBuildApproval {
  readonly action: ApprovalAction;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly specHash: string;
}

export interface WorkflowBuildRun {
  readonly id: string;
  readonly spec: WorkflowBuildSpec;
  readonly specHash: string;
  readonly status: WorkflowBuildStatus;
  readonly approval: WorkflowBuildApproval | null;
  readonly knownCostUsd: number;
  readonly agentTokensUsed: number;
}

export interface DispatchDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

function requireValue(value: string, label: string, errors: string[]): void {
  if (!value.trim()) errors.push(`${label} is required`);
}

export function validateWorkflowBuildSpec(spec: WorkflowBuildSpec): string[] {
  const errors: string[] = [];
  requireValue(spec.target.verticalId, "target.verticalId", errors);
  requireValue(spec.target.repository, "target.repository", errors);
  requireValue(spec.workflow.id, "workflow.id", errors);
  requireValue(spec.workflow.title, "workflow.title", errors);
  if (!spec.target.route.startsWith("/")) errors.push("target.route must start with /");
  if (spec.sources.length === 0) errors.push("at least one primary source is required");
  for (const source of spec.sources) {
    requireValue(source.title, "source.title", errors);
    requireValue(source.publisher, "source.publisher", errors);
    if (!source.url.startsWith("https://")) errors.push("source.url must use https");
  }
  if (spec.acceptanceTests.length === 0) errors.push("at least one acceptance test is required");
  if (!Number.isFinite(spec.budget.maxCostUsd) || spec.budget.maxCostUsd <= 0)
    errors.push("budget.maxCostUsd must be positive");
  if (!Number.isInteger(spec.budget.maxAgentTokens) || spec.budget.maxAgentTokens <= 0)
    errors.push("budget.maxAgentTokens must be a positive integer");
  return errors;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function hashWorkflowBuildSpec(spec: WorkflowBuildSpec): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalize(spec)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createWorkflowBuildRun(
  id: string,
  spec: WorkflowBuildSpec,
): Promise<WorkflowBuildRun> {
  const errors = validateWorkflowBuildSpec(spec);
  if (errors.length > 0) throw new Error(`Invalid workflow build spec: ${errors.join("; ")}`);
  return {
    id,
    spec,
    specHash: await hashWorkflowBuildSpec(spec),
    status: "AWAITING_APPROVAL",
    approval: null,
    knownCostUsd: 0,
    agentTokensUsed: 0,
  };
}

export function approveWorkflowBuild(
  run: WorkflowBuildRun,
  approval: WorkflowBuildApproval,
): WorkflowBuildRun {
  if (approval.action !== "BUILD") throw new Error("Workflow builds require BUILD approval");
  if (!approval.approvedBy.trim()) throw new Error("Approval must record an approver");
  if (approval.specHash !== run.specHash) throw new Error("Approval does not match the current spec");
  return { ...run, status: "READY_TO_BUILD", approval };
}

export function canDispatchWorkflowBuild(run: WorkflowBuildRun): DispatchDecision {
  if (run.status !== "READY_TO_BUILD") return { allowed: false, reason: "Workflow build is not approved" };
  if (run.approval?.specHash !== run.specHash)
    return { allowed: false, reason: "Approval does not match the current spec" };
  if (run.knownCostUsd >= run.spec.budget.maxCostUsd)
    return { allowed: false, reason: "Cost ceiling reached" };
  if (run.agentTokensUsed >= run.spec.budget.maxAgentTokens)
    return { allowed: false, reason: "Agent token ceiling reached" };
  return { allowed: true, reason: "Approved workflow build may dispatch" };
}

export function beginWorkflowBuild(run: WorkflowBuildRun): WorkflowBuildRun {
  const decision = canDispatchWorkflowBuild(run);
  if (!decision.allowed) throw new Error(decision.reason);
  return { ...run, status: "BUILDING" };
}

export function recordWorkflowBuildUsage(
  run: WorkflowBuildRun,
  usage: { readonly costUsd: number | null; readonly agentTokens: number },
): WorkflowBuildRun {
  if (usage.costUsd === null) return { ...run, status: "PAUSED_FOR_BUDGET" };
  if (usage.costUsd < 0 || usage.agentTokens < 0) throw new Error("Usage cannot be negative");
  const next = {
    ...run,
    knownCostUsd: run.knownCostUsd + usage.costUsd,
    agentTokensUsed: run.agentTokensUsed + usage.agentTokens,
  };
  if (next.knownCostUsd > next.spec.budget.maxCostUsd || next.agentTokensUsed > next.spec.budget.maxAgentTokens)
    return { ...next, status: "PAUSED_FOR_BUDGET" };
  return next;
}
