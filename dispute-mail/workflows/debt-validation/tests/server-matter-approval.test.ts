import assert from "node:assert/strict";
import test from "node:test";
import {
  approveDebtValidationMatter,
  checkoutDebtValidationMatter,
  type DebtValidationMatterRepository,
  type DebtValidationMatterSnapshot,
} from "../server-matter-approval";
import {
  debtValidationIntakeSha256,
  type DebtValidationApprovalBinding,
} from "../server-approval-binding";
import type { DebtValidationIntake } from "../domain";

const a = "a".repeat(64);
const b = "b".repeat(64);
const c = "c".repeat(64);
const d = "d".repeat(64);
const address = "Example Collections\nPO Box 456\nAustin, TX 78701";

function fixture(): DebtValidationMatterSnapshot {
  const currentIntake: DebtValidationIntake = {
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
  return {
    currentIntake,
    trustedNotice: {
      ownerId: "owner-1", matterId: "matter-1", documentId: "notice-1",
      sha256: a, version: 1, responseMailingAddress: address,
      mailingAddressVerified: true,
    },
    packet: {
      ownerId: "owner-1", matterId: "matter-1", matterVersion: 2,
      pdfSha256: b, enclosureManifestSha256: c,
      intakeSha256: debtValidationIntakeSha256(currentIntake),
      recipientAddress: address,
      noticeDocumentId: "notice-1", noticeSha256: a, noticeVersion: 1,
    },
  };
}

function fakeStore() {
  const state: {
    snapshot: DebtValidationMatterSnapshot | null;
    approval: DebtValidationApprovalBinding | null;
    saves: number;
  } = { snapshot: fixture(), approval: null, saves: 0 };
  const repository: DebtValidationMatterRepository = {
    async loadCurrent(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return state.snapshot ? structuredClone(state.snapshot) : null;
    },
    async persistApproval(ownerId, matterId, binding, expectedMatterVersion) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      if (!state.snapshot || state.snapshot.packet.matterVersion !== expectedMatterVersion) {
        throw new Error("debt_validation_concurrent_change");
      }
      state.approval = structuredClone(binding);
      state.saves++;
    },
    async loadApproval(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return state.approval ? structuredClone(state.approval) : null;
    },
  };
  return { state, repository };
}

test("debt-validation matter: confirmed exact reviewed packet persists and uses stable checkout idempotency", async () => {
  const { state, repository } = fakeStore();
  const binding = await approveDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b, repository,
  });
  assert.equal(state.saves, 1);
  assert.equal(binding.pdfSha256, b);
  const keys: string[] = [];
  const checkout = async (verified: { idempotencyKey: string; expectedMatterVersion: number }) => {
    keys.push(verified.idempotencyKey);
    assert.equal(verified.expectedMatterVersion, 2);
    return "mock-checkout";
  };
  for (let i = 0; i < 2; i++) {
    assert.equal(await checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository, checkout,
    }), "mock-checkout");
  }
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1], "Retries must use one stable provider idempotency key");
  assert.match(keys[0]!, /^debt_validation_checkout_[a-f0-9]{64}$/);
});

test("debt-validation matter: absent state, unconfirmed recipient and mismatched reviewed PDF never persist", async () => {
  for (const mutate of [
    (state: ReturnType<typeof fakeStore>["state"]) => { state.snapshot = null; },
    (state: ReturnType<typeof fakeStore>["state"]) => { state.snapshot!.currentIntake.recipientConfirmed = false; },
    (state: ReturnType<typeof fakeStore>["state"]) => {
      state.snapshot!.currentIntake.collectorResponseAddress = "Example Collections\nPO Box 999\nAustin, TX 78701";
    },
    (state: ReturnType<typeof fakeStore>["state"]) => { state.snapshot!.trustedNotice.sha256 = d; },
    (state: ReturnType<typeof fakeStore>["state"]) => { state.snapshot!.trustedNotice.mailingAddressVerified = false; },
  ]) {
    const { state, repository } = fakeStore();
    mutate(state);
    await assert.rejects(approveDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b, repository,
    }), /debt_validation_/);
    assert.equal(state.saves, 0);
  }
  const { state, repository } = fakeStore();
  await assert.rejects(approveDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: d, repository,
  }), /debt_validation_unreviewed_packet/);
  assert.equal(state.saves, 0);
});

test("debt-validation matter: every stale checkout fails before mocked Stripe or Lob submission", async () => {
  const mutations = [
    (s: DebtValidationMatterSnapshot) => { s.currentIntake.recipientConfirmed = false; },
    (s: DebtValidationMatterSnapshot) => { s.currentIntake.disputeExplanation = "Changed after approval."; },
    (s: DebtValidationMatterSnapshot) => { s.currentIntake.collectorResponseAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (s: DebtValidationMatterSnapshot) => { s.currentIntake.noticeDocumentId = "replacement"; },
    (s: DebtValidationMatterSnapshot) => { s.trustedNotice.sha256 = d; },
    (s: DebtValidationMatterSnapshot) => { s.trustedNotice.responseMailingAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (s: DebtValidationMatterSnapshot) => { s.packet.pdfSha256 = d; },
    (s: DebtValidationMatterSnapshot) => { s.packet.enclosureManifestSha256 = d; },
    (s: DebtValidationMatterSnapshot) => { s.packet.matterVersion++; },
  ];
  let stripeCalls = 0;
  let lobCalls = 0;
  for (const mutate of mutations) {
    const { state, repository } = fakeStore();
    await approveDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b, repository,
    });
    mutate(state.snapshot!);
    await assert.rejects(checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository,
      checkout: async () => { stripeCalls++; lobCalls++; },
    }), /debt_validation_/);
  }
  assert.equal(stripeCalls, 0);
  assert.equal(lobCalls, 0);
});

test("debt-validation matter: no stored approval or no current snapshot blocks checkout", async () => {
  const { state, repository } = fakeStore();
  let providerCalls = 0;
  const checkout = async () => { providerCalls++; };
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", repository, checkout,
  }), /debt_validation_approval_missing/);
  await approveDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b, repository,
  });
  state.snapshot = null;
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", repository, checkout,
  }), /debt_validation_missing_trusted_state/);
  assert.equal(providerCalls, 0);
});

test("debt-validation matter: optimistic matter revision conflict prevents durable approval", async () => {
  const { state, repository } = fakeStore();
  const originalLoad = repository.loadCurrent;
  repository.loadCurrent = async (ownerId, matterId) => {
    const result = await originalLoad(ownerId, matterId);
    state.snapshot!.packet.matterVersion++;
    return result;
  };
  await assert.rejects(approveDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b, repository,
  }), /debt_validation_concurrent_change/);
  assert.equal(state.saves, 0);
});

test("debt-validation matter: explicit exact-packet approval is required before any durable approval", async () => {
  for (const approvalSignal of [undefined, false, "true", 1]) {
    const { state, repository } = fakeStore();
    const explicitApproval = approvalSignal === undefined ? {} : { userApprovedExactPacket: approvalSignal };
    await assert.rejects(
      approveDebtValidationMatter({
        ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b,
        repository, ...explicitApproval,
      }),
      /debt_validation_explicit_approval_required/,
      "a reviewed PDF hash alone is not an explicit instruction to approve mailing",
    );
    assert.equal(state.saves, 0, "unconfirmed requests must never persist approval");
  }
});
