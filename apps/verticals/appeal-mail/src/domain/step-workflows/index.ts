import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { administrativeDecisionAppealStepWorkflow } from "./administrative-decision-appeal";
import { carInsuranceAppealStepWorkflow } from "./car-insurance-appeal";
import { insuranceClaimDenialStepWorkflow } from "./insurance-claim-denial";

/**
 * Registry of every step-based workflow in this app. Add a new workflow here
 * (and its own `domain/step-workflows/<id>.ts` definition file) to get the
 * full engine — server fns, Supabase persistence, and the shared
 * MatterStepPage route — for free; only its step components under
 * `components/workflow-steps/<id>/` are workflow-specific.
 *
 * Each Appeal Mail workflow is converted individually and in full — its own
 * definition, its own step components, its own reviewed business logic. Do
 * not add a shared/generic factory here even if several workflows look
 * similar on the surface: each one is being remade on purpose to verify (and
 * fix, where wrong) its own analysis, drafting, and pricing logic, not to be
 * re-platformed as-is. See
 * apps/verticals/immigration-mail/src/domain/step-workflows/index.ts for the
 * per-workflow pattern this follows.
 */
export const stepWorkflows: Record<string, StepWorkflowDefinition> = {
  [administrativeDecisionAppealStepWorkflow.id]: administrativeDecisionAppealStepWorkflow,
  [carInsuranceAppealStepWorkflow.id]: carInsuranceAppealStepWorkflow,
  [insuranceClaimDenialStepWorkflow.id]: insuranceClaimDenialStepWorkflow,
};

export function findStepWorkflow(workflowId: string): StepWorkflowDefinition | undefined {
  return stepWorkflows[workflowId];
}
