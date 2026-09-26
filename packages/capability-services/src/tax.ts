export type TaxNoticeFamily = "cp14" | "cp2000" | "cp504" | "penalty" | "audit" | "other";

export type TaxNoticeFacts = {
  noticeId?: string;
  noticeNumber?: string;
  taxYear?: number;
  taxPeriod?: string;
  noticeDate?: string;
  responseDeadline?: string;
  taxpayerReference?: string;
  statedBalance?: number;
  issue?: string;
  sourceDocumentId: string;
};

export type TaxNoticeClassification = {
  family: TaxNoticeFamily;
  confidence: number;
  supportedActions: readonly string[];
  requiresHumanReview: true;
  warnings: readonly string[];
};

const FAMILY_ACTIONS: Record<TaxNoticeFamily, readonly string[]> = {
  cp14: ["reconcile_balance", "request_payment_options", "respond_or_pay"],
  cp2000: ["reconcile_income", "agree_or_disagree", "submit_supporting_records"],
  cp504: ["reconcile_balance", "request_payment_options", "escalate_urgency"],
  penalty: ["reconcile_penalty", "request_abatement", "submit_reasonable_cause"],
  audit: ["organize_requested_records", "prepare_professional_review_packet"],
  other: ["identify_notice_instructions", "request_professional_review"],
};

export function classifyTaxNotice(input: { noticeNumber?: string; text?: string }): TaxNoticeClassification {
  const haystack = `${input.noticeNumber ?? ""} ${input.text ?? ""}`.toUpperCase();
  const family: TaxNoticeFamily = /CP\s*-?14\b/.test(haystack) ? "cp14" : /CP\s*-?2000\b/.test(haystack) ? "cp2000" : /CP\s*-?504\b/.test(haystack) ? "cp504" : /PENALTY|FAILURE TO FILE|FAILURE TO PAY/.test(haystack) ? "penalty" : /AUDIT|EXAMINATION|DOCUMENTATION REQUEST/.test(haystack) ? "audit" : "other";
  return { family, confidence: family === "other" ? 0.35 : 0.9, supportedActions: FAMILY_ACTIONS[family], requiresHumanReview: true, warnings: ["Classification identifies stated notice patterns only; it does not establish tax liability or eligibility."] };
}

export function validateTaxNoticeFacts(facts: TaxNoticeFacts): string[] {
  const errors: string[] = [];
  if (!facts.sourceDocumentId.trim()) errors.push("sourceDocumentId is required");
  if (facts.taxYear !== undefined && (!Number.isInteger(facts.taxYear) || facts.taxYear < 1900 || facts.taxYear > 2200)) errors.push("taxYear is outside the supported range");
  if (facts.statedBalance !== undefined && (!Number.isFinite(facts.statedBalance) || facts.statedBalance < 0)) errors.push("statedBalance must be non-negative");
  for (const [label, value] of [["noticeDate", facts.noticeDate], ["responseDeadline", facts.responseDeadline]] as const) if (value !== undefined && !Number.isFinite(Date.parse(value))) errors.push(`${label} is invalid`);
  return errors;
}
