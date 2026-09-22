export type NoticeResponseMode = Readonly<{
  value: string;
  label: string;
}>;

export type NoticeEvidenceKind = Readonly<{
  value: string;
  label: string;
}>;

export interface NoticeResponseWorkflowProfile {
  workflowId:
    | "cp14-response"
    | "cp2000-response"
    | "cp504-response"
    | "irs-balance-due-notice-response"
    | "irs-penalty-notice-response";
  title: string;
  noticeLabel: string;
  primaryDocumentId: string;
  primaryDocumentLabel: string;
  extractionSchema: string;
  sourcePurpose: string;
  responseModeLabel: string;
  responseModes: readonly NoticeResponseMode[];
  evidenceKinds: readonly NoticeEvidenceKind[];
  explanationRequiredModes: readonly string[];
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
  explanationRequiredModes: ["disagree", "already_paid", "other"],
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
  explanationRequiredModes: ["disagree", "partial-agreement"],
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


export const cp504NoticeResponseProfile: NoticeResponseWorkflowProfile = Object.freeze({
  workflowId: "cp504-response",
  title: "Respond to an IRS CP504 Notice",
  noticeLabel: "CP504",
  primaryDocumentId: "cp504-notice",
  primaryDocumentLabel: "IRS CP504 notice",
  extractionSchema: "irs.cp504.v1",
  sourcePurpose: "irs_cp504_notice",
  responseModeLabel: "How do you want to address the CP504?",
  responseModes: [
    { value: "disagree", label: "I disagree with the balance or account status" },
    { value: "already_paid", label: "I already paid or took corrective action" },
    { value: "payment_arrangement", label: "I need to address payment arrangements" },
    { value: "hardship", label: "I need to explain a financial-hardship situation" },
    { value: "other", label: "I need to send other documented correspondence" },
  ],
  evidenceKinds: COMMON_TAX_EVIDENCE,
  explanationRequiredModes: [
    "disagree",
    "already_paid",
    "payment_arrangement",
    "hardship",
    "other",
  ],
  explanationLabel: "Explain the facts relevant to your response",
  explanationHint:
    "State only facts supported by the CP504, your confirmed information, or records you actually provide. Do not treat this correspondence as a CAP or CDP request unless you separately follow the controlling appeal instructions and required form.",
  requestedActionDefault:
    "Please review my account, the facts stated in this response, and the enclosed records, and contact me regarding the appropriate next steps.",
  analysisInstructions:
    "Confirm that the controlling document is an IRS CP504 Notice of Intent to Levy under IRC section 6331(d). Extract only notice-supported facts, including the tax period, notice date, any printed action or payment date, amount due, identifiers, payment or contact instructions, collection warnings, and any mailing destination actually printed on the notice. Preserve the distinction between the Collection Appeals Program (CAP) and a later Collection Due Process (CDP) notice. Do not calculate a 30-day deadline, infer that CP504 itself supplies CDP hearing rights, invent a response address, or represent a generic response letter as Form 9423 or Form 12153.",
  draftInstructions:
    "Prepare factual CP504 correspondence using only verified notice facts, user-confirmed facts, the selected response mode, and records actually included. Distinguish disagreement or account correction, already-paid facts, payment-arrangement discussion, hardship facts, and other documented correspondence. Do not state that the letter itself files a CAP appeal, requests a CDP hearing, suspends collection, stops a levy, or guarantees any outcome. If the notice describes CAP rights or another formal appeal path, identify that as a separate notice-controlled process the user must follow.",
});

export const irsBalanceDueNoticeResponseProfile: NoticeResponseWorkflowProfile = Object.freeze({
  workflowId: "irs-balance-due-notice-response",
  title: "Respond to an IRS Balance-Due Notice",
  noticeLabel: "IRS balance-due notice",
  primaryDocumentId: "irs-balance-due-notice",
  primaryDocumentLabel: "IRS balance-due notice",
  extractionSchema: "irs.balance-due.v1",
  sourcePurpose: "irs_balance_due_notice",
  responseModeLabel: "How are you addressing the balance due?",
  responseModes: [
    { value: "agree", label: "I agree with the balance due" },
    { value: "disagree", label: "I disagree with the balance or account status" },
    { value: "already_paid", label: "I already paid some or all of this amount" },
    { value: "payment_arrangement", label: "I need to discuss payment arrangements" },
    { value: "other", label: "I need to send another documented response" },
  ],
  evidenceKinds: COMMON_TAX_EVIDENCE,
  explanationRequiredModes: ["disagree", "already_paid", "payment_arrangement", "other"],
  explanationLabel: "Explain what the IRS should know",
  explanationHint:
    "State only facts supported by the notice, your confirmed information, or records you actually provide.",
  requestedActionDefault:
    "Please review the account and the enclosed information and update the balance or account record as appropriate.",
  analysisInstructions:
    "Identify the notice number printed on the document (for example CP14, CP501, CP503, CP504, LT11, Letter 1058, or CP90). Extract only notice-supported facts, including the tax period, notice date, printed due/action date if shown, balance due, reference identifiers, payment and contact instructions, and any mailing destination actually printed on the notice. If the notice is a CP504, LT11, Letter 1058, CP90, or otherwise states a right to a Collection Due Process hearing, say so in missingInformation: those notices carry notice-controlled appeal rights that a general balance-due letter does not exercise. Never calculate a deadline, invent an IRS address, or decide that the balance is legally or mathematically correct.",
  draftInstructions:
    "Prepare factual balance-due correspondence using only verified notice facts, user-confirmed facts, the selected response mode, and records actually included. Preserve the distinction between agreement, disagreement, already-paid facts, payment-arrangement discussion, and other documented correspondence. Do not represent the letter as an installment-agreement application (Form 9465 or an online payment agreement), a Collection Appeals Program request, or a Collection Due Process hearing request, and do not state that it stops collection. Never invent tax figures, payments, deadlines, addresses, authorities, or outcomes.",
});

export const irsPenaltyNoticeResponseProfile: NoticeResponseWorkflowProfile = Object.freeze({
  workflowId: "irs-penalty-notice-response",
  title: "Respond to an IRS Penalty Notice",
  noticeLabel: "IRS penalty notice",
  primaryDocumentId: "irs-penalty-notice",
  primaryDocumentLabel: "IRS notice showing the penalty",
  extractionSchema: "irs.penalty.v1",
  sourcePurpose: "irs_penalty_notice",
  responseModeLabel: "What penalty relief are you requesting?",
  responseModes: [
    { value: "first_time_abatement", label: "First-time penalty abatement" },
    { value: "reasonable_cause", label: "Reasonable-cause relief" },
    { value: "penalty_error", label: "The penalty was assessed in error" },
    { value: "other", label: "I need to send another documented response" },
  ],
  evidenceKinds: [
    { value: "reasonable_cause_record", label: "Record supporting reasonable cause (medical, disaster, casualty)" },
    { value: "filing_proof", label: "Proof of timely filing or mailing" },
    { value: "payment_record", label: "Payment record or confirmation" },
    { value: "written_irs_advice", label: "Written advice received from the IRS" },
    { value: "tax_return", label: "Tax return or amended return" },
    { value: "account_transcript", label: "IRS transcript or account record" },
    { value: "prior_correspondence", label: "Prior IRS correspondence" },
    { value: "other", label: "Other supporting document" },
  ],
  explanationRequiredModes: ["first_time_abatement", "reasonable_cause", "penalty_error", "other"],
  explanationLabel: "Explain the facts supporting relief",
  explanationHint:
    "For reasonable cause, describe what happened, when, and how it prevented timely filing or payment, and when you complied afterward. For first-time abatement, state your prior compliance only as you know it. Do not claim facts your records do not support.",
  requestedActionDefault:
    "Please remove the penalty identified above for the reasons stated and adjust any related interest as appropriate.",
  analysisInstructions:
    "Identify the notice number and every penalty shown, including its type as printed (for example failure to file, failure to pay, failure to deposit, estimated tax, or accuracy-related), the tax period, the penalty amount, related interest if shown, notice date, printed response date if any, reference identifiers, and any mailing destination actually printed. Extract only what the notice states. Never decide whether the taxpayer qualifies for first-time abatement or reasonable-cause relief, never calculate a penalty, interest, or deadline, and never invent an IRS address.",
  draftInstructions:
    "Prepare a factual penalty-relief request using only verified notice facts, user-confirmed facts, the selected mode, and records actually included. Identify each penalty by type, period, and amount as shown on the notice. For first-time abatement, state the user's compliance history only as the user confirmed it; do not assert eligibility beyond those facts. For reasonable cause, describe the facts, their timing, and the user's subsequent compliance without exaggeration. Do not claim that accuracy-related penalties qualify for first-time abatement, do not describe the letter as Form 843, do not promise abatement, and never invent tax figures, dates, payments, medical or other circumstances, authorities, addresses, or outcomes.",
});

export const NOTICE_RESPONSE_WORKFLOW_PROFILES = Object.freeze([
  cp14NoticeResponseProfile,
  cp2000NoticeResponseProfile,
  cp504NoticeResponseProfile,
  irsBalanceDueNoticeResponseProfile,
  irsPenaltyNoticeResponseProfile,
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
