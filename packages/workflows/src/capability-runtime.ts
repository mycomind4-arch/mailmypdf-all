import {
  CAPABILITIES,
  assertCapabilityDependencies,
  isConsequentialCapability,
  type CapabilityId,
} from "./capability-registry.js";
import type { WorkflowManifest, WorkflowStepManifest } from "./workflow-manifest.js";

export type CapabilityExecutionStatus = "passed" | "warning" | "blocked" | "failed";

export interface CapabilityExecutionContext {
  workflowId: string;
  matterId: string;
  actorId: string;
  scopes: readonly string[];
  /** Explicit gate IDs approved during this run. */
  approvals: readonly string[];
  input: unknown;
  prior: ReadonlyMap<CapabilityId, CapabilityExecutionResult>;
}

export interface CapabilityExecutionResult<T = unknown> {
  capability: CapabilityId;
  status: CapabilityExecutionStatus;
  output?: T;
  messages: readonly string[];
}

export interface CapabilityHandler {
  id: CapabilityId;
  execute(context: CapabilityExecutionContext): Promise<CapabilityExecutionResult>;
}

export class CapabilityRuntime {
  private readonly handlers = new Map<CapabilityId, CapabilityHandler>();

  register(handler: CapabilityHandler): this {
    if (this.handlers.has(handler.id)) throw new Error(`Capability handler already registered: ${handler.id}`);
    this.handlers.set(handler.id, handler);
    return this;
  }

  has(id: CapabilityId): boolean {
    return this.handlers.has(id);
  }

  get(id: CapabilityId): CapabilityHandler {
    const handler = this.handlers.get(id);
    if (!handler) throw new Error(`Capability handler not registered: ${id}`);
    return handler;
  }

  assertWorkflowReady(manifest: WorkflowManifest): void {
    const declared = [
      ...manifest.requiredCapabilities,
      ...manifest.optionalCapabilities,
    ];
    const dependencyErrors = assertCapabilityDependencies(declared);

    // V2 manifests execute only capabilities explicitly attached to steps.
    // Operational/build-time capabilities such as observability, resilience,
    // retention jobs, and acceptance testing can still be required by
    // certification without pretending they are per-step handlers.
    const requiredSet = new Set(manifest.requiredCapabilities);
    const stepCapabilities = (manifest.steps ?? []).flatMap((step) => step.uses);
    const runtimeRequired =
      stepCapabilities.length > 0
        ? [...new Set(stepCapabilities)].filter((id) => requiredSet.has(id))
        : [...manifest.requiredCapabilities];

    const missingHandlers = runtimeRequired.filter((id) => !this.handlers.has(id));
    const errors = [
      ...missingHandlers.map(
        (id) => `missing handler for ${id} (${CAPABILITIES[id].implementation})`,
      ),
      ...dependencyErrors,
    ];
    if (errors.length) throw new Error(errors.join("\n"));
  }

  async executeCapability(
    manifest: WorkflowManifest,
    id: CapabilityId,
    input: Omit<CapabilityExecutionContext, "workflowId">,
  ): Promise<CapabilityExecutionResult> {
    if (!manifest.requiredCapabilities.includes(id) && !manifest.optionalCapabilities.includes(id)) {
      throw new Error(`Workflow ${manifest.id} did not declare capability ${id}`);
    }

    if (isConsequentialCapability(id)) {
      const requiredGateIds = (manifest.gates ?? [])
        .filter((gate) => gate.required && gate.beforeCapability === id)
        .map((gate) => gate.id);
      const approved = new Set(input.approvals);
      const missing = requiredGateIds.filter((gateId) => !approved.has(gateId));
      if (missing.length) {
        return {
          capability: id,
          status: "blocked",
          messages: [`Missing required approval gate(s): ${missing.join(", ")}`],
        };
      }
      if (manifest.requiresHumanReview && !hasHumanReviewApproval(manifest, approved)) {
        return {
          capability: id,
          status: "blocked",
          messages: ["Human review is required before consequential capability execution."],
        };
      }
    }

    const result = await this.get(id).execute({ ...input, workflowId: manifest.id });
    if (result.capability !== id) throw new Error(`Capability handler mismatch: expected ${id}, received ${result.capability}`);
    return result;
  }
}

function hasHumanReviewApproval(manifest: WorkflowManifest, approvals: ReadonlySet<string>): boolean {
  const reviewGates = (manifest.gates ?? []).filter(
    (gate) => gate.required && (gate.kind === "human_review" || gate.kind === "approval"),
  );
  // Legacy manifests have no explicit gate list; the pipeline's review stage
  // remains authoritative until they are upgraded to the v2 manifest.
  if (reviewGates.length === 0) return manifest.gates === undefined;
  return reviewGates.every((gate) => approvals.has(gate.id));
}

export type WorkflowExecutionPlanStep = {
  step: WorkflowStepManifest;
  capabilities: readonly CapabilityId[];
};

export type WorkflowExecutionPlan = {
  workflowId: string;
  version: number;
  steps: readonly WorkflowExecutionPlanStep[];
  requiredCapabilities: readonly CapabilityId[];
};

export function compileWorkflowExecutionPlan(manifest: WorkflowManifest): WorkflowExecutionPlan {
  const dependencyErrors = assertCapabilityDependencies([
    ...manifest.requiredCapabilities,
    ...manifest.optionalCapabilities,
  ]);
  if (dependencyErrors.length) throw new Error(dependencyErrors.join("\n"));

  const steps = (manifest.steps ?? []).map((step) => ({
    step,
    capabilities: [...step.uses],
  }));

  return {
    workflowId: manifest.id,
    version: manifest.version ?? 1,
    steps,
    requiredCapabilities: [...manifest.requiredCapabilities],
  };
}
