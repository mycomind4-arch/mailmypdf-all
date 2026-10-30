import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDebtValidationCheckoutBinding,
  createDebtValidationApprovalBinding,
  debtValidationIntakeSha256,
  type DebtValidationPacketSnapshot,
  type TrustedDebtValidationNotice,
} from "../server-approval-binding";
import { draftDebtValidationLetter, type DebtValidationIntake } from "../domain";

const a = "a".repeat(64);
const b = "b".repeat(64);
const c = "c".repeat(64);
const d = "d".repeat(64);
const address = "Example Collections\nPO Box 456\nAustin, TX 78701";

function intake(): DebtValidationIntake {
  return {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: "Example Collections",
    collectorResponseAddress: address,
    accountReference: "TEST-123",
    disputeExplanation: "I dispute the amount on the notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "notice-1",
    noticeSha256: a,
    noticeVersion: 1,
    noticeResponseAddress: address,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: address,
    confirmedNoticeSha256: a,
    confirmedNoticeDocumentId: "notice-1",
    confirmedNoticeVersion: 1,
  };
}
function trustedNotice(): TrustedDebtValidationNotice {
  return {
    ownerId: "owner-1", matterId: "matter-1", documentId: "notice-1",
    sha256: a, version: 1, responseMailingAddress: address,
    mailingAddressVerified: true,
  };
}
function packet(i: DebtValidationIntake): DebtValidationPacketSnapshot {
  return {
    ownerId: "owner-1", matterId: "matter-1", matterVersion: 2,
    pdfSha256: b, enclosureManifestSha256: c,
    intakeSha256: debtValidationIntakeSha256(i),
    recipientAddress: address,
    noticeDocumentId: "notice-1", noticeSha256: a, noticeVersion: 1,
  };
}
function args() {
  const i = intake();
  return {
    ownerId: "owner-1", matterId: "matter-1", intake: i,
    reviewedPdfSha256: b, trustedNotice: trustedNotice(), packet: packet(i),
  };
}

test("debt-validation approval: exact confirmed notice and reviewed PDF pass checkout binding", () => {
  const request = args();
  const binding = createDebtValidationApprovalBinding(request);
  assert.equal(binding.pdfSha256, b);
  assert.equal(binding.noticeDocumentId, "notice-1");
  assert.doesNotThrow(() => assertDebtValidationCheckoutBinding({
    ownerId: request.ownerId, matterId: request.matterId,
    binding: JSON.parse(JSON.stringify(binding)),
    trustedNotice: request.trustedNotice, packet: request.packet,
  }));
});

test("debt-validation approval: unconfirmed or altered recipient fails before checkout", () => {
  for (const change of [
    (x: ReturnType<typeof args>) => { x.intake.recipientConfirmed = false; },
    (x: ReturnType<typeof args>) => { x.intake.collectorResponseAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (x: ReturnType<typeof args>) => { x.packet.recipientAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (x: ReturnType<typeof args>) => { x.intake.confirmedRecipientAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
  ]) {
    const request = args();
    change(request);
    assert.throws(() => createDebtValidationApprovalBinding(request), /debt_validation_/);
  }
});

test("debt-validation approval: client-forged notice address cannot replace trusted owner-scoped source", () => {
  const request = args();
  const forged = "Example Collections\nPO Box 999\nAustin, TX 78701";
  request.intake.collectorResponseAddress = forged;
  request.intake.noticeResponseAddress = forged;
  request.intake.confirmedRecipientAddress = forged;
  request.packet.recipientAddress = forged;
  request.packet.intakeSha256 = debtValidationIntakeSha256(request.intake);
  assert.throws(() => createDebtValidationApprovalBinding(request), /recipient_changed|notice_or_recipient_mismatch/);
});

test("debt-validation approval: changed intake, source version, and reviewed PDF fail closed", () => {
  const changes = [
    (x: ReturnType<typeof args>) => { x.intake.disputeExplanation = "I dispute the whole balance."; },
    (x: ReturnType<typeof args>) => { x.trustedNotice.sha256 = d; },
    (x: ReturnType<typeof args>) => { x.trustedNotice.version = 2; },
    (x: ReturnType<typeof args>) => { x.reviewedPdfSha256 = d; },
    (x: ReturnType<typeof args>) => { x.trustedNotice.mailingAddressVerified = false; },
    (x: ReturnType<typeof args>) => { x.trustedNotice.ownerId = "another-owner"; },
  ];
  for (const change of changes) {
    const request = args();
    change(request);
    assert.throws(() => createDebtValidationApprovalBinding(request), /debt_validation_/);
  }
});

test("debt-validation checkout: changed notice, recipient, packet, manifest, revision or approval blocks", () => {
  const request = args();
  const original = createDebtValidationApprovalBinding(request);
  const changes = [
    (x: ReturnType<typeof args>, binding: typeof original) => { x.trustedNotice.sha256 = d; },
    (x: ReturnType<typeof args>, binding: typeof original) => { x.trustedNotice.documentId = "replacement"; },
    (x: ReturnType<typeof args>, binding: typeof original) => { x.packet.recipientAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (x: ReturnType<typeof args>, binding: typeof original) => { x.packet.pdfSha256 = d; },
    (x: ReturnType<typeof args>, binding: typeof original) => { x.packet.enclosureManifestSha256 = d; },
    (x: ReturnType<typeof args>, binding: typeof original) => { x.packet.intakeSha256 = d; },
    (x: ReturnType<typeof args>, binding: typeof original) => { x.packet.matterVersion = 3; },
    (x: ReturnType<typeof args>, binding: typeof original) => { binding.recipientAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (x: ReturnType<typeof args>, binding: typeof original) => { binding.pdfSha256 = d; },
  ];
  for (const change of changes) {
    const current = args();
    const binding = { ...original };
    change(current, binding);
    assert.throws(() => assertDebtValidationCheckoutBinding({
      ownerId: current.ownerId, matterId: current.matterId,
      binding, trustedNotice: current.trustedNotice, packet: current.packet,
    }), /debt_validation_/);
  }
});

test("debt-validation: rejected approval and checkout never call mocked providers", async () => {
  let stripeCalls = 0;
  let lobCalls = 0;
  const mockedCheckout = async () => { stripeCalls++; lobCalls++; };
  const candidates = [
    (x: ReturnType<typeof args>) => { x.intake.recipientConfirmed = false; },
    (x: ReturnType<typeof args>) => { x.intake.noticeSha256 = d; },
    (x: ReturnType<typeof args>) => { x.trustedNotice.responseMailingAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
  ];
  for (const change of candidates) {
    const request = args();
    change(request);
    try {
      const binding = createDebtValidationApprovalBinding(request);
      assertDebtValidationCheckoutBinding({ ...request, binding });
      await mockedCheckout();
    } catch (error) {
      assert.match(String(error), /debt_validation_/);
    }
  }
  assert.equal(stripeCalls, 0);
  assert.equal(lobCalls, 0);
});

test("debt-validation approval: printable mailing-address edits invalidate the reviewed intake", () => {
  const original = args();
  const originalLetter = draftDebtValidationLetter(original.intake, "2026-10-30");
  const originalDigest = debtValidationIntakeSha256(original.intake);

  for (const change of [
    { consumerMailingAddress: "123 EXAMPLE ST\nSACRAMENTO, CA 95814" },
    { collectorResponseAddress: "EXAMPLE COLLECTIONS\nPO BOX 456\nAUSTIN, TX 78701" },
  ]) {
    const edited = { ...original.intake, ...change };
    assert.notEqual(draftDebtValidationLetter(edited, "2026-10-30"), originalLetter);
    assert.notEqual(debtValidationIntakeSha256(edited), originalDigest,
      "The approval digest must change when the printable letter changes");
    assert.throws(() => createDebtValidationApprovalBinding({
      ...original, intake: edited,
    }), /debt_validation_intake_changed/);
  }
});
