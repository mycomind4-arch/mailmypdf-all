import type { DefinedWorkflow } from "./define-workflow.js";
import type { CapabilityRuntime } from "./capability-runtime.js";
import {
  runManifestWorkflow,
  type ManifestWorkflowCheckpoint,
  type ManifestWorkflowRun,
  type RunManifestWorkflowInput,
} from "./manifest-runner.js";

export interface StoredManifestWorkflowCheckpoint
  extends ManifestWorkflowCheckpoint {
  revision: number;
}

export interface ManifestWorkflowCheckpointStore {
  load(input: {
    matterId: string;
    workflowId: string;
  }): Promise<StoredManifestWorkflowCheckpoint | null>;

  commit(input: {
    matterId: string;
    workflowId: string;
    expectedRevision: number | null;
    checkpoint: ManifestWorkflowCheckpoint;
  }): Promise<StoredManifestWorkflowCheckpoint>;
}

export interface RunDurableManifestWorkflowInput
  extends Omit<
    RunManifestWorkflowInput,
    "workflow" | "runtime" | "resume" | "onCheckpoint"
  > {
  workflow: DefinedWorkflow;
  runtime: CapabilityRuntime;
  store: ManifestWorkflowCheckpointStore;
  onCheckpoint?: RunManifestWorkflowInput["onCheckpoint"];
}

function completedRun(
  checkpoint: StoredManifestWorkflowCheckpoint,
): ManifestWorkflowRun {
  return {
    workflowId: checkpoint.workflowId,
    version: checkpoint.version,
    status: "completed",
    completedStepIds: checkpoint.completedStepIds,
    executions: checkpoint.executions,
    skippedStepIds: checkpoint.skippedStepIds,
    stoppedAt: checkpoint.stoppedAt,
    message: checkpoint.message,
  };
}

/**
 * Durable wrapper around the manifest runner.
 *
 * The store owns persistence and optimistic concurrency. The runner owns
 * sequencing. Provider idempotency remains mandatory for external effects.
 */
export async function runDurableManifestWorkflow(
  input: RunDurableManifestWorkflowInput,
): Promise<ManifestWorkflowRun> {
  const existing = await input.store.load({
    matterId: input.matterId,
    workflowId: input.workflow.manifest.id,
  });

  if (existing && existing.version !== input.workflow.plan.version) {
    throw new Error(
      `Workflow checkpoint version ${existing.version} cannot resume workflow version ${input.workflow.plan.version}; migrate the matter first.`,
    );
  }

  if (existing?.status === "completed") {
    return completedRun(existing);
  }

  let revision: number | null = existing?.revision ?? null;

  return runManifestWorkflow({
    workflow: input.workflow,
    runtime: input.runtime,
    matterId: input.matterId,
    actorId: input.actorId,
    scopes: input.scopes,
    approvals: input.approvals,
    rootInput: input.rootInput,
    resolveInput: input.resolveInput,
    continueOnWarning: input.continueOnWarning,
    resume: existing?.executions,
    onCheckpoint: async (checkpoint) => {
      const stored = await input.store.commit({
        matterId: input.matterId,
        workflowId: input.workflow.manifest.id,
        expectedRevision: revision,
        checkpoint,
      });
      revision = stored.revision;
      await input.onCheckpoint?.(checkpoint);
    },
  });
}
