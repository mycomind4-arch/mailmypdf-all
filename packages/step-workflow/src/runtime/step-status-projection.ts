/**
 * Small pure helpers factoring out repeated not-started/in-progress/complete
 * and approval-gate logic used when projecting a live
 * `WorkflowMatterSnapshot` (and friends) onto a `StepMatterState`.
 */

import type { StepStatus } from "../step-workflow.js";

/**
 * Derive a step's status from whether it has any meaningful data/presence
 * yet, and whether it has been explicitly marked complete.
 *
 * - No presence at all -> "not_started"
 * - Presence, not yet complete -> "in_progress"
 * - Explicitly complete -> "complete"
 */
export function stepStatusFromPresence(input: {
  hasPresence: boolean;
  isComplete: boolean;
  needsReview?: boolean;
}): StepStatus {
  if (input.needsReview) return "needs_review";
  if (input.isComplete) return "complete";
  if (input.hasPresence) return "in_progress";
  return "not_started";
}

/**
 * Combine a step's own status with the matter's approval gate: a step that
 * requires approval before it can be completed cannot report "complete"
 * unless the matter itself is approved, regardless of what the underlying
 * data suggests.
 */
export function mergeApprovalGate(input: {
  status: StepStatus;
  stepId: string;
  requiresApprovalBeforeStep?: string;
  approved: boolean;
}): StepStatus {
  const { status, stepId, requiresApprovalBeforeStep, approved } = input;
  if (requiresApprovalBeforeStep !== stepId) return status;
  if (status === "complete" && !approved) return "in_progress";
  return status;
}
