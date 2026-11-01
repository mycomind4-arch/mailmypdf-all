import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  draftDebtValidationEnvelopeAddress,
  draftDebtValidationLetter,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../domain";
import {
  assertDebtValidationCheckoutBinding,
  createDebtValidationApprovalBinding,
  debtValidationIntakeSha256,
  type DebtValidationPacketSnapshot,
  type TrustedDebtValidationNotice,
} from "../server-approval-binding";
import {
  checkoutDebtValidationMatter,
  type DebtValidationMatterRepository,
} from "../server-matter-approval";

const ownerId = "synthetic-owner";
const matterId = "synthetic-matter";
const noticeSha = "a".repeat(64);
const pdfBytes = new TextEncoder().encode("%PDF-1.4\nSynthetic reviewed letter\n%%EOF");
const pdfSha = createHash("sha256").update(pdfBytes).digest("hex");
const recipient = "Example Collections\nPO Box 456\nAustin, TX 78701";
const fiveLineReturn = "Unit 1\nUnit 2\nUnit 3\n123 Example St\nSacramento, CA 95814";
const sixLineReturnWithName = "Synthetic Consumer\n" + fiveLineReturn;
const sixLineReturnWithoutName = "Unit 0\n" + fiveLineReturn;

function intake(consumerMailingAddress: string): DebtValidationIntake {
  return {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress,
    collectorName: "Example Collections",
    collectorResponseAddress: recipient,
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "I dispute the amount shown on this notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "notice-1",
    noticeSha256: noticeSha,
    noticeVersion: 1,
    noticeResponseAddress: recipient,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: recipient,
    confirmedNoticeSha256: noticeSha,
    confirmedNoticeDocumentId: "notice-1",
    confirmedNoticeVersion: 1,
  };
}

const trustedNotice: TrustedDebtValidationNotice = {
  ownerId, matterId, documentId: "notice-1", sha256: noticeSha,
  version: 1, responseMailingAddress: recipient, mailingAddressVerified: true,
};

function packet(currentIntake: DebtValidationIntake): DebtValidationPacketSnapshot {
  return {
    ownerId, matterId, matterVersion: 1,
    totalCents: 1499, mailClass: "certified",
    pdfSha256: pdfSha, enclosureManifestSha256: "b".repeat(64),
    intakeSha256: debtValidationIntakeSha256(currentIntake),
    recipientAddress: recipient,
    noticeDocumentId: "notice-1", noticeSha256: noticeSha, noticeVersion: 1,
  };
}

test("debt-validation: reviewed return envelope includes consumer once and stays within six lines", () => {
  for (const address of [fiveLineReturn, sixLineReturnWithName]) {
    const currentIntake = intake(address);
    assert.deepEqual(validateDebtValidationIntake(currentIntake), []);
    const envelope = draftDebtValidationEnvelopeAddress(currentIntake);
    assert.equal(envelope.returnAddress.split("\n").length, 6);
    assert.equal(envelope.returnAddress.split("\n")[0], "Synthetic Consumer");
    assert.equal(envelope.returnAddress.match(/Synthetic Consumer/g)?.length, 1);
    const letter = draftDebtValidationLetter(currentIntake, "2026-10-30");
    assert.doesNotMatch(letter, /Synthetic Consumer\nSynthetic Consumer/);
    const approved = createDebtValidationApprovalBinding({
      ownerId, matterId, intake: currentIntake, trustedNotice,
      packet: packet(currentIntake), reviewedPdfSha256: pdfSha,
    });
    assert.equal(approved.pdfSha256, pdfSha);
  }
});

test("debt-validation: derived seven-line return destination fails before approval or provider handoff", async () => {
  const valid = intake(fiveLineReturn);
  const validPacket = packet(valid);
  const binding = createDebtValidationApprovalBinding({
    ownerId, matterId, intake: valid, trustedNotice,
    packet: validPacket, reviewedPdfSha256: pdfSha,
  });
  const changed = intake(sixLineReturnWithoutName);
  assert.ok(validateDebtValidationIntake(changed).some((issue) => issue.code === "invalid_envelope"));
  assert.throws(() => draftDebtValidationEnvelopeAddress(changed), /invalid_envelope/);
  assert.throws(() => draftDebtValidationLetter(changed, "2026-10-30"), /invalid_envelope/);
  assert.throws(() => createDebtValidationApprovalBinding({
    ownerId, matterId, intake: changed, trustedNotice,
    packet: validPacket, reviewedPdfSha256: pdfSha,
  }), /debt_validation_invalid_intake/);
  assert.throws(() => assertDebtValidationCheckoutBinding({
    ownerId, matterId, binding, trustedNotice, packet: validPacket,
    currentIntake: changed,
  }), /debt_validation_stale_intake/);

  let claims = 0;
  let providerSubmissions = 0;
  const repository: DebtValidationMatterRepository = {
    async loadCurrent() {
      return { currentIntake: changed, trustedNotice, packet: validPacket };
    },
    async loadPacketPdfBytes() { return pdfBytes.slice(); },
    async loadApproval() { return binding; },
    async persistApproval() { throw new Error("approval must not persist"); },
    async claimCheckout() {
      claims++;
      throw new Error("checkout must not be claimed");
    },
  };
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId, matterId, repository,
    checkout: async () => { providerSubmissions++; return "pending"; },
  }), /debt_validation_stale_intake/);
  assert.equal(claims, 0);
  assert.equal(providerSubmissions, 0);
});
