import type { ComponentType } from "react";
import type { ChecklistItemState, StepMatterState } from "@mailmypdf/step-workflow";
import type { StepComponentProps } from "./types";
import { transunionDisputeStepComponents } from "./transunion-dispute";
import {
  getTransUnionDisputeReadiness,
  transunionDisputeMailingPackage,
} from "@/domain/step-workflows/transunion-dispute";
import { experianDisputeStepComponents } from "./experian-dispute";
import {
  getExperianDisputeReadiness,
  experianDisputeMailingPackage,
} from "@/domain/step-workflows/experian-dispute";
import { equifaxDisputeStepComponents } from "./equifax-dispute";
import {
  getEquifaxDisputeReadiness,
  equifaxDisputeMailingPackage,
} from "@/domain/step-workflows/equifax-dispute";
import { taxNoticeStepComponents } from "./tax-notice";
import {
  getTaxNoticeReadiness,
  taxNoticeMailingPackage,
} from "@/domain/step-workflows/tax-notice";
import { cp2000StepComponents } from "./cp2000";
import {
  getCP2000Readiness,
  cp2000MailingPackage,
} from "@/domain/step-workflows/cp2000";

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
 * "transunion-dispute" is the first Notice Respond workflow converted onto
 * this engine. See
 * apps/verticals/appeal-mail/src/components/workflow-steps/registry.ts and
 * apps/verticals/immigration-mail/src/components/workflow-steps/registry.ts
 * for the pattern this follows.
 */
export const workflowStepUiRegistry: Record<string, WorkflowStepUiConfig> = {
  "transunion-dispute": {
    stepComponents: transunionDisputeStepComponents,
    getReadiness: getTransUnionDisputeReadiness,
    mailingPackage: transunionDisputeMailingPackage,
  },
  "experian-dispute": {
    stepComponents: experianDisputeStepComponents,
    getReadiness: getExperianDisputeReadiness,
    mailingPackage: experianDisputeMailingPackage,
  },
  "equifax-dispute": {
    stepComponents: equifaxDisputeStepComponents,
    getReadiness: getEquifaxDisputeReadiness,
    mailingPackage: equifaxDisputeMailingPackage,
  },
  "tax-notice": {
    stepComponents: taxNoticeStepComponents,
    getReadiness: getTaxNoticeReadiness,
    mailingPackage: taxNoticeMailingPackage,
  },
  "cp2000": {
    stepComponents: cp2000StepComponents,
    getReadiness: getCP2000Readiness,
    mailingPackage: cp2000MailingPackage,
  },
};
