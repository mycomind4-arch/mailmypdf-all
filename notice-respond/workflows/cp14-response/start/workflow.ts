export const CP14_WORKFLOW_ID = "cp14-response";
export const CP14_VERTICAL_ID = "notice-respond";

export const CP14_STEPS = [
  { id: "notice", label: "CP14 notice" },
  { id: "analysis", label: "Analysis" },
  { id: "response", label: "Response facts" },
  { id: "evidence", label: "Supporting documents" },
  { id: "draft", label: "Response draft" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

export type Cp14StepId = (typeof CP14_STEPS)[number]["id"];

export const CP14_RESPONSE_MODES = [
  ["agree", "I agree with the balance due"],
  ["disagree", "I disagree with the balance due"],
  ["already_paid", "I already paid some or all of this amount"],
  ["other", "I need to send another documented response"],
] as const;

export type Cp14ResponseMode = (typeof CP14_RESPONSE_MODES)[number][0];

export const CP14_EVIDENCE_KINDS = [
  ["payment_record", "Payment record or confirmation"],
  ["tax_return", "Tax return or amended return"],
  ["account_transcript", "IRS account transcript or account record"],
  ["prior_correspondence", "Prior IRS correspondence"],
  ["bank_record", "Bank or canceled-check record"],
  ["other", "Other supporting document"],
] as const;

export type Cp14EvidenceKind = (typeof CP14_EVIDENCE_KINDS)[number][0];

export function cp14CompletedSteps(input: {
  hasCleanNotice: boolean;
  hasAnalysis: boolean;
  hasResponseFacts: boolean;
  hasDraft: boolean;
  hasApproval: boolean;
}): Cp14StepId[] {
  const completed: Cp14StepId[] = [];
  if (input.hasCleanNotice) completed.push("notice");
  if (input.hasAnalysis) completed.push("analysis");
  if (input.hasResponseFacts) {
    completed.push("response");
    completed.push("evidence");
  }
  if (input.hasDraft) completed.push("draft");
  if (input.hasApproval) completed.push("review");
  return completed;
}
