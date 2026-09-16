import type { CapabilityId } from "./capability-registry.js";
import {
  CapabilityRuntime,
  type CapabilityExecutionResult,
} from "./capability-runtime.js";
import type { DefinedWorkflow } from "./define-workflow.js";
import { evaluateWorkflowStepCondition } from "./workflow-conditions.js";

export type ManifestWorkflowRunStatus = "completed" | "blocked" | "failed";

export interface ManifestCapabilityExecution {
  stepId: string;
  capability: CapabilityId;
  result: CapabilityExecutionResult;
  reused: boolean;
}

export interface ManifestWorkflowCheckpoint {
  workflowId: string;
  version: number;
  matterId: string;
  status: "running" | ManifestWorkflowRunStatus;
  completedStepIds: readonly string[];
  executions: readonly ManifestCapabilityExecution[];
  skippedStepIds?: readonly string[];
  currentStepId?: string;
  stoppedAt?: {
    stepId: string;
    capability: CapabilityId;
  };
  message?: string;
}

export interface ManifestWorkflowRun {
  workflowId: string;
  version: number;
  status: ManifestWorkflowRunStatus;
  completedStepIds: readonly string[];
  executions: readonly ManifestCapabilityExecution[];
  skippedStepIds?: readonly string[];
  stoppedAt?: {
    stepId: string;
    capability: CapabilityId;
  };
  message?: string;
}

export interface ManifestWorkflowInputContext {
  workflow: DefinedWorkflow;
  stepId: string;
  capability: CapabilityId;
  prior: ReadonlyMap<CapabilityId, CapabilityExecutionResult>;
  rootInput: unknown;
}

export interface RunManifestWorkflowInput {
  workflow: DefinedWorkflow;
  runtime: CapabilityRuntime;
  matterId: string;
  actorId: string;
  scopes: readonly string[];
  approvals: readonly string[];
  rootInput: unknown;
  /**
   * Resolve capability-specific input from the workflow's root matter input and
   * already-completed capability results.
   */
  resolveInput?: (
    context: ManifestWorkflowInputContext,
  ) => unknown | Promise<unknown>;
  /**
   * Successful executions from a previous interrupted run. Passed capabilities
   * are reused only when both the step id and capability id match.
   */
  resume?: readonly ManifestCapabilityExecution[];
  /**
   * High-quality workflows fail closed on warnings by default. A specialized
   * host may opt into continuing only when it has its own warning-resolution
   * policy.
   */
  continueOnWarning?: boolean;
  /**
   * Called after durable progress is made and before the runner advances.
   * Hosts can persist this snapshot with optimistic concurrency.
   */
  onCheckpoint?: (
    checkpoint: ManifestWorkflowCheckpoint,
  ) => void | Promise<void>;
}

function executionKey(stepId: string, capability: CapabilityId): string {
  return `${stepId}:${capability}`;
}

function passedResumeExecutions(
  workflow: DefinedWorkflow,
  resume: readonly ManifestCapabilityExecution[] | undefined,
): Map<string, ManifestCapabilityExecution> {
  const validStepCapabilities = new Set(
    workflow.plan.steps.flatMap(({ step, capabilities }) =>
      capabilities.map((capability) => executionKey(step.id, capability)),
    ),
  );
  const reusable = new Map<string, ManifestCapabilityExecution>();

  for (const execution of resume ?? []) {
    const key = executionKey(execution.stepId, execution.capability);
    if (!validStepCapabilities.has(key)) {
      throw new Error(
        `Resume state contains capability outside workflow plan: ${key}`,
      );
    }
    if (
      execution.result.capability === execution.capability &&
      execution.result.status === "passed"
    ) {
      reusable.set(key, { ...execution, reused: true });
    }
  }

  return reusable;
}

function requiredStepCapabilities(workflow: DefinedWorkflow): Set<CapabilityId> {
  return new Set(
    workflow.plan.steps.flatMap(({ capabilities }) => [...capabilities]),
  );
}

function assertExecutableHandlers(
  workflow: DefinedWorkflow,
  runtime: CapabilityRuntime,
): void {
  const required = new Set(workflow.manifest.requiredCapabilities);
  const missingRequired: CapabilityId[] = [];

  for (const capability of requiredStepCapabilities(workflow)) {
    if (runtime.has(capability)) continue;
    if (required.has(capability)) missingRequired.push(capability);
  }

  if (missingRequired.length) {
    throw new Error(
      `Workflow runtime is missing required handler(s): ${missingRequired.join(", ")}`,
    );
  }
}

/**
 * Executes a compiled WorkflowManifest step-by-step through the shared
 * CapabilityRuntime.
 *
 * Static correctness belongs to defineWorkflow(); provider implementations live
 * in CapabilityRuntime; this runner only owns sequencing, prior-result flow,
 * resume semantics, and fail-closed stop behavior.
 */
export async function runManifestWorkflow(
  input: RunManifestWorkflowInput,
): Promise<ManifestWorkflowRun> {
  const { workflow, runtime } = input;
  if (!input.matterId.trim()) throw new Error("matterId is required");
  if (!input.actorId.trim()) throw new Error("actorId is required");
  if (workflow.plan.steps.length === 0) {
    throw new Error(`Workflow ${workflow.manifest.id} has no executable steps`);
  }

  assertExecutableHandlers(workflow, runtime);

  const reusable = passedResumeExecutions(workflow, input.resume);
  const executions: ManifestCapabilityExecution[] = [];
  const completedStepIds: string[] = [];
  const skippedStepIds: string[] = [];
  const prior = new Map<CapabilityId, CapabilityExecutionResult>();

  // Reusable results are inserted into prior only when execution reaches their
  // original step. Earlier capabilities must never observe future-step state.
  const optional = new Set(workflow.manifest.optionalCapabilities);

  const emitCheckpoint = async (
    status: ManifestWorkflowCheckpoint["status"],
    currentStepId?: string,
    stoppedAt?: ManifestWorkflowRun["stoppedAt"],
    message?: string,
  ) => {
    if (!input.onCheckpoint) return;
    await input.onCheckpoint({
      workflowId: workflow.manifest.id,
      version: workflow.plan.version,
      matterId: input.matterId,
      status,
      completedStepIds: [...completedStepIds],
      executions: [...executions],
      skippedStepIds: [...skippedStepIds],
      currentStepId,
      stoppedAt,
      message,
    });
  };

  for (const { step, capabilities } of workflow.plan.steps) {
    if (
      !evaluateWorkflowStepCondition(step.when, {
        rootInput: input.rootInput,
        prior,
      })
    ) {
      skippedStepIds.push(step.id);
      await emitCheckpoint("running", step.id);
      continue;
    }

    for (const capability of capabilities) {
      const key = executionKey(step.id, capability);
      const existing = reusable.get(key);
      if (existing) {
        executions.push(existing);
        prior.set(capability, existing.result);
        continue;
      }

      if (!runtime.has(capability)) {
        if (optional.has(capability)) continue;
        const stoppedAt = { stepId: step.id, capability };
        const message = `Required capability handler is unavailable: ${capability}`;
        await emitCheckpoint("failed", step.id, stoppedAt, message);
        return {
          workflowId: workflow.manifest.id,
          version: workflow.plan.version,
          status: "failed",
          completedStepIds,
          executions,
          skippedStepIds,
          stoppedAt,
          message,
        };
      }

      const capabilityInput = input.resolveInput
        ? await input.resolveInput({
            workflow,
            stepId: step.id,
            capability,
            prior,
            rootInput: input.rootInput,
          })
        : input.rootInput;

      let result: CapabilityExecutionResult;
      try {
        result = await runtime.executeCapability(
          workflow.manifest,
          capability,
          {
            matterId: input.matterId,
            actorId: input.actorId,
            scopes: input.scopes,
            approvals: input.approvals,
            input: capabilityInput,
            prior,
          },
        );
      } catch (error) {
        const stoppedAt = { stepId: step.id, capability };
        const message = error instanceof Error ? error.message : String(error);
        await emitCheckpoint("failed", step.id, stoppedAt, message);
        return {
          workflowId: workflow.manifest.id,
          version: workflow.plan.version,
          status: "failed",
          completedStepIds,
          executions,
          skippedStepIds,
          stoppedAt,
          message,
        };
      }

      executions.push({
        stepId: step.id,
        capability,
        result,
        reused: false,
      });
      prior.set(capability, result);
      await emitCheckpoint("running", step.id);

      if (result.status === "failed") {
        const stoppedAt = { stepId: step.id, capability };
        const message = result.messages.join(" ") || `${capability} failed`;
        await emitCheckpoint("failed", step.id, stoppedAt, message);
        return {
          workflowId: workflow.manifest.id,
          version: workflow.plan.version,
          status: "failed",
          completedStepIds,
          executions,
          skippedStepIds,
          stoppedAt,
          message,
        };
      }

      if (
        result.status === "blocked" ||
        (result.status === "warning" && !input.continueOnWarning)
      ) {
        const stoppedAt = { stepId: step.id, capability };
        const message =
          result.messages.join(" ") ||
          `${capability} requires resolution before continuing`;
        await emitCheckpoint("blocked", step.id, stoppedAt, message);
        return {
          workflowId: workflow.manifest.id,
          version: workflow.plan.version,
          status: "blocked",
          completedStepIds,
          executions,
          skippedStepIds,
          stoppedAt,
          message,
        };
      }
    }

    completedStepIds.push(step.id);
    await emitCheckpoint("running", step.id);
  }

  await emitCheckpoint("completed");

  return {
    workflowId: workflow.manifest.id,
    version: workflow.plan.version,
    status: "completed",
    completedStepIds,
    executions,
    skippedStepIds,
  };
}
