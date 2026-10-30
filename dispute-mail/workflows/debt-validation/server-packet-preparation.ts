/**
 * Server-side, side-effect-free preparation of a debt-validation mailing packet.
 *
 * This bridges a real, owner-scoped source PDF to the canonical printable
 * letter and an immutable packet snapshot. Callers MUST authenticate and read
 * noticePdfBytes and trustedNotice from the same owner's document vault.
 * The source notice is evidence for the address, NOT an automatic enclosure.
 *
 * No HTTP route, persistence, user approval, Stripe, Lob, or provider action
 * is registered here. The returned bytes must be persisted and rehashed at
 * approval and fulfillment; this preparation step is NOT mailing consent.
 */
import { createHash } from "node:crypto";
import { validatePdfForMailing, type PacketManifestEntry } from "@mailmypdf/packet-builder";
import { calculateQuote } from "@mailmypdf/pricing";
import { validateDebtValidationIntake, type DebtValidationIntake } from "./domain";
import { createLocalDebtValidationPdfPreview } from "./pdf-preview";
import {
  createDebtValidationApprovalBinding,
  debtValidationIntakeSha256,
  type DebtValidationPacketSnapshot,
  type TrustedDebtValidationNotice,
} from "./server-approval-binding";

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function prepareDebtValidationMatterPacket(input: {
  ownerId: string;
  matterId: string;
  matterVersion: number;
  totalCents: number;
  mailClass: DebtValidationPacketSnapshot["mailClass"];
  letterDate: string;
  intake: DebtValidationIntake;
  trustedNotice: TrustedDebtValidationNotice;
  /** Bytes fetched from authenticated, owner-scoped storage, not request JSON. */
  noticePdfBytes: Uint8Array;
}): Promise<{
  pdfBytes: Uint8Array;
  packet: DebtValidationPacketSnapshot;
  responsePages: number;
  supportingPages: number;
  manifest: PacketManifestEntry[];
}> {
  const { ownerId, matterId, intake, trustedNotice, noticePdfBytes } = input;
  if (!ownerId?.trim() || !matterId?.trim()) {
    throw new Error("debt_validation_owner_scope");
  }
  if (!trustedNotice || typeof trustedNotice.sha256 !== "string"
    || !/^[a-f0-9]{64}$/i.test(trustedNotice.sha256)
    || !(noticePdfBytes instanceof Uint8Array)
    || digest(noticePdfBytes) !== trustedNotice.sha256.toLowerCase()) {
    throw new Error("debt_validation_source_integrity");
  }
  try {
    await validatePdfForMailing(noticePdfBytes);
  } catch {
    throw new Error("debt_validation_invalid_source_pdf");
  }

  // Reject malformed/unconfirmed intake before invoking the PDF builder.
  // Browser draft errors are not the server approval error contract, and
  // malformed notice/recipient state must never produce a reviewable packet.
  if (validateDebtValidationIntake(intake).length) {
    throw new Error("debt_validation_invalid_intake");
  }

  // Use exactly the same canonical PDF builder as the local review. The
  // controlling notice is deliberately not included without enclosure consent.
  let assembled: Awaited<ReturnType<typeof createLocalDebtValidationPdfPreview>>;
  try {
    assembled = await createLocalDebtValidationPdfPreview(intake, input.letterDate);
  } catch (error) {
    // Browser preview errors are human-readable; server approval callers
    // require the stable domain error code for invalid generated PDFs.
    if (error instanceof Error
      && error.message === "Debt validation PDF exceeds mailing limits or cannot be validated.") {
      throw new Error("debt_validation_invalid_generated_pdf");
    }
    throw error;
  }
  if (assembled.supportingPages !== 0 || assembled.manifest.length !== 0) {
    throw new Error("debt_validation_unexpected_enclosure");
  }

  // The source notice is checked above, but the generated letter is the
  // actual PDF that could be mailed. Apply the same final-packet constraints
  // (including the ten-page limit) before making an approvable snapshot.
  try {
    const validated = await validatePdfForMailing(assembled.bytes);
    if (validated.pageCount !== assembled.responsePages + assembled.supportingPages) {
      throw new Error("generated_packet_page_mismatch");
    }
  } catch {
    throw new Error("debt_validation_invalid_generated_pdf");
  }

  // Never make a caller-supplied amount approvable. The server must price the
  // validated, actually assembled PDF using the shared canonical pricing engine.
  // This is a quote-integrity check only: it does not enable checkout.
  const quote = calculateQuote({
    workflowId: "debt-validation",
    verticalId: "dispute-mail",
    actualPages: assembled.responsePages,
    supportingPages: assembled.supportingPages,
    mailClass: input.mailClass,
  });
  if (quote.mailService !== input.mailClass
    || !Number.isSafeInteger(input.totalCents)
    || input.totalCents !== quote.totalCents) {
    throw new Error("debt_validation_quote_mismatch");
  }

  const packet: DebtValidationPacketSnapshot = {
    ownerId,
    matterId,
    matterVersion: input.matterVersion,
    totalCents: quote.totalCents,
    mailClass: input.mailClass,
    pdfSha256: digest(assembled.bytes),
    enclosureManifestSha256: digest(new TextEncoder().encode(JSON.stringify(assembled.manifest))),
    intakeSha256: debtValidationIntakeSha256(intake),
    recipientAddress: trustedNotice.responseMailingAddress,
    noticeDocumentId: trustedNotice.documentId,
    noticeSha256: trustedNotice.sha256,
    noticeVersion: trustedNotice.version,
  };

  // Reuse the approval contract as an internal integrity check. Passing the
  // generated digest here does NOT record user review or approval.
  createDebtValidationApprovalBinding({
    ownerId, matterId, intake, trustedNotice, packet,
    reviewedPdfSha256: packet.pdfSha256,
  });

  return {
    pdfBytes: assembled.bytes,
    packet,
    responsePages: assembled.responsePages,
    supportingPages: assembled.supportingPages,
    manifest: assembled.manifest,
  };
}
