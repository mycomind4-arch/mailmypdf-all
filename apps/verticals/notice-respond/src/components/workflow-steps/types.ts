import type { ChecklistItemState, StepMatterState } from "@mailmypdf/step-workflow";

/**
 * Props every per-workflow step component receives from MatterStepPage —
 * identical contract to Appeal Mail's / Immigration Mail's / Private
 * Office's, so any future workflow (in any app) plugs into the shared
 * route/rail/state machinery with only new step components, no route
 * changes.
 */
export type StepComponentProps = {
  matter: StepMatterState;
  onUpdateData: (patch: Record<string, unknown>) => Promise<void>;
  onSetChecklistItem: (item: ChecklistItemState) => Promise<void>;
  onComplete: () => Promise<void>;
  onApprove: () => Promise<void>;
  goToStep: (stepId: string) => void;
};
