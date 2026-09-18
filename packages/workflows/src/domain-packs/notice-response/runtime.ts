export const NOTICE_RESPONSE_STEPS = [
  { id: "notice", label: "Notice" },
  { id: "analysis", label: "Analysis" },
  { id: "response", label: "Response facts" },
  { id: "evidence", label: "Supporting documents" },
  { id: "draft", label: "Response draft" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

export type NoticeResponseStepId =
  (typeof NOTICE_RESPONSE_STEPS)[number]["id"];

export function completedNoticeResponseSteps(input: {
  hasCleanNotice: boolean;
  hasAnalysis: boolean;
  hasResponseFacts: boolean;
  hasEvidenceReview: boolean;
  hasDraft: boolean;
  hasApproval: boolean;
}): NoticeResponseStepId[] {
  const completed: NoticeResponseStepId[] = [];
  if (input.hasCleanNotice) completed.push("notice");
  if (input.hasAnalysis) completed.push("analysis");
  if (input.hasResponseFacts) completed.push("response");
  if (input.hasEvidenceReview) completed.push("evidence");
  if (input.hasDraft) completed.push("draft");
  if (input.hasApproval) completed.push("review");
  return completed;
}
