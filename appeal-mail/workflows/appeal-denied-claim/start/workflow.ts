export const DENIED_CLAIM_WORKFLOW_ID = "appeal-denied-claim";
export const DENIED_CLAIM_VERTICAL_ID = "appeal-mail";

export const DENIED_CLAIM_STEPS = [
  { id: "decision", label: "Denial letter" },
  { id: "analysis", label: "Analysis" },
  { id: "facts", label: "Your facts" },
  { id: "evidence", label: "Evidence" },
  { id: "draft", label: "Appeal draft" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

export type DeniedClaimStepId = (typeof DENIED_CLAIM_STEPS)[number]["id"];

export const DENIED_CLAIM_EVIDENCE_KINDS = [
  ["policy_or_plan", "Policy or plan document"],
  ["claim_submission", "Original claim submission"],
  ["supporting_record", "Supporting record"],
  ["receipt_or_invoice", "Receipt or invoice"],
  ["prior_correspondence", "Prior correspondence"],
  ["expert_statement", "Expert or professional statement"],
  ["other", "Other supporting document"],
] as const;

export type DeniedClaimEvidenceKind = (typeof DENIED_CLAIM_EVIDENCE_KINDS)[number][0];

export function deniedClaimCompletedSteps(input: {
  hasCleanDecision: boolean;
  hasAnalysis: boolean;
  hasFacts: boolean;
  hasDraft: boolean;
  hasApproval: boolean;
}): DeniedClaimStepId[] {
  const completed: DeniedClaimStepId[] = [];
  if (input.hasCleanDecision) completed.push("decision");
  if (input.hasAnalysis) completed.push("analysis");
  if (input.hasFacts) {
    completed.push("facts");
    completed.push("evidence");
  }
  if (input.hasDraft) completed.push("draft");
  if (input.hasApproval) completed.push("review");
  return completed;
}
