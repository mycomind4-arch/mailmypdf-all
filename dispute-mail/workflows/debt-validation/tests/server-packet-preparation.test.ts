import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { generatePlainTextPdf } from "@mailmypdf/packet-builder";
import type { DebtValidationIntake } from "../domain";
import { createDebtValidationApprovalBinding } from "../server-approval-binding";
import { prepareDebtValidationMatterPacket } from "../server-packet-preparation";

const address = "Example Collections\nPO Box 456\nAustin, TX 78701";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function fixture() {
  const sourceBytes = await generatePlainTextPdf("Synthetic debt collection notice. Response destination: PO Box 456.");
  const noticeSha256 = sha(sourceBytes);
  const intake: DebtValidationIntake = {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: "Example Collections",
    collectorResponseAddress: address,
    accountReference: "TEST-123",
    disputeExplanation: "I dispute the amount claimed in the collection notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "notice-1",
    noticeSha256,
    noticeVersion: 1,
    noticeResponseAddress: address,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: address,
    confirmedNoticeSha256: noticeSha256,
    confirmedNoticeDocumentId: "notice-1",
    confirmedNoticeVersion: 1,
  };
  return {
    ownerId: "owner-1",
    matterId: "matter-1",
    matterVersion: 2,
    totalCents: 1499,
    mailClass: "certified" as const,
    letterDate: "2026-10-30",
    intake,
    trustedNotice: {
      ownerId: "owner-1", matterId: "matter-1", documentId: "notice-1",
      sha256: noticeSha256, version: 1, responseMailingAddress: address,
      mailingAddressVerified: true,
    },
    noticePdfBytes: sourceBytes,
  };
}

test("server packet preparation: real vault notice yields exact letter PDF and reviewable binding", async () => {
  const input = await fixture();
  const result = await prepareDebtValidationMatterPacket(input);
  assert.equal(new TextDecoder().decode(result.pdfBytes.slice(0, 5)), "%PDF-");
  assert.equal(sha(result.pdfBytes), result.packet.pdfSha256);
  assert.equal(result.packet.noticeSha256, input.trustedNotice.sha256);
  assert.equal(result.packet.intakeSha256.length, 64);
  assert.equal(result.packet.enclosureManifestSha256, sha(new TextEncoder().encode("[]")));
  assert.equal(result.responsePages >= 1, true);
  assert.equal(result.supportingPages, 0, "the controlling notice must not be mailed as an enclosure by default");
  assert.deepEqual(result.manifest, []);
  const binding = createDebtValidationApprovalBinding({
    ownerId: input.ownerId, matterId: input.matterId,
    intake: input.intake, trustedNotice: input.trustedNotice,
    packet: result.packet, reviewedPdfSha256: result.packet.pdfSha256,
  });
  assert.equal(binding.totalCents, 1499);
  assert.equal(binding.mailClass, "certified");
});

test("server packet preparation: swapped or forged source PDF cannot become a trusted packet", async () => {
  const input = await fixture();
  const swapped = await generatePlainTextPdf("Different collector notice.");
  await assert.rejects(
    prepareDebtValidationMatterPacket({ ...input, noticePdfBytes: swapped }),
    /debt_validation_source_integrity/,
  );
  const forged = new TextEncoder().encode("%PDF-1.7\n%%EOF");
  await assert.rejects(
    prepareDebtValidationMatterPacket({
      ...input,
      noticePdfBytes: forged,
      trustedNotice: { ...input.trustedNotice, sha256: sha(forged) },
      intake: { ...input.intake, noticeSha256: sha(forged), confirmedNoticeSha256: sha(forged) },
    }),
    /debt_validation_invalid_source_pdf/,
  );
});

test("server packet preparation: owner, notice, address, quote and approval prerequisites fail closed", async () => {
  const input = await fixture();
  const cases = [
    { ...input, ownerId: "other-owner" },
    { ...input, trustedNotice: { ...input.trustedNotice, mailingAddressVerified: false } },
    { ...input, intake: { ...input.intake, recipientConfirmed: false } },
    { ...input, intake: { ...input.intake, collectorResponseAddress: "Example Collections\nPO Box 999\nAustin, TX 78701" } },
    { ...input, totalCents: -1 },
    { ...input, mailClass: "overnight" as "certified" },
  ];
  for (const candidate of cases) {
    await assert.rejects(prepareDebtValidationMatterPacket(candidate), /debt_validation_|Debt validation blocked:/, JSON.stringify({
      ownerId: candidate.ownerId, totalCents: candidate.totalCents, mailClass: candidate.mailClass,
    }));
  }
});
