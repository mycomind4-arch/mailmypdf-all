import assert from "node:assert/strict";
import test from "node:test";
import {
  draftDebtValidationEnvelopeAddress,
  draftDebtValidationLetter,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../domain";
import { createLocalDebtValidationPdfPreview } from "../pdf-preview";
import {
  assertDebtValidationCheckoutBinding,
  createDebtValidationApprovalBinding,
  type DebtValidationPacketSnapshot,
} from "../server-approval-binding";

const sha = "a".repeat(64);
const collector = "Example Collections";

function confirmed(address: string): DebtValidationIntake {
  return {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: collector,
    collectorResponseAddress: address,
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "I dispute the amount in the notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "synthetic-notice",
    noticeSha256: sha,
    noticeVersion: 1,
    noticeResponseAddress: address,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: address,
    confirmedNoticeSha256: sha,
    confirmedNoticeDocumentId: "synthetic-notice",
    confirmedNoticeVersion: 1,
  };
}

test("debt validation rejects a notice address that becomes seven envelope lines after collector addressee insertion", async () => {
  // Six lines in the source are individually valid; adding a missing
  // collector name produces a seven-line physical mailing destination.
  const sourceAddress = [
    "Attn: Disputes", "Department 3", "Floor 2", "Suite 100",
    "PO Box 456", "Austin, TX 78701",
  ].join("\n");
  const intake = confirmed(sourceAddress);
  assert.ok(validateDebtValidationIntake(intake).some((issue) => issue.code === "invalid_envelope"));
  assert.throws(() => draftDebtValidationLetter(intake, "2026-10-30"), /invalid_envelope/);
  assert.throws(() => draftDebtValidationEnvelopeAddress(intake), /invalid_envelope/);
  let mockedProviderSubmissions = 0;
  await assert.rejects(async () => {
    await createLocalDebtValidationPdfPreview(intake, "2026-10-30");
    mockedProviderSubmissions++;
  }, /invalid_envelope/);
  assert.equal(mockedProviderSubmissions, 0);

  // The same invalid derived destination must also be refused by the
  // authenticated server-side approval/checkout binding, not only by UI.
  const packet: DebtValidationPacketSnapshot = {
    ownerId: "owner-1", matterId: "matter-1", matterVersion: 1,
    totalCents: 1499, mailClass: "standard", pdfSha256: sha,
    enclosureManifestSha256: sha, intakeSha256: sha,
    recipientAddress: sourceAddress,
    noticeDocumentId: intake.noticeDocumentId,
    noticeSha256: sha, noticeVersion: 1,
  };
  const trustedNotice = {
    ownerId: "owner-1", matterId: "matter-1",
    documentId: intake.noticeDocumentId, sha256: sha, version: 1,
    responseMailingAddress: sourceAddress, mailingAddressVerified: true,
  };
  assert.throws(() => createDebtValidationApprovalBinding({
    ownerId: "owner-1", matterId: "matter-1", intake,
    reviewedPdfSha256: sha, trustedNotice, packet,
  }), /debt_validation_invalid_intake/);
  assert.throws(() => assertDebtValidationCheckoutBinding({
    ownerId: "owner-1", matterId: "matter-1",
    currentIntake: intake, trustedNotice, packet, binding: packet,
  }), /debt_validation_stale_intake/);
});

test("debt validation preserves valid six-line destinations with or without an added collector addressee", () => {
  const addresses = [
    [collector, "Attn: Disputes", "Department 3", "Floor 2", "PO Box 456", "Austin, TX 78701"],
    ["Attn: Disputes", "Department 3", "Floor 2", "PO Box 456", "Austin, TX 78701"],
  ];
  for (const lines of addresses) {
    const intake = confirmed(lines.join("\n"));
    assert.deepEqual(validateDebtValidationIntake(intake), []);
    const envelope = draftDebtValidationEnvelopeAddress(intake);
    assert.equal(envelope.recipientAddress.split("\n").length, 6);
    assert.equal(envelope.recipientAddress.split("\n")[0], collector);
    assert.match(draftDebtValidationLetter(intake, "2026-10-30"), /I dispute the debt/);
  }
});
