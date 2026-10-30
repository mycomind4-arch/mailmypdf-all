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

/**
 * Read a browser-selected controlling notice without accepting an arbitrary
 * renamed text/image file as a PDF. Header checks are format screening only:
 * they do not authenticate the collector, address or document contents.
 * The bytes remain local and must never be treated as a server-owned notice.
 */
export async function readLocalDebtValidationNoticePdf(
  file: Pick<File, "name" | "type" | "size" | "arrayBuffer">,
): Promise<ArrayBuffer> {
  if (!file || !Number.isSafeInteger(file.size) || file.size < 14
    || file.size > 12 * 1024 * 1024
    || !(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
    throw new Error("Choose a nonempty PDF notice no larger than 12 MB.");
  }
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength !== file.size || bytes.byteLength < 8) {
    throw new Error("The selected notice could not be read completely.");
  }
  const header = new TextDecoder("ascii").decode(new Uint8Array(bytes, 0, 8));
  if (!/^%PDF-[12]\.[0-9]$/.test(header)) {
    throw new Error("The selected notice does not have a recognized PDF header.");
  }
  const tail = new TextDecoder("ascii").decode(
    new Uint8Array(bytes, Math.max(0, bytes.byteLength - 1024)),
  );
  if (!tail.includes("%%EOF")) {
    throw new Error("The selected notice is missing its PDF end marker.");
  }
  return bytes;
}
