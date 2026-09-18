export type NoticeResponseMode = Readonly<{
  value: string;
  label: string;
}>;

export type NoticeEvidenceKind = Readonly<{
  value: string;
  label: string;
}>;

export interface NoticeResponseWorkflowProfile {
  workflowId: "cp14-response" | "cp2000-response";
  title: string;
  noticeLabel: string;
  primaryDocumentId: string;
  primaryDocumentLabel: string;
  extractionSchema: string;
  sourcePurpose: string;
  responseModeLabel: string;
  responseModes: readonly NoticeResponseMode[];
  evidenceKinds: readonly NoticeEvidenceKind[];
  explanationLabel: string;
  explanationHint: string;
  requestedActionDefault: string;
  analysisInstructions: string;
  draftInstructions: string;
}

const COMMON_TAX_EVIDENCE = [
  { value: "payment_record", label: "Payment record or confirmation" },
  { value: "tax_return", label: "Tax return or amended return" },
  { value: "information_return", label: "W-2, 1099, or other information return" },
  { value: "account_transcript", label: "IRS transcript or account record" },
  { value: "prior_correspondence", label: "Prior IRS correspondence" },
  { value: "bank_record", label: "Bank or canceled-check record" },
  { value: "other", label: "Other supporting document" },
] as const satisfies readonly NoticeEvidenceKind[];

export const cp14NoticeResponseProfile: NoticeResponseWorkflowProfile = Object.freeze({
  workflowId: "cp14-response",
  title: "Respond to an IRS CP14 Notice",
  noticeLabel: "CP14",
  primaryDocumentId: "cp14-notice",
  primaryDocumentLabel: "IRS CP14 notice",
  extractionSchema: "irs.cp14.v1",
  sourcePurpose: "irs_cp14_notice",
  responseModeLabel: "How are you addressing the CP14?",
  responseModes: [
    { value: "agree", label: "I agree with the balance due" },
    { value: "disagree", label: "I disagree with the balance due" },
    { value: "already_paid", label: "I already paid some or all of this amount" },
    { value: "other", label: "I need to send another documented response" },
  ],
  evidenceKinds: COMMON_TAX_EVIDENCE,
  explanationLabel: "Explain what the IRS should know",
  explanationHint:
    "State only facts supported by the notice, your confirmed information, or records you actually provide.",
  requestedActionDefault:
    "Please review the account and the enclosed information and update the balance or account record as appropriate.",
  analysisInstructions:
    "Confirm that the document identifies itself as CP14 or a CP14-series balance-due notice. Extract only notice-supported facts, including the tax period, notice date, printed due/action date if shown, balance due, reference identifiers, help information, and any mailing destination. Never calculate a deadline, invent an IRS address, or decide that the balance is legally or mathematically correct.",
  draftInstructions:
    "Prepare factual CP14 correspondence using only verified notice facts, user-confirmed facts, the selected response mode, and records actually included. Preserve the distinction between agreement, disagreement, already-paid facts, and other documented correspondence. Never invent tax figures, payments, deadlines, addresses, authorities, or outcomes, and do not imply that mailing is required unless the controlling notice or current instructions support it.",
});

export const cp2000NoticeResponseProfile: NoticeResponseWorkflowProfile = Object.freeze({
  workflowId: "cp2000-response",
  title: "Respond to an IRS CP2000 Notice",
  noticeLabel: "CP2000",
  primaryDocumentId: "cp2000-notice",
  primaryDocumentLabel: "IRS CP2000 notice",
  extractionSchema: "irs.cp2000.v1",
  sourcePurpose: "irs_cp2000_notice",
  responseModeLabel: "How do you want to respond?",
  responseModes: [
    { value: "agree", label: "Agree with the proposed changes" },
    { value: "disagree", label: "Disagree with the proposed changes" },
    { value: "partial-agreement", label: "Partially agree" },
  ],
  evidenceKinds: COMMON_TAX_EVIDENCE,
  explanationLabel: "Explain your response to the proposed changes",
  explanationHint:
    "For disagreement or partial agreement, identify the proposed items you dispute and state only facts supported by your records.",
  requestedActionDefault:
    "Please review my response and the enclosed records and update the proposed changes as appropriate.",
  analysisInstructions:
    "Confirm that the document identifies itself as CP2000 or a CP2000-series proposed-underreporter notice. Extract only notice-supported facts, including tax year, notice date, printed response date, proposed changes, proposed tax/penalty/interest amounts if shown, payer or information-return references, notice identifiers, and the printed response address. Treat proposed amounts as proposed, never as an assessed bill, and never calculate a deadline.",
  draftInstructions:
    "Prepare factual CP2000 correspondence using only verified notice facts, user-confirmed facts, the selected agree/disagree/partial-agreement mode, and records actually included. For disagreement or partial agreement, identify only proposed items the user actually disputes. Never invent tax-return figures, payer records, payments, legal authorities, deadlines, addresses, or outcomes.",
});

export const NOTICE_RESPONSE_WORKFLOW_PROFILES = Object.freeze([
  cp14NoticeResponseProfile,
  cp2000NoticeResponseProfile,
] as const);

export type NoticeResponseWorkflowId =
  (typeof NOTICE_RESPONSE_WORKFLOW_PROFILES)[number]["workflowId"];

export function getNoticeResponseWorkflowProfile(
  workflowId: string,
): NoticeResponseWorkflowProfile | null {
  return (
    NOTICE_RESPONSE_WORKFLOW_PROFILES.find(
      (profile) => profile.workflowId === workflowId,
    ) ?? null
  );
}
