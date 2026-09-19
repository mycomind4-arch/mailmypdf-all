import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
  WorkflowRuntimePolicy,
} from "@mailmypdf/workflows";
import {
  SSI_REQUIRED_FORMS,
  SSI_VERTICAL_ID,
  SSI_WORKFLOW_ID,
  isSsiReconsiderationStage,
  isSupportedSsiDecisionBasis,
  requiredSsiFormsForBasis,
  type SsiDecisionBasis,
} from "./start/workflow";

function text(value: unknown, label: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${label} is required`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} is required`);
  if (normalized.length > max) throw new Error(`${label} is too long`);
  return normalized;
}

function analysisBasis(analysis: WorkflowMatterAnalysis): SsiDecisionBasis {
  const value = analysis.result.workflowDetails?.decisionBasis;
  return value === "medical" || value === "nonmedical" ? value : "unknown";
}

function assertReconsiderationAnalysis(analysis: WorkflowMatterAnalysis): SsiDecisionBasis {
  const stage = analysis.result.workflowDetails?.appealStage;
  if (!isSsiReconsiderationStage(stage)) {
    throw new Error(
      stage === "unknown" || stage === undefined
        ? "The SSI appeal level is not confirmed from the source notice."
        : `This workflow is for reconsideration, not ${String(stage).replaceAll("_", " ")}.`,
    );
  }
  const basis = analysisBasis(analysis);
  if (!isSupportedSsiDecisionBasis(basis)) {
    throw new Error("The source notice does not confirm whether the reconsideration is medical or non-medical.");
  }
  return basis;
}

function assertRequiredForms(
  documents: readonly WorkflowMatterDocument[],
  basis: SsiDecisionBasis,
): void {
  const required = requiredSsiFormsForBasis(basis);
  if (!required.length) throw new Error("The required SSA form set cannot be chosen until the denial basis is confirmed.");

  for (const form of required) {
    const found = documents.find(
      (document) =>
        document.role === "evidence" &&
        document.evidenceKind === form.kind &&
        document.included &&
        document.usable &&
        document.securityStatus === "clean",
    );
    if (!found) throw new Error(`${form.label} must be completed, uploaded, included, and clear security scanning.`);
  }
}

export const ssiDenialRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== SSI_WORKFLOW_ID || input.verticalId !== SSI_VERTICAL_ID) {
      throw new Error("SSI denial runtime identity does not match this workflow.");
    }
  },

  validateAnalysis(analysis) {
    assertReconsiderationAnalysis(analysis);
  },

  validateInput(input, analysis) {
    if (!analysis) throw new Error("Analyze the SSI denial before saving claimant facts.");
    const basis = assertReconsiderationAnalysis(analysis);
    if (input.responseMode !== "reconsideration" || input.confirmedReconsideration !== true) {
      throw new Error("The claimant must explicitly confirm reconsideration before continuing.");
    }

    const normalized = {
      claimantName: text(input.claimantName, "Claimant name", 200, true),
      claimantAddress: text(input.claimantAddress, "Claimant address", 1000, true),
      phone: text(input.phone, "Phone", 60, true),
      representativeName: text(input.representativeName, "Representative name", 200),
      responseMode: "reconsideration",
      confirmedReconsideration: true,
      reasonsForDisagreement: text(input.reasonsForDisagreement, "Reasons for disagreement", 8000, true),
      conditionChanges: text(input.conditionChanges, "Condition changes", 8000),
      newConditions: text(input.newConditions, "New conditions", 8000),
      treatmentChanges: text(input.treatmentChanges, "Treatment changes", 8000),
      medicationChanges: text(input.medicationChanges, "Medication changes", 8000),
      dailyFunctionChanges: text(input.dailyFunctionChanges, "Daily-function changes", 8000),
      incomeFacts: text(input.incomeFacts, "Income facts", 8000),
      resourceFacts: text(input.resourceFacts, "Resource facts", 8000),
      livingArrangementFacts: text(input.livingArrangementFacts, "Living-arrangement facts", 8000),
      eligibilityFacts: text(input.eligibilityFacts, "Eligibility facts", 8000),
      additionalFacts: text(input.additionalFacts, "Additional facts", 12000),
      requestedOutcome: text(input.requestedOutcome, "Requested outcome", 2000),
    };

    if (basis === "nonmedical" && !(
      normalized.incomeFacts ||
      normalized.resourceFacts ||
      normalized.livingArrangementFacts ||
      normalized.eligibilityFacts ||
      normalized.additionalFacts
    )) {
      throw new Error("Add the SSI non-medical facts that explain why you disagree with the denial.");
    }

    return normalized;
  },

  validateDocumentsBeforeDraft(documents, analysis) {
    assertReconsiderationAnalysis(analysis);
    const blockedIncluded = documents.filter(
      (document) => document.role === "evidence" && document.included && (!document.usable || document.securityStatus !== "clean"),
    );
    if (blockedIncluded.length) throw new Error("Every included SSI evidence document must clear security scanning before drafting.");
  },

  validateDocumentsBeforePacket(documents, analysis) {
    const basis = assertReconsiderationAnalysis(analysis);
    assertRequiredForms(documents, basis);
  },
};

export const ssiOfficialFormKinds = SSI_REQUIRED_FORMS.map((form) => form.kind);
export default ssiDenialRuntimePolicy;
