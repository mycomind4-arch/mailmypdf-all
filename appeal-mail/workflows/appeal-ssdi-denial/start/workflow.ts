import {
  SSA_RECONSIDERATION_EVIDENCE_KINDS,
  SSA_RECONSIDERATION_OFFICIAL_FORM_REGISTRY,
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

export const SSDI_WORKFLOW_ID = "appeal-ssdi-denial";
export const SSDI_VERTICAL_ID = SSA_RECONSIDERATION_VERTICAL_ID;
export const SSDI_STEPS = SSA_RECONSIDERATION_STEPS;
export type SsdiStepId = SsaReconsiderationStepId;

export const SSDI_OFFICIAL_FORM_REGISTRY =
  SSA_RECONSIDERATION_OFFICIAL_FORM_REGISTRY;
export type SsdiOfficialFormKind = SsaReconsiderationOfficialFormKind;
export const SSDI_REQUIRED_FORMS = SSA_RECONSIDERATION_REQUIRED_FORMS;

export const SSDI_EVIDENCE_KINDS =
  SSA_RECONSIDERATION_EVIDENCE_KINDS.SSDI;
export type SsdiEvidenceKind =
  (typeof SSDI_EVIDENCE_KINDS)[number][0];

export type SsdiDecisionBasis = SsaReconsiderationDecisionBasis;

export const isSsdiReconsiderationStage = isSsaReconsiderationStage;
export const isSupportedSsdiDecisionBasis = isSupportedSsaDecisionBasis;
export const requiredSsdiFormsForBasis = requiredSsaFormsForBasis;
export const hasRequiredSsdiForms = hasRequiredSsaForms;
export const ssdiCompletedSteps = ssaReconsiderationCompletedSteps;
