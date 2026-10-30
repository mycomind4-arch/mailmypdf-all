import {
  normalizeMailingAddress,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "./domain";

/**
 * Local-only drafting state. A browser-selected notice is NOT an authenticated,
 * owner-scoped document and cannot authorize server approval or checkout.
 */
export function emptyDebtValidationIntake(): DebtValidationIntake {
  return {
    consumerName: "",
    consumerMailingAddress: "",
    collectorName: "",
    collectorResponseAddress: "",
    accountReference: "",
    disputeExplanation: "",
    requestOriginalCreditor: false,
    noticeDocumentId: "",
    noticeSha256: "",
    noticeVersion: 1,
    noticeResponseAddress: "",
    noticeDate: null,
    noticeDisputeDeadline: null,
    recipientConfirmed: false,
    confirmedRecipientAddress: "",
    confirmedNoticeSha256: "",
    confirmedNoticeDocumentId: "",
    confirmedNoticeVersion: 0,
  };
}

export function revokeLocalRecipientConfirmation(input: DebtValidationIntake): DebtValidationIntake {
  return {
    ...input,
    recipientConfirmed: false,
    confirmedRecipientAddress: "",
    confirmedNoticeSha256: "",
    confirmedNoticeDocumentId: "",
    confirmedNoticeVersion: 0,
  };
}

export function replaceLocalNotice(
  input: DebtValidationIntake,
  notice: { documentId: string; sha256: string },
): DebtValidationIntake {
  return revokeLocalRecipientConfirmation({
    ...input,
    noticeDocumentId: notice.documentId,
    noticeSha256: notice.sha256,
    noticeVersion: input.noticeVersion + 1,
    noticeResponseAddress: "",
    collectorResponseAddress: "",
    noticeDate: null,
    noticeDisputeDeadline: null,
  });
}

export function changeLocalRecipient(
  input: DebtValidationIntake,
  patch: { noticeResponseAddress?: string; collectorResponseAddress?: string },
): DebtValidationIntake {
  return revokeLocalRecipientConfirmation({ ...input, ...patch });
}

/** Confirmation is possible only when the complete draft is internally consistent. */
export function confirmLocalRecipient(input: DebtValidationIntake): DebtValidationIntake {
  const candidate: DebtValidationIntake = {
    ...input,
    recipientConfirmed: true,
    confirmedRecipientAddress: input.collectorResponseAddress,
    confirmedNoticeSha256: input.noticeSha256,
    confirmedNoticeDocumentId: input.noticeDocumentId,
    confirmedNoticeVersion: input.noticeVersion,
  };
  if (normalizeMailingAddress(candidate.collectorResponseAddress)
      !== normalizeMailingAddress(candidate.noticeResponseAddress)
      || validateDebtValidationIntake(candidate).length) {
    throw new Error("Review the complete notice, recipient, and dispute details before confirming.");
  }
  return candidate;
}
