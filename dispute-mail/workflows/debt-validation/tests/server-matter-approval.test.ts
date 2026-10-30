import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  approveDebtValidationMatter,
  assertDebtValidationApprovalCommit,
  assertDebtValidationPersistedPdf,
  checkoutDebtValidationMatter,
  type DebtValidationMatterRepository,
  type DebtValidationMatterSnapshot,
} from "../server-matter-approval";
import {
  assertDebtValidationCheckoutBinding,
  debtValidationIntakeSha256,
  type DebtValidationApprovalBinding,
} from "../server-approval-binding";
import type { DebtValidationIntake } from "../domain";

const a = "a".repeat(64);
// Synthetic persisted packet bytes; this test checks identity, not PDF parsing.
const reviewedPdfBytes = new TextEncoder().encode("%PDF-1.4\\nSynthetic reviewed letter\\n%%EOF");
const b = createHash("sha256").update(reviewedPdfBytes).digest("hex");
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
      totalCents: 1499, mailClass: "certified",
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
    claims: number;
    claimedKey: string | null;
    pdfBytes: Uint8Array | null;
  } = { snapshot: fixture(), approval: null, saves: 0, claims: 0, claimedKey: null, pdfBytes: reviewedPdfBytes.slice() };
  const repository: DebtValidationMatterRepository = {
    async loadCurrent(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return state.snapshot ? structuredClone(state.snapshot) : null;
    },
    async loadPacketPdfBytes(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return state.pdfBytes?.slice() ?? null;
    },
    async persistApproval(ownerId, matterId, binding, expectedMatterVersion) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      if (!state.snapshot || state.snapshot.packet.matterVersion !== expectedMatterVersion) {
        throw new Error("debt_validation_concurrent_change");
      }
      // Emulate a fresh, owner-scoped read and exact binding comparison inside
      // the same transaction that inserts the approval. No version bump alone
      // is assumed to protect recipient, notice or PDF changes.
      assertDebtValidationApprovalCommit({
        ownerId, matterId, binding, current: state.snapshot,
      });
      assertDebtValidationPersistedPdf(state.pdfBytes, state.snapshot.packet.pdfSha256);
      state.approval = structuredClone(binding);
      state.saves++;
    },
    async loadApproval(ownerId, matterId) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      return state.approval ? structuredClone(state.approval) : null;
    },
    async claimCheckout(ownerId, matterId, verified) {
      assert.equal(ownerId, "owner-1");
      assert.equal(matterId, "matter-1");
      const { binding, expectedMatterVersion, idempotencyKey } = verified;
      if (!state.snapshot || !state.approval
        || state.snapshot.packet.matterVersion !== expectedMatterVersion
        || JSON.stringify(state.approval) !== JSON.stringify(binding)) {
        throw new Error("debt_validation_concurrent_checkout_change");
      }
      // Simulate one atomic owner-scoped DB transaction at the durable order
      // claim, not a second check against the caller's stale snapshot.
      assertDebtValidationCheckoutBinding({
        ownerId, matterId, binding,
        trustedNotice: state.snapshot.trustedNotice,
        currentIntake: state.snapshot.currentIntake,
        packet: state.snapshot.packet,
      });
      assertDebtValidationPersistedPdf(state.pdfBytes, state.snapshot.packet.pdfSha256);
      if (state.claimedKey && state.claimedKey !== idempotencyKey) {
        throw new Error("debt_validation_conflicting_checkout_claim");
      }
      const newlyClaimed = !state.claimedKey;
      if (newlyClaimed) {
        state.claimedKey = idempotencyKey;
        state.claims++;
      }
      return {
        ownerId, matterId, idempotencyKey,
        pdfSha256: binding.pdfSha256,
        matterVersion: binding.matterVersion,
        status: newlyClaimed ? "claimed" as const : "reused" as const,
      };
    },
  };
  return { state, repository };
}

test("debt-validation matter: confirmed exact reviewed packet persists and uses stable checkout idempotency", async () => {
  const { state, repository } = fakeStore();
  const binding = await approveDebtValidationMatter({ userApprovedExactPacket: true,
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
  assert.equal(state.claims, 1, "Retries must reuse the same durable order claim");
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
    await assert.rejects(approveDebtValidationMatter({ userApprovedExactPacket: true,
      ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b, repository,
    }), /debt_validation_/);
    assert.equal(state.saves, 0);
  }
  const { state, repository } = fakeStore();
  await assert.rejects(approveDebtValidationMatter({ userApprovedExactPacket: true,
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
    (s: DebtValidationMatterSnapshot) => { s.packet.totalCents = 1999; },
    (s: DebtValidationMatterSnapshot) => { s.packet.mailClass = "registered"; },
    (s: DebtValidationMatterSnapshot) => { s.packet.matterVersion++; },
  ];
  let stripeCalls = 0;
  let lobCalls = 0;
  for (const mutate of mutations) {
    const { state, repository } = fakeStore();
    await approveDebtValidationMatter({ userApprovedExactPacket: true,
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
  await approveDebtValidationMatter({ userApprovedExactPacket: true,
    ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b, repository,
  });
  state.snapshot = null;
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", repository, checkout,
  }), /debt_validation_missing_trusted_state/);
  assert.equal(providerCalls, 0);
});

test("debt-validation matter: same-version notice or packet edits during approval fail closed", async () => {
  const mutations: Array<(snapshot: DebtValidationMatterSnapshot) => void> = [
    (snapshot) => { snapshot.currentIntake.recipientConfirmed = false; },
    (snapshot) => { snapshot.currentIntake.collectorResponseAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (snapshot) => { snapshot.currentIntake.disputeExplanation = "Changed after review."; },
    (snapshot) => { snapshot.trustedNotice.sha256 = d; },
    (snapshot) => { snapshot.trustedNotice.responseMailingAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (snapshot) => { snapshot.packet.recipientAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (snapshot) => { snapshot.packet.pdfSha256 = d; },
    (snapshot) => { snapshot.packet.enclosureManifestSha256 = d; },
    (snapshot) => { snapshot.packet.totalCents = 1999; },
    (snapshot) => { snapshot.packet.mailClass = "registered"; },
  ];
  let paymentCalls = 0;
  let mailingCalls = 0;
  for (const mutate of mutations) {
    const { state, repository } = fakeStore();
    const load = repository.loadCurrent;
    repository.loadCurrent = async (ownerId, matterId) => {
      const reviewed = await load(ownerId, matterId);
      mutate(state.snapshot!); // Same matterVersion, but state changed before atomic persist.
      return reviewed;
    };
    await assert.rejects(approveDebtValidationMatter({
      userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
      reviewedPdfSha256: b, repository,
    }), /debt_validation_/);
    assert.equal(state.saves, 0, "A stale binding must never be persisted");
    assert.equal(state.approval, null);
    assert.equal(state.snapshot!.packet.matterVersion, 2, "Regression does not rely on a version bump");
    // Checkout is not reachable without a persisted approval.
    await assert.rejects(checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository,
      checkout: async () => { paymentCalls++; mailingCalls++; },
    }), /debt_validation_approval_missing/);
  }
  assert.equal(paymentCalls, 0);
  assert.equal(mailingCalls, 0);
});

test("debt-validation matter: optimistic matter revision conflict prevents durable approval", async () => {
  const { state, repository } = fakeStore();
  const originalLoad = repository.loadCurrent;
  repository.loadCurrent = async (ownerId, matterId) => {
    const result = await originalLoad(ownerId, matterId);
    state.snapshot!.packet.matterVersion++;
    return result;
  };
  await assert.rejects(approveDebtValidationMatter({ userApprovedExactPacket: true,
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

test("debt-validation matter: atomic claim rejects edits between preflight and provider handoff", async () => {
  const changes: Array<(state: ReturnType<typeof fakeStore>["state"]) => void> = [
    (state) => { state.snapshot!.currentIntake.disputeExplanation = "Edited during checkout."; },
    (state) => { state.snapshot!.trustedNotice.responseMailingAddress = "Example Collections\nPO Box 999\nAustin, TX 78701"; },
    (state) => { state.snapshot!.packet.pdfSha256 = d; },
    (state) => { state.snapshot!.packet.matterVersion++; },
    (state) => { state.approval!.pdfSha256 = d; },
  ];
  let paymentCalls = 0;
  let mailingCalls = 0;
  for (const change of changes) {
    const { state, repository } = fakeStore();
    await approveDebtValidationMatter({
      userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
      reviewedPdfSha256: b, repository,
    });
    const load = repository.loadCurrent;
    repository.loadCurrent = async (ownerId, matterId) => {
      const preflight = await load(ownerId, matterId);
      change(state); // A concurrent edit AFTER the preflight snapshot was read.
      return preflight;
    };
    await assert.rejects(checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository,
      checkout: async () => { paymentCalls++; mailingCalls++; },
    }), /debt_validation_/);
    assert.equal(state.claims, 0, "A stale packet must not reserve an order");
  }
  assert.equal(paymentCalls, 0, "No mocked payment submission after a concurrent edit");
  assert.equal(mailingCalls, 0, "No mocked mailing submission after a concurrent edit");
});


test("debt-validation matter: atomic guards reject a fully readdressed valid notice without a version bump", async () => {
  const changedAddress = "Example Collections\nPO Box 999\nAustin, TX 78701";
  const changeAddress = (snapshot: DebtValidationMatterSnapshot) => {
    // All records are internally consistent and both postal addresses are valid.
    // Only the previously reviewed/approved binding is stale.
    snapshot.trustedNotice.responseMailingAddress = changedAddress;
    snapshot.currentIntake.collectorResponseAddress = changedAddress;
    snapshot.currentIntake.noticeResponseAddress = changedAddress;
    snapshot.currentIntake.confirmedRecipientAddress = changedAddress;
    snapshot.packet.recipientAddress = changedAddress;
    snapshot.packet.intakeSha256 = debtValidationIntakeSha256(snapshot.currentIntake);
    assert.equal(snapshot.packet.matterVersion, 2);
  };

  {
    const { state, repository } = fakeStore();
    const load = repository.loadCurrent;
    repository.loadCurrent = async (ownerId, matterId) => {
      const previouslyReviewed = await load(ownerId, matterId);
      changeAddress(state.snapshot!); // Concurrent update before atomic approval insert.
      return previouslyReviewed;
    };
    await assert.rejects(approveDebtValidationMatter({
      userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
      reviewedPdfSha256: b, repository,
    }), /debt_validation_concurrent_approval_change/);
    assert.equal(state.saves, 0);
    assert.equal(state.approval, null);
  }

  {
    const { state, repository } = fakeStore();
    await approveDebtValidationMatter({
      userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
      reviewedPdfSha256: b, repository,
    });
    const load = repository.loadCurrent;
    repository.loadCurrent = async (ownerId, matterId) => {
      const preflight = await load(ownerId, matterId);
      changeAddress(state.snapshot!); // Concurrent update before atomic checkout claim.
      return preflight;
    };
    let stripeCalls = 0;
    let lobCalls = 0;
    await assert.rejects(checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository,
      checkout: async () => { stripeCalls++; lobCalls++; },
    }), /debt_validation_/);
    assert.equal(state.claims, 0);
    assert.equal(stripeCalls, 0);
    assert.equal(lobCalls, 0);
  }
});

test("debt-validation matter: missing or altered stored PDF bytes fail closed before approval or checkout", async () => {
  let stripeCalls = 0;
  let lobCalls = 0;
  for (const replacement of [null, new TextEncoder().encode("%PDF-1.4\\nChanged letter\\n%%EOF")]) {
    const beforeApproval = fakeStore();
    beforeApproval.state.pdfBytes = replacement;
    await assert.rejects(approveDebtValidationMatter({
      userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
      reviewedPdfSha256: b, repository: beforeApproval.repository,
    }), /debt_validation_persisted_pdf_changed/);
    assert.equal(beforeApproval.state.saves, 0);

    const beforeCheckout = fakeStore();
    await approveDebtValidationMatter({
      userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
      reviewedPdfSha256: b, repository: beforeCheckout.repository,
    });
    beforeCheckout.state.pdfBytes = replacement;
    await assert.rejects(checkoutDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", repository: beforeCheckout.repository,
      checkout: async () => { stripeCalls++; lobCalls++; },
    }), /debt_validation_persisted_pdf_changed/);
    assert.equal(beforeCheckout.state.claims, 0);
  }
  assert.equal(stripeCalls, 0);
  assert.equal(lobCalls, 0);
});

test("debt-validation matter: same-version PDF replacement during atomic approval or claim is rejected", async () => {
  const changed = new TextEncoder().encode("%PDF-1.4\\nConcurrent replacement\\n%%EOF");
  const beforeApproval = fakeStore();
  const originalApprovalLoad = beforeApproval.repository.loadPacketPdfBytes;
  beforeApproval.repository.loadPacketPdfBytes = async (ownerId, matterId) => {
    const previouslyReviewed = await originalApprovalLoad(ownerId, matterId);
    beforeApproval.state.pdfBytes = changed;
    return previouslyReviewed;
  };
  await assert.rejects(approveDebtValidationMatter({
    userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
    reviewedPdfSha256: b, repository: beforeApproval.repository,
  }), /debt_validation_persisted_pdf_changed/);
  assert.equal(beforeApproval.state.saves, 0);

  const beforeCheckout = fakeStore();
  await approveDebtValidationMatter({
    userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
    reviewedPdfSha256: b, repository: beforeCheckout.repository,
  });
  const originalCheckoutLoad = beforeCheckout.repository.loadPacketPdfBytes;
  beforeCheckout.repository.loadPacketPdfBytes = async (ownerId, matterId) => {
    const previouslyReviewed = await originalCheckoutLoad(ownerId, matterId);
    beforeCheckout.state.pdfBytes = changed;
    return previouslyReviewed;
  };
  let stripeCalls = 0;
  let lobCalls = 0;
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", repository: beforeCheckout.repository,
    checkout: async () => { stripeCalls++; lobCalls++; },
  }), /debt_validation_persisted_pdf_changed/);
  assert.equal(beforeCheckout.state.claims, 0);
  assert.equal(stripeCalls, 0);
  assert.equal(lobCalls, 0);
});

test("debt-validation matter: missing or mismatched durable order-claim receipts block provider callbacks", async () => {
  const corruptions = [
    (claim: Awaited<ReturnType<DebtValidationMatterRepository["claimCheckout"]>>) => undefined,
    (claim: Awaited<ReturnType<DebtValidationMatterRepository["claimCheckout"]>>) => ({ ...claim, ownerId: "another-owner" }),
    (claim: Awaited<ReturnType<DebtValidationMatterRepository["claimCheckout"]>>) => ({ ...claim, matterId: "another-matter" }),
    (claim: Awaited<ReturnType<DebtValidationMatterRepository["claimCheckout"]>>) => ({ ...claim, idempotencyKey: "forged" }),
    (claim: Awaited<ReturnType<DebtValidationMatterRepository["claimCheckout"]>>) => ({ ...claim, pdfSha256: d }),
    (claim: Awaited<ReturnType<DebtValidationMatterRepository["claimCheckout"]>>) => ({ ...claim, matterVersion: 999 }),
    (claim: Awaited<ReturnType<DebtValidationMatterRepository["claimCheckout"]>>) => ({ ...claim, status: "unknown" }),
  ];
  let stripeCalls = 0;
  let lobCalls = 0;
  for (const corrupt of corruptions) {
    const { state, repository } = fakeStore();
    await approveDebtValidationMatter({
      ownerId: "owner-1", matterId: "matter-1", reviewedPdfSha256: b,
      userApprovedExactPacket: true, repository,
    });
    const originalClaim = repository.claimCheckout;
    repository.claimCheckout = async (ownerId, matterId, verified) =>
      corrupt(await originalClaim(ownerId, matterId, verified)) as Awaited<
        ReturnType<DebtValidationMatterRepository["claimCheckout"]>
      >;
    await assert.rejects(
      checkoutDebtValidationMatter({
        ownerId: "owner-1", matterId: "matter-1", repository,
        checkout: async () => { stripeCalls++; lobCalls++; },
      }),
      /debt_validation_checkout_claim_invalid/,
    );
    assert.equal(state.claims, 1, "The mocked repository reached its claim boundary");
  }
  assert.equal(stripeCalls, 0, "A missing or mismatched claim cannot initiate payment");
  assert.equal(lobCalls, 0, "A missing or mismatched claim cannot submit physical mail");
});


test("debt-validation matter: reused durable claim must not submit payment or mail a second time", async () => {
  const { state, repository } = fakeStore();
  await approveDebtValidationMatter({
    userApprovedExactPacket: true, ownerId: "owner-1", matterId: "matter-1",
    reviewedPdfSha256: b, repository,
  });
  let providerCalls = 0;
  const checkout = async () => {
    providerCalls++;
    return "mock-provider-submission";
  };
  assert.equal(await checkoutDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", repository, checkout,
  }), "mock-provider-submission");
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: "owner-1", matterId: "matter-1", repository, checkout,
  }), /debt_validation_checkout_replay_requires_receipt/,
  "A reused order claim cannot submit a second Stripe/Lob request without a read-only receipt path");
  assert.equal(state.claims, 1, "Only one durable order may be reserved");
  assert.equal(providerCalls, 1, "Reused claims must not invoke the side-effecting provider callback");
});
