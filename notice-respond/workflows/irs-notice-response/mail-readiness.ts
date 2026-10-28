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
}

export type IrsGeneralMailBlocker =
  | "source_notice_missing"
  | "source_notice_changed"
  | "source_notice_unusable"
  | "mail_response_not_selected"
  | "notice_instructions_unverified"
  | "mail_channel_unverified"
  | "different_procedure_required"
  | "recipient_address_missing"
  | "recipient_source_unverified"
  | "recipient_address_unconfirmed";

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
  if (input.noticeStatus !== "active") blockers.push("source_notice_unusable");
  if (input.responsePath !== "mail") blockers.push("mail_response_not_selected");
  if (!input.instructionsConfirmed) blockers.push("notice_instructions_unverified");
  if (!input.mailPermitted) blockers.push("mail_channel_unverified");
  if (input.requiresDifferentProcedure) blockers.push("different_procedure_required");
  if (!input.recipientAddress?.trim()) blockers.push("recipient_address_missing");
  if (input.recipientAddressSource === "unverified") blockers.push("recipient_source_unverified");
  if (!input.recipientAddressConfirmed) blockers.push("recipient_address_unconfirmed");

  return { canPreviewMailPacket: blockers.length === 0, blockers };
}
