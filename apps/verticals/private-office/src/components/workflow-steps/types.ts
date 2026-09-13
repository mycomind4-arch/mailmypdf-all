import type { ChecklistItemState, StepMatterState } from "@mailmypdf/step-workflow";

/**
 * Props every per-workflow step component receives from MatterStepPage. This
 * is the contract any future workflow's step components implement — keeping
 * it stable is what lets new workflows plug into the shared route/rail/state
 * machinery with only new step components, no route changes.
 */
export type StepComponentProps = {
  matter: StepMatterState;
  /** Merge a patch into this step's `data`. */
  onUpdateData: (patch: Record<string, unknown>) => Promise<void>;
  /** Upsert one checklist item for this step. */
  onSetChecklistItem: (item: ChecklistItemState) => Promise<void>;
  /** Mark this step complete and advance to the next one. */
  onComplete: () => Promise<void>;
  /** Approve the matter (required before the "mail" step can complete). */
  onApprove: () => Promise<void>;
  /** Navigate to another step within the same matter. */
  goToStep: (stepId: string) => void;
};
