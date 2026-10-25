import {
  SSA_RECONSIDERATION_EVIDENCE_KINDS,
  SSA_RECONSIDERATION_REQUIRED_FORMS,
  SSA_RECONSIDERATION_STEPS,
  SSA_RECONSIDERATION_VERTICAL_ID,
  hasRequiredSsaForms,
  isSsaReconsiderationStage,
  isSupportedSsaDecisionBasis,
  requiredSsaFormsForBasis,
  ssaReconsiderationCompletedSteps,
  type SsaReconsiderationDecisionBasis,
  type SsaReconsiderationOfficialFormKind,
  type SsaReconsiderationStepId,
} from "../../ssa-reconsideration/start/workflow";

export const SSI_WORKFLOW_ID = "appeal-ssi-denial";
export const SSI_VERTICAL_ID = SSA_RECONSIDERATION_VERTICAL_ID;
export const SSI_STEPS = SSA_RECONSIDERATION_STEPS;
export type SsiStepId = SsaReconsiderationStepId;

export const SSI_REQUIRED_FORMS = SSA_RECONSIDERATION_REQUIRED_FORMS;
export type SsiOfficialFormKind = SsaReconsiderationOfficialFormKind;

export const SSI_EVIDENCE_KINDS =
  SSA_RECONSIDERATION_EVIDENCE_KINDS.SSI;
export type SsiEvidenceKind =
  (typeof SSI_EVIDENCE_KINDS)[number][0];

export type SsiDecisionBasis = SsaReconsiderationDecisionBasis;

export const isSsiReconsiderationStage = isSsaReconsiderationStage;
export const isSupportedSsiDecisionBasis = isSupportedSsaDecisionBasis;
export const requiredSsiFormsForBasis = requiredSsaFormsForBasis;
export const hasRequiredSsiForms = hasRequiredSsaForms;
export const ssiCompletedSteps = ssaReconsiderationCompletedSteps;
