import type { ComponentType } from "react";
import type { ChecklistItemState, StepMatterState } from "@mailmypdf/step-workflow";
import type { StepComponentProps } from "./types";
import { contractorDisputeStepComponents } from "./contractor-dispute";
import { getContractorDisputeReadiness, contractorDisputeMailingPackage } from "@/domain/step-workflows/contractor-dispute";

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
  "contractor-dispute": {
    stepComponents: contractorDisputeStepComponents,
    getReadiness: getContractorDisputeReadiness,
    mailingPackage: contractorDisputeMailingPackage,
  },
};
