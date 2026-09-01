/**
 * Case lifecycle state machine — the canonical workflow execution states.
 *
 * Every workflow (records request, appeal, notice response, dispute) moves
 * through this lifecycle. The platform owns the state machine; verticals
 * own the domain intelligence that populates each stage.
 *
 * Terminal states: completed, failed, cancelled.
 * The state machine enforces that no case skips approval before fulfillment.
 */

export type CaseState =
  | "draft"
  | "validated"
  | "review"
  | "approved"
  | "queued"
  | "submitted"
  | "tracking"
  | "completed"
  | "failed"
  | "cancelled";

export const CASE_TRANSITIONS: Readonly<Record<CaseState, readonly CaseState[]>> = {
  draft:     ["validated", "cancelled"],
  validated: ["review", "cancelled"],
  review:    ["approved", "draft", "cancelled"],
  approved:  ["queued", "cancelled"],
  queued:    ["submitted", "failed", "cancelled"],
  submitted: ["tracking", "failed"],
  tracking:  ["completed", "failed"],
  completed: [],
  failed:    [],
  cancelled: [],
} as const;

export function canTransition(from: CaseState, to: CaseState): boolean {
  return CASE_TRANSITIONS[from].includes(to);
}

export function isTerminal(state: CaseState): boolean {
  return CASE_TRANSITIONS[state].length === 0;
}

export function isPreApproval(state: CaseState): boolean {
  return state === "draft" || state === "validated" || state === "review";
}

export function isPostApproval(state: CaseState): boolean {
  return (
    state === "queued" ||
    state === "submitted" ||
    state === "tracking" ||
    state === "completed"
  );
}

export function requiresApprovalGate(from: CaseState, to: CaseState): boolean {
  if (isPostApproval(to) && from !== "approved" && from !== "queued") return true;
  if (to === "queued" && from !== "approved") return true;
  return false;
}
