import {
  assessIrsGeneralMailPacketReadiness,
  type IrsGeneralMailBlocker,
  type IrsGeneralMailPacketInput,
} from "./mail-readiness";

/**
 * A deterministic, local letter-preview input for a notice-directed MAIL reply.
 * This is not a PDF, approval, payment authorization, or mailing instruction.
 * Callers must obtain mail-readiness facts from trusted, current server state.
 */
export interface IrsGeneralLetterPreviewInput {
  mail: IrsGeneralMailPacketInput;
  taxpayerName: string | null;
  returnAddress: string | null;
  responseBody: string | null;
  /** Only include these labels when the user has verified them against the notice. */
  verifiedNoticeNumber?: string | null;
  verifiedTaxPeriod?: string | null;
}

export type IrsGeneralLetterPreviewBlocker =
  | IrsGeneralMailBlocker
  | "taxpayer_name_missing_or_unsafe"
  | "return_address_missing_or_unsafe"
  | "response_body_missing_or_unsafe"
  | "notice_reference_unsafe";

export type IrsGeneralLetterPreviewResult =
  | { ready: false; blockers: readonly IrsGeneralLetterPreviewBlocker[]; preview: null }
  | {
      ready: true;
      blockers: readonly [];
      preview: Readonly<{
        recipientAddress: string;
        letterText: string;
        sourceNoticeSha256: string;
        /** Explicitly NOT approved for PDF fulfillment or physical mail. */
        status: "draft_preview_only";
      }>;
    };

const UNSAFE_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/;
const UNRESOLVED = /\[[^\]\r\n]*\]|\{[^}\r\n]*\}|<[^>\r\n]*>|\b(?:tbd|todo|insert (?:your|the)|placeholder)\b/i;

function cleanText(value: string | null | undefined, maxLength: number, multiline: boolean): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.length > maxLength || normalized.includes("\r") ||
      UNSAFE_TEXT.test(normalized) || UNRESOLVED.test(normalized)) return null;
  if (!multiline && normalized.includes("\n")) return null;
  return normalized;
}

// A return address must have a concrete delivery line and a US city/state/ZIP.
// An arbitrary two-line string must not be printed as a verified sender.
const SENDER_STATE_CODES = "AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|AS|GU|MP|PR|VI";
const senderCityStateZip = new RegExp(`^[A-Za-z][A-Za-z .'-]*,\\s*(?:${SENDER_STATE_CODES})\\s+\\d{5}(?:-\\d{4})?$`, "i");
const senderDeliveryLine = /^(?:P\.?\s*O\.?\s*Box\s+\d+[A-Za-z0-9-]*|\d+[A-Za-z]?(?:[-/]\d+[A-Za-z]?)?\s+[^\r\n]{2,75})$/i;

function cleanReturnAddress(value: string | null): string | null {
  const address = cleanText(value, 400, true);
  if (!address) return null;
  const lines = address.split("\n").map((line) => line.trim());
  if (lines.length < 2 || lines.length > 6 || lines.some((line) => !line || line.length > 80)) return null;
  // A return address with two city/state/ZIP lines is ambiguous on a physical letter.
  // Require exactly one destination, at the end, even when a delivery line exists.
  if (lines.filter((line) => senderCityStateZip.test(line)).length !== 1 ||
      !senderCityStateZip.test(lines[lines.length - 1]!) ||
      !lines.slice(0, -1).some((line) => senderDeliveryLine.test(line))) return null;
  return lines.join("\n");
}

/**
 * Fail closed: never generate a generic letter for an informational notice,
 * a required nonmail process, an unconfirmed recipient, or a stale notice.
 * The exact preview text can be handed to an authenticated PDF renderer later,
 * but this function deliberately performs no I/O and grants no approval.
 */
export function prepareIrsGeneralLetterPreview(input: IrsGeneralLetterPreviewInput): IrsGeneralLetterPreviewResult {
  const readiness = assessIrsGeneralMailPacketReadiness(input.mail);
  const blockers: IrsGeneralLetterPreviewBlocker[] = [...readiness.blockers];
  const name = cleanText(input.taxpayerName, 120, false);
  const sender = cleanReturnAddress(input.returnAddress);
  const body = cleanText(input.responseBody, 6000, true);
  const notice = input.verifiedNoticeNumber == null || input.verifiedNoticeNumber === ""
    ? null : cleanText(input.verifiedNoticeNumber, 100, false);
  const period = input.verifiedTaxPeriod == null || input.verifiedTaxPeriod === ""
    ? null : cleanText(input.verifiedTaxPeriod, 100, false);

  if (!name) blockers.push("taxpayer_name_missing_or_unsafe");
  if (!sender) blockers.push("return_address_missing_or_unsafe");
  if (!body) blockers.push("response_body_missing_or_unsafe");
  if ((input.verifiedNoticeNumber && !notice) || (input.verifiedTaxPeriod && !period)) {
    blockers.push("notice_reference_unsafe");
  }
  if (blockers.length || !name || !sender || !body || !input.mail.recipientAddress || !input.mail.noticeSha256) {
    return { ready: false, blockers, preview: null };
  }

  const letterText = [
    name,
    sender,
    "",
    input.mail.recipientAddress.replace(/\r\n/g, "\n"),
    "",
    ...(notice ? [`Re: IRS notice ${notice}`] : []),
    ...(period ? [`Tax period: ${period}`] : []),
    ...(notice || period ? [""] : []),
    body,
    "",
    "Sincerely,",
    name,
  ].join("\n");

  return {
    ready: true,
    blockers: [],
    preview: {
      recipientAddress: input.mail.recipientAddress.replace(/\r\n/g, "\n"),
      letterText,
      sourceNoticeSha256: input.mail.noticeSha256.toLowerCase(),
      status: "draft_preview_only",
    },
  };
}
