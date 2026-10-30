import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { generatePlainTextPdf } from "@mailmypdf/packet-builder";
import type { DebtValidationIntake } from "../domain";
import {
  assertDebtValidationCheckoutBinding,
  debtValidationIntakeSha256,
  type DebtValidationApprovalBinding,
} from "../server-approval-binding";
import {
  approveDebtValidationMatter,
  assertDebtValidationApprovalCommit,
  assertDebtValidationPersistedPdf,
  checkoutDebtValidationMatter,
  type DebtValidationMatterRepository,
  type DebtValidationMatterSnapshot,
} from "../server-matter-approval";
import { prepareDebtValidationMatterPacket } from "../server-packet-preparation";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const recipient = "Example Collections\nPO Box 456\nAustin, TX 78701";
const alternate = "Example Collections\nPO Box 999\nAustin, TX 78701";

async function preparedStore() {
  // Actual synthetic source PDF -> actual generated letter PDF -> persisted
  // owner-scoped matter -> approval -> atomic checkout claim. No providers.
  const sourceBytes = await generatePlainTextPdf("Synthetic collector notice; reply to PO Box 456.");
  const sourceSha = digest(sourceBytes);
  const intake: DebtValidationIntake = {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: "Example Collections",
    collectorResponseAddress: recipient,
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "I dispute the balance stated in the notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "synthetic-notice-1",
    noticeSha256: sourceSha,
    noticeVersion: 1,
    noticeResponseAddress: recipient,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: recipient,
    confirmedNoticeSha256: sourceSha,
    confirmedNoticeDocumentId: "synthetic-notice-1",
    confirmedNoticeVersion: 1,
  };
  const trustedNotice = {
    ownerId: "owner-1",
    matterId: "matter-1",
    documentId: "synthetic-notice-1",
    sha256: sourceSha,
    version: 1,
    responseMailingAddress: recipient,
    mailingAddressVerified: true,
  };
  const prepared = await prepareDebtValidationMatterPacket({
    ownerId: "owner-1", matterId: "matter-1", matterVersion: 2,
    totalCents: 2993, mailClass: "certified", letterDate: "2026-10-30",
    intake, trustedNotice, noticePdfBytes: sourceBytes,
  });
  const state: {
    snapshot: DebtValidationMatterSnapshot;
    pdfBytes: Uint8Array;
    approval: DebtValidationApprovalBinding | null;
    claimKey: string | null;
    approvalWrites: number;
    orderClaims: number;
  } = {
    snapshot: { currentIntake: intake, trustedNotice, packet: prepared.packet },
    pdfBytes: prepared.pdfBytes,
    approval: null, claimKey: null, approvalWrites: 0, orderClaims: 0,
  };
  const repository: DebtValidationMatterRepository = {
    async loadCurrent(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return structuredClone(state.snapshot);
    },
    async loadPacketPdfBytes(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return state.pdfBytes.slice();
    },
    async persistApproval(ownerId, matterId, binding, expectedMatterVersion) {
      assert.equal(expectedMatterVersion, state.snapshot.packet.matterVersion);
      // Emulate the mandatory SAME-transaction checks on fresh stored state.
      assertDebtValidationApprovalCommit({
        ownerId, matterId, binding, current: state.snapshot,
      });
      assertDebtValidationPersistedPdf(state.pdfBytes, state.snapshot.packet.pdfSha256);
      state.approval = structuredClone(binding);
      state.approvalWrites++;
    },
    async loadApproval(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return state.approval ? structuredClone(state.approval) : null;
    },
    async claimCheckout(ownerId, matterId, verified) {
      assert.equal(verified.expectedMatterVersion, state.snapshot.packet.matterVersion);
      assert.deepEqual(verified.binding, state.approval);
      assertDebtValidationCheckoutBinding({
        ownerId, matterId, binding: verified.binding,
        trustedNotice: state.snapshot.trustedNotice,
        currentIntake: state.snapshot.currentIntake,
        packet: state.snapshot.packet,
      });
      assertDebtValidationPersistedPdf(state.pdfBytes, state.snapshot.packet.pdfSha256);
      if (state.claimKey && state.claimKey !== verified.idempotencyKey) {
        throw new Error("debt_validation_conflicting_order_claim");
      }
      const fresh = !state.claimKey;
      if (fresh) {
        state.claimKey = verified.idempotencyKey;
        state.orderClaims++;
      }
      return {
        ownerId, matterId, idempotencyKey: verified.idempotencyKey,
        pdfSha256: verified.binding.pdfSha256,
        matterVersion: verified.binding.matterVersion,
        status: fresh ? "claimed" as const : "reused" as const,
      };
    },
  };
  return { state, repository, prepared };
}

test("full offline debt-validation journey: real generated PDF, exact approval, one mocked checkout and read-only retry", async () => {
  const { state, repository, prepared } = await preparedStore();
  assert.equal(digest(prepared.pdfBytes), prepared.packet.pdfSha256);
  const approved = await approveDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", repository,
    reviewedPdfSha256: prepared.packet.pdfSha256, userApprovedExactPacket: true,
  });
  assert.equal(approved.pdfSha256, digest(prepared.pdfBytes));
  let providerCalls = 0;
  let receiptReads = 0;
  const checkout = async () => { providerCalls++; return "synthetic-receipt"; };
  const replayCheckout = async () => { receiptReads++; return "synthetic-receipt"; };
  for (let i = 0; i < 2; i++) {
    assert.equal(await checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository, checkout, replayCheckout,
    }), "synthetic-receipt");
  }
  assert.equal(state.approvalWrites, 1);
  assert.equal(state.orderClaims, 1);
  assert.equal(providerCalls, 1, "retry must not submit payment or physical mail again");
  assert.equal(receiptReads, 1, "retry may only read a persisted receipt");
});

test("full offline debt-validation journey: notice/recipient/PDF changes fail before any provider handoff", async () => {
  const changes: Array<[string, (state: Awaited<ReturnType<typeof preparedStore>>["state"]) => void]> = [
    ["recipient confirmation revoked", (state) => {
      state.snapshot.currentIntake.recipientConfirmed = false;
    }],
    ["recipient replaced after approval", (state) => {
      const intake = state.snapshot.currentIntake;
      intake.collectorResponseAddress = alternate;
      intake.noticeResponseAddress = alternate;
      intake.confirmedRecipientAddress = alternate;
      state.snapshot.trustedNotice.responseMailingAddress = alternate;
      state.snapshot.packet.recipientAddress = alternate;
      state.snapshot.packet.intakeSha256 = debtValidationIntakeSha256(intake);
    }],
    ["controlling notice replaced after approval", (state) => {
      const newSha = "a".repeat(64);
      const intake = state.snapshot.currentIntake;
      intake.noticeSha256 = newSha;
      intake.confirmedNoticeSha256 = newSha;
      state.snapshot.trustedNotice.sha256 = newSha;
      state.snapshot.packet.noticeSha256 = newSha;
      state.snapshot.packet.intakeSha256 = debtValidationIntakeSha256(intake);
    }],
    ["persisted PDF bytes replaced", (state) => {
      state.pdfBytes = new TextEncoder().encode("not the approved PDF");
    }],
  ];
  for (const [name, mutate] of changes) {
    const { state, repository, prepared } = await preparedStore();
    await approveDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository,
      reviewedPdfSha256: prepared.packet.pdfSha256, userApprovedExactPacket: true,
    });
    mutate(state);
    let stripeCalls = 0;
    let lobCalls = 0;
    await assert.rejects(checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository,
      checkout: async () => { stripeCalls++; lobCalls++; return "should-not-submit"; },
    }), /debt_validation_/, name);
    assert.equal(state.orderClaims, 0, name + ": no durable order claim");
    assert.equal(stripeCalls, 0, name + ": zero mocked Stripe submissions");
    assert.equal(lobCalls, 0, name + ": zero mocked Lob submissions");
  }
});
