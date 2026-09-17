export const INSURANCE_APPEAL_STEPS = [
  { id: "decision", label: "Denial letter" },
  { id: "analysis", label: "Analysis" },
  { id: "facts", label: "Your facts" },
  { id: "evidence", label: "Evidence" },
  { id: "draft", label: "Appeal draft" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

export type InsuranceAppealStepId = (typeof INSURANCE_APPEAL_STEPS)[number]["id"];

export const INSURANCE_APPEAL_EVIDENCE_KINDS = [
  ["policy_or_plan", "Policy or plan document"],
  ["claim_submission", "Original claim submission"],
  ["supporting_record", "Supporting record"],
  ["receipt_or_invoice", "Receipt or invoice"],
  ["prior_correspondence", "Prior correspondence"],
  ["expert_statement", "Expert or professional statement"],
  ["other", "Other supporting document"],
] as const;

export type InsuranceAppealEvidenceKind = (typeof INSURANCE_APPEAL_EVIDENCE_KINDS)[number][0];

export interface InsuranceAppealProgressInput {
  hasCleanDecision: boolean;
  hasAnalysis: boolean;
  hasFacts: boolean;
  hasEvidenceReview?: boolean;
  hasDraft: boolean;
  hasApproval: boolean;
  hasMailingSubmission?: boolean;
  hasProof?: boolean;
}

/**
 * Shared UI/runtime progress derivation for insurance appeals.
 * Evidence completion is independent from facts when the caller supplies an
 * explicit evidence-review signal; legacy callers retain the previous behavior
 * by omitting it.
 */
export function completedInsuranceAppealSteps(
  input: InsuranceAppealProgressInput,
): InsuranceAppealStepId[] {
  const completed: InsuranceAppealStepId[] = [];
  if (input.hasCleanDecision) completed.push("decision");
  if (input.hasAnalysis) completed.push("analysis");
  if (input.hasFacts) completed.push("facts");
  if (input.hasEvidenceReview ?? input.hasFacts) completed.push("evidence");
  if (input.hasDraft) completed.push("draft");
  if (input.hasApproval) completed.push("review");
  if (input.hasMailingSubmission && input.hasProof) completed.push("mail");
  return completed;
}

export function insuranceAppealStepLabel(
  stepId: InsuranceAppealStepId,
  primaryDocumentLabel?: string,
): string {
  if (stepId === "decision" && primaryDocumentLabel?.trim()) return primaryDocumentLabel;
  return INSURANCE_APPEAL_STEPS.find((step) => step.id === stepId)?.label ?? stepId;
}
