import type { ComponentType } from "react";
import type { ChecklistItemState, StepMatterState } from "@mailmypdf/step-workflow";
import type { StepComponentProps } from "./types";
import { administrativeDecisionAppealStepComponents } from "./administrative-decision-appeal";
import {
  getAdministrativeDecisionAppealReadiness,
  administrativeDecisionAppealMailingPackage,
} from "@/domain/step-workflows/administrative-decision-appeal";
import { carInsuranceAppealStepComponents } from "./car-insurance-appeal";
import {
  getCarInsuranceAppealReadiness,
  carInsuranceAppealMailingPackage,
} from "@/domain/step-workflows/car-insurance-appeal";

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
 *
 * "administrative-decision-appeal" is the first of ~37 Appeal Mail workflows
 * converted onto this engine. See
 * apps/verticals/immigration-mail/src/components/workflow-steps/registry.ts
 * for the pattern this follows.
 */
export const workflowStepUiRegistry: Record<string, WorkflowStepUiConfig> = {
  "administrative-decision-appeal": {
    stepComponents: administrativeDecisionAppealStepComponents,
    getReadiness: getAdministrativeDecisionAppealReadiness,
    mailingPackage: administrativeDecisionAppealMailingPackage,
  },
  "car-insurance-appeal": {
    stepComponents: carInsuranceAppealStepComponents,
    getReadiness: getCarInsuranceAppealReadiness,
    mailingPackage: carInsuranceAppealMailingPackage,
  },
};
