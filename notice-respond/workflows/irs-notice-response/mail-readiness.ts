/**
 * Conservative preflight for a generic IRS *letter* packet.
 *
 * This does not establish a legal deadline, approve a PDF, authorize a charge,
 * or permit Lob submission. The authenticated packet/approval runtime must
 * independently enforce its own gates before any external action.
 */
export type IrsGeneralResponsePath = "mail" | "nonmail" | "record_only" | "unresolved";
export type IrsNoticeDocumentStatus = "active" | "excluded" | "quarantined" | "unknown";
export type IrsRecipientAddressSource = "controlling_notice" | "current_irs_instructions" | "unverified";

export interface IrsGeneralMailPacketInput {
  /** Identity of the currently included, controlling IRS notice. */
  noticeDocumentId: string | null;
  /** Identity of the document used for the response analysis. */
  analyzedNoticeDocumentId: string | null;
  /** Trusted server-computed SHA-256 of the current notice PDF bytes. */
  noticeSha256: string | null;
  /** SHA-256 of the notice bytes used to produce the analysis. */
  analyzedNoticeSha256: string | null;
  noticeStatus: IrsNoticeDocumentStatus;
  responsePath: IrsGeneralResponsePath;
  /** Human verification of the actual notice's response instructions. */
  instructionsConfirmed: boolean;
  /** Mail must be explicitly permitted by those instructions, not inferred. */
  mailPermitted: boolean;
  /** A generic letter cannot replace a required form, petition, or other procedure. */
  requiresDifferentProcedure: boolean;
  recipientAddress: string | null;
  recipientAddressSource: IrsRecipientAddressSource;
  recipientAddressConfirmed: boolean;
  /** Server-persisted snapshot of the exact recipient address the user confirmed. */
  confirmedRecipientAddress: string | null;
  /** Trusted digest of the controlling notice at the time of recipient confirmation. */
  confirmedRecipientNoticeSha256: string | null;
  /** Recipient provenance the user confirmed, not just its rendered address text. */
  confirmedRecipientAddressSource: IrsRecipientAddressSource | null;
  /** Response channel at confirmation; a reclassified notice needs fresh review. */
  confirmedRecipientResponsePath: IrsGeneralResponsePath | null;
}

export type IrsGeneralMailBlocker =
  | "source_notice_missing"
  | "source_notice_changed"
  | "source_notice_digest_unverified"
  | "source_notice_digest_changed"
  | "source_notice_unusable"
  | "mail_response_not_selected"
  | "notice_instructions_unverified"
  | "mail_channel_unverified"
  | "different_procedure_required"
  | "recipient_address_missing"
  | "recipient_address_incomplete"
  | "recipient_source_unverified"
  | "recipient_address_unconfirmed"
  | "recipient_confirmation_stale";

// A plausible city/state/ZIP must not make a template placeholder mail-ready.
// These are document-preparation checks only; USPS deliverability and the actual
// notice-specific recipient still require independent server-side verification.
const UNRESOLVED_ADDRESS_MARKERS = /\[[^\]\r\n]*\]|\{[^}\r\n]*\}|<[^>\r\n]*>|\b(?:tbd|to be determined|placeholder|address (?:on|from|per) (?:the )?notice|see (?:the )?(?:attached )?notice|insert (?:the )?(?:irs )?address)\b/i;
// Reject invisible/bidirectional formatting controls that can change how a
// confirmed recipient appears on the rendered envelope or packet PDF.
const UNSAFE_ADDRESS_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/;

// Conservative US-format preflight, not USPS deliverability validation.
// IRS processing centers may use a city/state/ZIP without a street or PO box.
const US_STATE_CODES = "AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|AS|GU|MP|PR|VI";
const cityStateZip = new RegExp(`^[A-Za-z][A-Za-z .'-]+,\\s*(?:${US_STATE_CODES})\\s+\\d{5}(?:-\\d{4})?$`, "i");

function hasUsPostalDestination(address: string): boolean {
  // A bare CR can render as a new postal line without being recognized by
  // the LF/CRLF parser. Normalize CRLF but reject any remaining CR.
  const normalizedAddress = address.replace(/\r\n/g, "\n");
  if (normalizedAddress.includes("\r") || UNRESOLVED_ADDRESS_MARKERS.test(address) || UNSAFE_ADDRESS_CONTROLS.test(address)) return false;
  const lines = normalizedAddress.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length >= 2 &&
    cityStateZip.test(lines[lines.length - 1]) &&
    lines.slice(0, -1).some((line) => /[A-Za-z]{2,}/.test(line));
}

export function assessIrsGeneralMailPacketReadiness(input: IrsGeneralMailPacketInput): {
  canPreviewMailPacket: boolean;
  blockers: readonly IrsGeneralMailBlocker[];
} {
  const blockers: IrsGeneralMailBlocker[] = [];
  const noticeId = input.noticeDocumentId?.trim();
  const analyzedId = input.analyzedNoticeDocumentId?.trim();

  if (!noticeId || !analyzedId) {
    blockers.push("source_notice_missing");
  } else if (noticeId !== analyzedId) {
    blockers.push("source_notice_changed");
  }
  const noticeDigest = input.noticeSha256?.trim();
  const analyzedDigest = input.analyzedNoticeSha256?.trim();
  if (!noticeDigest || !analyzedDigest || !/^[a-f0-9]{64}$/i.test(noticeDigest) || !/^[a-f0-9]{64}$/i.test(analyzedDigest)) {
    blockers.push("source_notice_digest_unverified");
  } else if (noticeDigest.toLowerCase() !== analyzedDigest.toLowerCase()) {
    blockers.push("source_notice_digest_changed");
  }
  if (input.noticeStatus !== "active") blockers.push("source_notice_unusable");
  if (input.responsePath !== "mail") blockers.push("mail_response_not_selected");
  if (input.instructionsConfirmed !== true) blockers.push("notice_instructions_unverified");
  if (input.mailPermitted !== true) blockers.push("mail_channel_unverified");
  if (input.requiresDifferentProcedure !== false) blockers.push("different_procedure_required");
  if (!input.recipientAddress?.trim()) blockers.push("recipient_address_missing");
  else if (!hasUsPostalDestination(input.recipientAddress)) blockers.push("recipient_address_incomplete");
  if (input.recipientAddressSource !== "controlling_notice" && input.recipientAddressSource !== "current_irs_instructions") {
    blockers.push("recipient_source_unverified");
  }
  if (input.recipientAddressConfirmed !== true) blockers.push("recipient_address_unconfirmed");
  // A confirmation boolean alone must not authorize a destination edited later.
  // Bind the server-side confirmation to notice bytes, address provenance, and
  // response route as well as the rendered address. Normalize CRLF only; any
  // material change requires a fresh recipient review.
  if (input.recipientAddressConfirmed === true && (
    !input.confirmedRecipientAddress?.trim() ||
    !input.recipientAddress ||
    input.confirmedRecipientAddress.replace(/\r\n/g, "\n") !== input.recipientAddress.replace(/\r\n/g, "\n") ||
    !input.confirmedRecipientNoticeSha256 ||
    !/^[a-f0-9]{64}$/i.test(input.confirmedRecipientNoticeSha256) ||
    input.confirmedRecipientNoticeSha256.toLowerCase() !== noticeDigest?.toLowerCase() ||
    input.confirmedRecipientAddressSource !== input.recipientAddressSource ||
    input.confirmedRecipientResponsePath !== input.responsePath
  )) blockers.push("recipient_confirmation_stale");

  return { canPreviewMailPacket: blockers.length === 0, blockers };
}
