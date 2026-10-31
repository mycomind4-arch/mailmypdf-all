/**
 * Debt-validation domain slice: deterministic intake and letter drafting.
 * No payment, mailing, PDF persistence, or approval side effects.
 *
 * Authorities checked 2026-10-30:
 * https://www.consumerfinance.gov/rules-policy/regulations/1006/34/
 * https://www.consumerfinance.gov/ask-cfpb/what-information-does-a-debt-collector-have-to-give-me-about-the-debt-en-331/
 * A validation-period end date must come from the actual notice; never
 * calculate it from a contact date or promise a collection pause.
 */
export interface DebtValidationIntake {
  consumerName: string;
  consumerMailingAddress: string;
  collectorName: string;
  collectorResponseAddress: string;
  accountReference: string;
  disputeExplanation: string;
  requestOriginalCreditor: boolean;
  noticeDocumentId: string;
  noticeSha256: string;
  noticeVersion: number;
  noticeResponseAddress: string;
  noticeDate: string | null;
  noticeDisputeDeadline: string | null;
  recipientConfirmed: boolean;
  confirmedRecipientAddress: string;
  confirmedNoticeSha256: string;
  confirmedNoticeDocumentId: string;
  confirmedNoticeVersion: number;
}

export type DebtValidationBlockerCode =
  | "missing_consumer" | "missing_collector" | "missing_account"
  | "missing_dispute" | "missing_notice" | "invalid_notice_date"
  | "unconfirmed_recipient" | "recipient_mismatch" | "notice_changed"
  | "invalid_text";

export interface DebtValidationBlocker {
  code: DebtValidationBlockerCode;
  message: string;
}

const SHA256 = /^[0-9a-f]{64}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
// Require a city as well as a recognized state and ZIP. A bare "TX 78701"
// must not pass as a complete last line for a physical-mail destination.
const ADDRESS_LAST_LINE = /^(.+?)(?:,\s*|\s+)([A-Z]{2})\s+\d{5}(?:-\d{4})?\s*$/i;
// US states, DC, USPS territories and military/associated-state postal codes.
const US_POSTAL_REGIONS = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI AA AE AP FM MH PW".split(" "),
);

function cleanLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeMailingAddress(value: string): string {
  return value.split(/\r?\n/).map(cleanLine).filter(Boolean).join("\n").toUpperCase();
}

function isMailingAddress(value: string): boolean {
  const lines = normalizeMailingAddress(value).split("\n");
  const lastLine = (lines.at(-1) ?? "").match(ADDRESS_LAST_LINE);
  const city = lastLine?.[1]?.trim() ?? "";
  const region = lastLine?.[2]?.toUpperCase();
  // Digits in a collector name, account reference or suite number are not
  // evidence of a street/box delivery destination. Require an actual delivery
  // line, while preserving street, PO Box, rural/highway, military and General
  // Delivery formats. This is syntax screening, not USPS deliverability proof.
  const deliveryLine = /^(?:\d+[A-Z]?(?:[-/]\d+)?\s+\S+.*|P\.?\s*O\.?\s*BOX\s+\S+|POST OFFICE BOX\s+\S+|(?:RR|RURAL ROUTE|HC|HIGHWAY CONTRACT ROUTE)\s+\d+(?:\s+BOX\s+\S+)?|(?:PSC|CMR|UNIT)\s+\d+\s+BOX\s+\S+|GENERAL DELIVERY)$/i;
  const hasDeliveryLine = lines.slice(0, -1).some((line) => deliveryLine.test(line));
  return lines.length >= 2 && lines.length <= 6
    && value.length <= 500 && !FORBIDDEN.test(value)
    && Boolean(/\p{L}/u.test(city) && region && US_POSTAL_REGIONS.has(region))
    && hasDeliveryLine;
}

function isSingleLine(value: string, limit: number): boolean {
  return Boolean(value.trim()) && value.length <= limit && !/[\r\n]/.test(value)
    && !FORBIDDEN.test(value);
}

function isExplanation(value: string): boolean {
  return Boolean(value.trim()) && value.length <= 3000 && !FORBIDDEN.test(value);
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function validateDebtValidationIntake(input: DebtValidationIntake): DebtValidationBlocker[] {
  // TypeScript types are not a trust boundary: malformed JSON must fail closed.
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [{ code: "invalid_text", message: "A complete debt-validation intake is required." }];
  }
  const record = input as unknown as Record<string, unknown>;
  const requiredStrings = [
    "consumerName", "consumerMailingAddress", "collectorName", "collectorResponseAddress",
    "accountReference", "disputeExplanation", "noticeDocumentId", "noticeSha256",
    "noticeResponseAddress", "confirmedRecipientAddress", "confirmedNoticeSha256",
    "confirmedNoticeDocumentId",
  ];
  if (requiredStrings.some((key) => typeof record[key] !== "string")
    || typeof record.recipientConfirmed !== "boolean"
    || typeof record.requestOriginalCreditor !== "boolean"
    || typeof record.noticeVersion !== "number" || !Number.isSafeInteger(record.noticeVersion)
    || typeof record.confirmedNoticeVersion !== "number" || !Number.isSafeInteger(record.confirmedNoticeVersion)
    || (record.noticeDate !== null && typeof record.noticeDate !== "string")
    || (record.noticeDisputeDeadline !== null && typeof record.noticeDisputeDeadline !== "string")) {
    return [{ code: "invalid_text", message: "Malformed or incomplete intake fields must be corrected." }];
  }
  const issues: DebtValidationBlocker[] = [];
  const add = (code: DebtValidationBlockerCode, message: string) => issues.push({ code, message });
  if (!isSingleLine(input.consumerName, 200) || !isMailingAddress(input.consumerMailingAddress)) {
    add("missing_consumer", "Provide your name and a complete US return mailing address.");
  }
  if (!isSingleLine(input.collectorName, 200) || !isMailingAddress(input.collectorResponseAddress)) {
    add("missing_collector", "Provide the collector name and complete mailing destination.");
  }
  if (!isSingleLine(input.accountReference, 100)) {
    add("missing_account", "Identify the account or reference shown on the notice.");
  }
  if (!isExplanation(input.disputeExplanation)) {
    add("missing_dispute", "Describe the part of the claimed debt you dispute, without admitting liability.");
  }
  if (!isSingleLine(input.noticeDocumentId, 200) || !SHA256.test(input.noticeSha256)
    || !Number.isSafeInteger(input.noticeVersion) || input.noticeVersion < 1
    || !isMailingAddress(input.noticeResponseAddress)) {
    add("missing_notice", "A reviewed controlling notice and its response address are required.");
  }
  if ((input.noticeDate && !isRealDate(input.noticeDate))
    || (input.noticeDisputeDeadline && !isRealDate(input.noticeDisputeDeadline))) {
    add("invalid_notice_date", "Use only real dates printed on the notice; do not infer a deadline.");
  }
  if (!input.recipientConfirmed) {
    add("unconfirmed_recipient", "Explicitly confirm the response address from the controlling notice.");
  }
  if (!isMailingAddress(input.confirmedRecipientAddress)
    || normalizeMailingAddress(input.collectorResponseAddress) !== normalizeMailingAddress(input.noticeResponseAddress)
    || normalizeMailingAddress(input.confirmedRecipientAddress) !== normalizeMailingAddress(input.noticeResponseAddress)) {
    add("recipient_mismatch", "The recipient must match the notice's confirmed response mailing address.");
  }
  if (!SHA256.test(input.confirmedNoticeSha256)
    || input.confirmedNoticeSha256.toLowerCase() !== input.noticeSha256.toLowerCase()
    || input.confirmedNoticeDocumentId !== input.noticeDocumentId
    || input.confirmedNoticeVersion !== input.noticeVersion) {
    add("notice_changed", "The controlling notice changed after recipient confirmation.");
  }
  if ([input.consumerName, input.collectorName, input.accountReference, input.disputeExplanation]
    .some((value) => FORBIDDEN.test(value))) {
    add("invalid_text", "Remove unsafe control characters from the letter fields.");
  }
  return issues;
}

/** A draft is only returned for an explicitly confirmed, unchanged notice/recipient. */
export function draftDebtValidationLetter(input: DebtValidationIntake, letterDate: string): string {
  const issues = validateDebtValidationIntake(input);
  if (issues.length) throw new Error("Debt validation blocked: " + issues.map((issue) => issue.code).join(", "));
  if (!isRealDate(letterDate)) throw new Error("A real letter date is required.");
  const recipientLines = input.collectorResponseAddress.trim().split(/\r?\n/);
  const recipientAlreadyNamed = cleanLine(recipientLines[0] ?? "").toUpperCase()
    === cleanLine(input.collectorName).toUpperCase();
  const lines = [
    letterDate,
    input.consumerName.trim(),
    input.consumerMailingAddress.trim(),
    "",
    ...(!recipientAlreadyNamed ? [input.collectorName.trim()] : []),
    input.collectorResponseAddress.trim(),
    "",
    "Re: Written dispute and request for debt verification",
    "Collector reference: " + cleanLine(input.accountReference),
    "",
    "To the debt collector:",
    "",
    "I dispute the debt identified above. My reason for disputing it is:",
    input.disputeExplanation.trim(),
    "",
    "Please provide verification of the disputed debt and an explanation of the amount claimed.",
  ];
  if (input.requestOriginalCreditor) {
    lines.push("Please also provide the name and mailing address of the original creditor, if different from the current creditor.");
  }
  lines.push(
    "",
    "Please respond to my mailing address above. This request is not an admission that I owe the debt.",
    "",
    "Sincerely,",
    input.consumerName.trim(),
  );
  return lines.join("\n");
}

/**
 * Browser-only envelope ADDRESS preview, not a mailing label or proof of
 * deliverability. Reuse the same notice/recipient confirmation gate as the
 * actual letter: no unconfirmed or stale destination may be displayed as
 * a ready-to-review envelope destination.
 */
export function draftDebtValidationEnvelopeAddress(input: DebtValidationIntake): {
  returnAddress: string;
  recipientAddress: string;
} {
  const issues = validateDebtValidationIntake(input);
  if (issues.length) {
    throw new Error("Debt validation envelope blocked: " + issues.map((issue) => issue.code).join(", "));
  }
  const destination = input.collectorResponseAddress.trim();
  const firstLine = cleanLine(destination.split(/\r?\n/)[0] ?? "").toUpperCase();
  const collector = cleanLine(input.collectorName);
  return {
    returnAddress: [input.consumerName.trim(), input.consumerMailingAddress.trim()].join("\n"),
    recipientAddress: firstLine === collector.toUpperCase()
      ? destination
      : [collector, destination].join("\n"),
  };
}

/** Timing is always notice-specific; a printed date is not a legal timeliness certification. */
export function debtValidationTimingNote(input: DebtValidationIntake): string {
  const deadline = input.noticeDisputeDeadline;
  // The browser field is manually transcribed, not extracted or independently
  // verified against the notice. Never present an impossible date as a fact,
  // including while intake validation is blocking the draft.
  if (deadline && (typeof deadline !== "string" || !isRealDate(deadline))) {
    return "The entered dispute deadline is invalid. Recheck the actual notice; do not rely on this date or infer a collection-pause effect.";
  }
  return deadline
    ? "You entered " + deadline
      + " as the deadline printed on the controlling notice. This date is not independently verified. Confirm the notice, receipt and applicable law before relying on any deadline or collection-pause effect."
    : "No verified notice-specific dispute deadline is recorded. Do not infer a 30-day deadline or collection-pause effect.";
}
