import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { transunionDisputeStepWorkflow } from "./transunion-dispute";
import { experianDisputeStepWorkflow } from "./experian-dispute";
import { equifaxDisputeStepWorkflow } from "./equifax-dispute";
import { taxNoticeStepWorkflow } from "./tax-notice";
import { cp2000StepWorkflow } from "./cp2000";

/**
 * Registry of every step-based workflow in this app. Add a new workflow here
 * (and its own `domain/step-workflows/<id>.ts` definition file) to get the
 * full engine — server fns, Supabase persistence, and the shared
 * MatterStepPage route — for free; only its step components under
 * `components/workflow-steps/<id>/` are workflow-specific.
 *
 * Each Notice Respond workflow is converted individually and in full — its
 * own definition, its own step components, its own reviewed business logic.
 * Do not add a shared/generic factory here even if several workflows look
 * similar on the surface. See
 * apps/verticals/appeal-mail/src/domain/step-workflows/index.ts and
 * apps/verticals/immigration-mail/src/domain/step-workflows/index.ts for the
 * per-workflow pattern this follows.
 */
export const stepWorkflows: Record<string, StepWorkflowDefinition> = {
  [transunionDisputeStepWorkflow.id]: transunionDisputeStepWorkflow,
  [experianDisputeStepWorkflow.id]: experianDisputeStepWorkflow,
  [equifaxDisputeStepWorkflow.id]: equifaxDisputeStepWorkflow,
  [taxNoticeStepWorkflow.id]: taxNoticeStepWorkflow,
  [cp2000StepWorkflow.id]: cp2000StepWorkflow,
};

export function findStepWorkflow(workflowId: string): StepWorkflowDefinition | undefined {
  return stepWorkflows[workflowId];
}
