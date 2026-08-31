export const MAIL_JOB_STATES = ["draft", "queued", "processing", "accepted", "mailed", "delivered", "failed", "cancelled"] as const;
export type MailJobState = typeof MAIL_JOB_STATES[number];
const transitions: Record<MailJobState, readonly MailJobState[]> = {
  draft: ["queued", "cancelled"],
  queued: ["processing", "failed", "cancelled"],
  processing: ["accepted", "failed"],
  accepted: ["mailed", "failed"],
  mailed: ["delivered", "failed"],
  delivered: [],
  failed: ["queued", "cancelled"],
  cancelled: [],
};
export function canTransition(from: MailJobState, to: MailJobState): boolean { return from === to || transitions[from].includes(to); }
export function assertTransition(from: MailJobState, to: MailJobState): void { if (!canTransition(from, to)) throw new Error(`Invalid mail job transition: ${from} -> ${to}`); }
