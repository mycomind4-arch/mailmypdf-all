import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { noidResponseStepWorkflow } from "./noid-response";

/**
 * Registry of every step-based workflow in this app. Add a new workflow here
 * (and its own `domain/step-workflows/<id>.ts` definition file) to get the
 * full engine — server fns, Supabase persistence, and the shared
 * MatterStepPage route — for free; only its step components under
 * `components/workflow-steps/<id>/` are workflow-specific.
 */
export const stepWorkflows: Record<string, StepWorkflowDefinition> = {
  [noidResponseStepWorkflow.id]: noidResponseStepWorkflow,
};

export function findStepWorkflow(workflowId: string): StepWorkflowDefinition | undefined {
  return stepWorkflows[workflowId];
}
