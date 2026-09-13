import type { ComponentType } from "react";
import type { ChecklistItemState, StepMatterState } from "@mailmypdf/step-workflow";
import type { StepComponentProps } from "./types";
import { noidResponseStepComponents } from "./noid-response";
import { getNoidResponseReadiness, noidResponseMailingPackage } from "@/domain/step-workflows/noid-response";

export type WorkflowStepUiConfig = {
  stepComponents: Record<string, ComponentType<StepComponentProps>>;
  getReadiness: (matter: StepMatterState) => ChecklistItemState[];
  mailingPackage: { label: string }[];
};

/**
 * The one place a new step-based workflow registers its UI. The route
 * (`routes/matters/$matterId/$step.tsx`) and StepShell wiring are entirely
 * generic — a new workflow only adds an entry here plus its own
 * `components/workflow-steps/<id>/*` step components.
 */
export const workflowStepUiRegistry: Record<string, WorkflowStepUiConfig> = {
  "noid-response": {
    stepComponents: noidResponseStepComponents,
    getReadiness: getNoidResponseReadiness,
    mailingPackage: noidResponseMailingPackage,
  },
};
