export const NOTICE_WORKFLOW_IDS = [
  "cp14-response",
  "cp2000-response",
  "cp504-response",
  "cp523-response",
] as const;

export type NoticeWorkflowId = (typeof NOTICE_WORKFLOW_IDS)[number];

type NoticeMode = readonly [value: string, label: string];

export interface NoticeWorkflowUiConfig {
  readonly noticeLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly modes: readonly NoticeMode[];
}

export const NOTICE_WORKFLOW_CONFIGS = {
  "cp14-response": {
    noticeLabel: "CP14",
    eyebrow: "IRS CP14",
    title: "Respond to your balance due notice",
    subtitle: "Upload the notice, choose a clear response path, and review a secure packet before anything is mailed.",
    modes: [
      ["pay", "Pay the balance"],
      ["dispute", "Dispute the balance"],
      ["request-arrangement", "Request an installment agreement"],
      ["request-oic", "Request an offer in compromise"],
      ["request-cnc", "Request hardship status"],
    ],
  },
  "cp2000-response": {
    noticeLabel: "CP2000",
    eyebrow: "IRS CP2000",
    title: "Build your response to a proposed adjustment",
    subtitle: "Address every proposed item with the evidence you actually have, then approve the exact response packet before mailing.",
    modes: [
      ["agree", "Agree with the changes"],
      ["disagree", "Disagree with the changes"],
      ["partial-agreement", "Partially agree"],
    ],
  },
  "cp504-response": {
    noticeLabel: "CP504",
    eyebrow: "IRS CP504",
    title: "Respond to an IRS intent-to-levy notice",
    subtitle: "Document what the notice says, choose a response path, and prepare a reviewable packet without treating a general letter as a formal collection appeal.",
    modes: [
      ["pay", "Pay the balance"],
      ["already-paid", "I already paid or resolved this"],
      ["dispute", "Dispute the balance or account status"],
      ["request-arrangement", "Request a payment arrangement"],
      ["request-oic", "Ask about an offer in compromise"],
      ["request-cnc", "Request hardship / temporary collection delay"],
    ],
  },
  "cp523-response": {
    noticeLabel: "CP523",
    eyebrow: "IRS CP523",
    title: "Respond to an installment-agreement default notice",
    subtitle: "Document the stated default, explain corrective action or reinstatement facts, and review the exact packet before mailing.",
    modes: [
      ["pay-past-due", "Pay the past-due amount"],
      ["already-corrected", "I already corrected the default"],
      ["dispute-default", "Dispute the stated default"],
      ["request-reinstatement", "Request reinstatement discussion"],
      ["cannot-pay-past-due", "I cannot pay the past-due amount now"],
    ],
  },
} as const satisfies Record<NoticeWorkflowId, NoticeWorkflowUiConfig>;

export function isNoticeWorkflowId(value: string | undefined): value is NoticeWorkflowId {
  return typeof value === "string" && (NOTICE_WORKFLOW_IDS as readonly string[]).includes(value);
}
