import type { WorkflowState, DraftValidationResult } from "./workflow-runtime";

/**
 * Consequential workflow transitions must fail closed.
 * This adapter is intentionally separate from workflow-runtime.ts so it can
 * be integrated without coupling the generic state machine to one validator.
 */
export function canEnterReview(state: Pick<WorkflowState, "draft" | "draftValidation">): boolean {
  return state.draft.trim().length > 0 && state.draftValidation?.passed === true;
}

export function canEnterMailing(
  state: Pick<WorkflowState, "draft" | "draftValidation" | "reviewChecks" | "approved" | "mailing">,
): boolean {
  return (
    canEnterReview(state) &&
    state.approved === true &&
    state.reviewChecks.length > 0 &&
    state.reviewChecks.every(Boolean) &&
    Boolean(state.mailing)
  );
}

export function strictValidationSummary(validation: DraftValidationResult | null): {
  ready: boolean;
  reason: string;
} {
  if (!validation) return { ready: false, reason: "Draft validation has not run." };
  if (!validation.passed) return { ready: false, reason: `Draft validation failed with ${validation.errors} error(s).` };
  return { ready: true, reason: "Draft validation passed." };
}
