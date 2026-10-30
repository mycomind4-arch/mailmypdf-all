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
  const assembled = await createLocalDebtValidationPdfPreview(intake, input.letterDate);
  if (assembled.supportingPages !== 0 || assembled.manifest.length !== 0) {
    throw new Error("debt_validation_unexpected_enclosure");
  }

  const packet: DebtValidationPacketSnapshot = {
    ownerId,
    matterId,
    matterVersion: input.matterVersion,
    totalCents: input.totalCents,
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
