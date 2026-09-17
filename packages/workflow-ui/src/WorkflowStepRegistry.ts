import type { ComponentType } from "react";
import type { ChecklistItemState, StepMatterState } from "@mailmypdf/step-workflow";

/**
 * Stable contract for workflow-specific step components.
 *
 * Workflow steps provide only their domain-specific UI. Matter persistence,
 * checklist updates, completion/approval, and navigation are supplied by the
 * shared matter-step runtime.
 */
export type StepComponentProps = {
  matter: StepMatterState;
  onUpdateData: (patch: Record<string, unknown>) => Promise<void>;
  onSetChecklistItem: (item: ChecklistItemState) => Promise<void>;
  onComplete: () => Promise<void>;
  onApprove: () => Promise<void>;
  goToStep: (stepId: string) => void;
};

export type WorkflowStepUiConfig = {
  stepComponents: Record<string, ComponentType<StepComponentProps>>;
  getReadiness: (matter: StepMatterState) => ChecklistItemState[];
  mailingPackage: { label: string }[];
};

export type WorkflowStepUiRegistry = Record<string, WorkflowStepUiConfig>;
