import type { CapabilityId } from "./capability-registry.js";
import {
  CapabilityRuntime,
  type CapabilityExecutionContext,
  type CapabilityExecutionResult,
  type CapabilityHandler,
} from "./capability-runtime.js";
import { runtimeCapabilitiesForManifest } from "./workflow-quality-certification.js";
import type { WorkflowManifest } from "./workflow-manifest.js";

export type PlatformCapabilityExecutor = (
  context: CapabilityExecutionContext,
) => Promise<CapabilityExecutionResult>;

export type PlatformCapabilityExecutors = Partial<
  Record<CapabilityId, PlatformCapabilityExecutor>
>;

export interface WorkflowRuntimeBindingAudit {
  workflowId: string;
  required: readonly CapabilityId[];
  bound: readonly CapabilityId[];
  missing: readonly CapabilityId[];
  ready: boolean;
}

export interface PlatformCapabilityBundle {
  runtime: CapabilityRuntime;
  capabilities: readonly CapabilityId[];
  audit(manifest: WorkflowManifest): WorkflowRuntimeBindingAudit;
  assertReady(manifest: WorkflowManifest): void;
}

export function createPlatformCapabilityBundle(
  executors: PlatformCapabilityExecutors,
): PlatformCapabilityBundle {
  const runtime = new CapabilityRuntime();
  const capabilities: CapabilityId[] = [];

  for (const [id, execute] of Object.entries(executors) as [
    CapabilityId,
    PlatformCapabilityExecutor | undefined,
  ][]) {
    if (!execute) continue;

    const handler: CapabilityHandler = {
      id,
      async execute(context) {
        const result = await execute(context);
        if (result.capability !== id) {
          throw new Error(
            `Capability handler ${id} returned result for ${result.capability}`,
          );
        }
        return result;
      },
    };

    runtime.register(handler);
    capabilities.push(id);
  }

  const bound = Object.freeze([...capabilities]);

  const audit = (manifest: WorkflowManifest): WorkflowRuntimeBindingAudit => {
    const required = runtimeCapabilitiesForManifest(manifest);
    const boundSet = new Set(bound);
    const missing = required.filter((id) => !boundSet.has(id));
    return {
      workflowId: manifest.id,
      required,
      bound,
      missing,
      ready: missing.length === 0,
    };
  };

  return {
    runtime,
    capabilities: bound,
    audit,
    assertReady(manifest) {
      const result = audit(manifest);
      if (result.missing.length) {
        throw new Error(
          `Workflow ${manifest.id} is missing platform capability handler(s): ${result.missing.join(", ")}`,
        );
      }
      runtime.assertWorkflowReady(manifest);
    },
  };
}
