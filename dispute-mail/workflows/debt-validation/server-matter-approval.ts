/**
 * Authenticated matter-store orchestration for debt-validation approval and
 * checkout. No HTTP route, Stripe, Lob, network call, or production adapter is
 * registered here. The caller must authenticate before supplying ownerId.
 *
 * The repository must return one consistent, owner-scoped snapshot and compare
 * its matter version atomically when persisting an approval. The checkout
 * gateway must enforce the supplied idempotency key and recheck the approved
 * snapshot at its durable order-claim boundary. These contracts are required
 * before this module may be wired to a production endpoint.
 */
import { createHash } from "node:crypto";
import type { DebtValidationIntake } from "./domain";
import {
  assertDebtValidationCheckoutBinding,
  createDebtValidationApprovalBinding,
  type DebtValidationApprovalBinding,
  type DebtValidationPacketSnapshot,
  type TrustedDebtValidationNotice,
} from "./server-approval-binding";

export interface DebtValidationMatterSnapshot {
  currentIntake: DebtValidationIntake;
  trustedNotice: TrustedDebtValidationNotice;
  packet: DebtValidationPacketSnapshot;
}

/** Durable owner-scoped checkout claim returned only after the atomic order reservation. */
export interface DebtValidationCheckoutClaim {
  ownerId: string;
  matterId: string;
  idempotencyKey: string;
  pdfSha256: string;
  matterVersion: number;
  status: "claimed" | "reused";
}

export interface DebtValidationMatterRepository {
  /** One consistent read from authenticated owner-scoped persistence. */
  loadCurrent(ownerId: string, matterId: string): Promise<DebtValidationMatterSnapshot | null>;
  /**
   * One consistent owner-scoped read of BOTH the controlling notice and
   * reviewed PDF bytes. The adapter must rehash both stored byte arrays
   * against their trusted digests before returning this review artifact.
   * Composing loadCurrent and loadPacketPdfBytes is not a consistent read:
   * the source notice could be replaced between those two queries.
   *
   * Optional for domain-only repositories; the HTTP review boundary MUST
   * fail closed when this atomic review capability is unavailable.
   */
  loadReviewArtifact?(ownerId: string, matterId: string): Promise<{
    snapshot: DebtValidationMatterSnapshot;
    pdfBytes: Uint8Array;
  } | null>;
  /** Atomic compare-and-insert: recheck the owner-scoped binding with assertDebtValidationApprovalCommit AND rehash the persisted PDF with assertDebtValidationPersistedPdf inside the same approval transaction. A matterVersion-only compare is insufficient. */
  persistApproval(
    ownerId: string,
    matterId: string,
    binding: DebtValidationApprovalBinding,
    expectedMatterVersion: number,
  ): Promise<void>;
  /**
   * Read the exact persisted, owner-scoped PDF bytes. A packet SHA in metadata
   * is NOT proof that the bytes to be mailed still match the reviewed packet.
   * The adapter must also rehash these bytes inside persistApproval and
   * claimCheckout's atomic transactions before committing either operation.
   */
  loadPacketPdfBytes(ownerId: string, matterId: string): Promise<Uint8Array | null>;
  /** Return only the persisted approval for this authenticated owner/matter. */
  loadApproval(ownerId: string, matterId: string): Promise<DebtValidationApprovalBinding | null>;
  /**
   * Atomic, idempotent order claim BEFORE any payment or mailing callback.
   * In one transaction, reload the current owner-scoped notice, intake, packet
   * and persisted approval AND the stored PDF bytes; re-run the exact checkout
   * binding and assertDebtValidationPersistedPdf checks; compare
   * expectedMatterVersion; and reserve idempotencyKey. A changed or missing
   * record MUST reject without invoking a provider. Retrying the identical
   * approved packet/key must reuse the existing claim.
   */
  claimCheckout(
    ownerId: string,
    matterId: string,
    verified: {
      binding: DebtValidationApprovalBinding;
      idempotencyKey: string;
      expectedMatterVersion: number;
    },
  ): Promise<DebtValidationCheckoutClaim>;
}

/**
 * Repository-side approval commit guard. The repository MUST invoke this
 * against freshly loaded owner-scoped state in the SAME atomic transaction as
 * the approval insert, not against the earlier loadCurrent snapshot. A matter
 * version alone is insufficient if a document or recipient changes without
 * incrementing it. This is an adapter contract, not a database transaction.
 */
export function assertDebtValidationApprovalCommit(input: {
  ownerId: string;
  matterId: string;
  binding: DebtValidationApprovalBinding;
  current: DebtValidationMatterSnapshot;
}): void {
  const { ownerId, matterId, binding, current } = input;
  if (!current?.packet || current.packet.matterVersion !== binding.matterVersion) {
    throw new Error("debt_validation_concurrent_approval_change");
  }
  const expected = createDebtValidationApprovalBinding({
    ownerId, matterId,
    reviewedPdfSha256: binding.pdfSha256,
    intake: current.currentIntake,
    trustedNotice: current.trustedNotice,
    packet: current.packet,
  });
  const keys = Object.keys(expected) as Array<keyof DebtValidationApprovalBinding>;
  if (keys.some((key) => expected[key] !== binding[key])) {
    throw new Error("debt_validation_concurrent_approval_change");
  }
}

/**
 * Fail closed if the PDF bytes in owner-scoped storage are absent or differ
 * from the reviewed packet digest. Must be rerun at each atomic approval/order
 * claim boundary: a preflight hash alone cannot prevent concurrent replacement.
 */
export function assertDebtValidationPersistedPdf(
  bytes: Uint8Array | null,
  expectedSha256: string,
): void {
  if (!(bytes instanceof Uint8Array)
    || !/^[a-f0-9]{64}$/i.test(expectedSha256)
    || createHash("sha256").update(bytes).digest("hex") !== expectedSha256.toLowerCase()) {
    throw new Error("debt_validation_persisted_pdf_changed");
  }
}

function identity(ownerId: string, matterId: string): void {
  if (!ownerId?.trim() || !matterId?.trim()) {
    throw new Error("debt_validation_owner_scope");
  }
}

function requireSnapshot(snapshot: DebtValidationMatterSnapshot | null): DebtValidationMatterSnapshot {
  if (!snapshot || !snapshot.currentIntake || !snapshot.trustedNotice || !snapshot.packet) {
    throw new Error("debt_validation_missing_trusted_state");
  }
  return snapshot;
}

export async function approveDebtValidationMatter(input: {
  ownerId: string;
  matterId: string;
  reviewedPdfSha256: string;
  /**
   * Must be true only for an authenticated user's explicit approval action.
   * Possessing or previewing the PDF digest is not approval. The eventual
   * HTTP route must independently enforce authentication and CSRF defenses.
   */
  userApprovedExactPacket?: unknown;
  /** Price and physical mail class shown to the authenticated user with the exact PDF. */
  reviewedTotalCents?: unknown;
  reviewedMailClass?: unknown;
  repository: DebtValidationMatterRepository;
}): Promise<DebtValidationApprovalBinding> {
  const { ownerId, matterId, reviewedPdfSha256, userApprovedExactPacket,
    reviewedTotalCents, reviewedMailClass, repository } = input;
  identity(ownerId, matterId);
  if (userApprovedExactPacket !== true) {
    throw new Error("debt_validation_explicit_approval_required");
  }
  const snapshot = requireSnapshot(await repository.loadCurrent(ownerId, matterId));
  // The PDF digest alone does not prove the customer reviewed the price or
  // physical mail service. Bind both values to the same explicit approval.
  if (!Number.isSafeInteger(reviewedTotalCents)
    || reviewedTotalCents !== snapshot.packet.totalCents
    || reviewedMailClass !== snapshot.packet.mailClass) {
    throw new Error("debt_validation_reviewed_quote_mismatch");
  }
  assertDebtValidationPersistedPdf(
    await repository.loadPacketPdfBytes(ownerId, matterId),
    snapshot.packet.pdfSha256,
  );
  const binding = createDebtValidationApprovalBinding({
    ownerId,
    matterId,
    reviewedPdfSha256,
    intake: snapshot.currentIntake,
    trustedNotice: snapshot.trustedNotice,
    packet: snapshot.packet,
  });
  await repository.persistApproval(ownerId, matterId, binding, snapshot.packet.matterVersion);
  return binding;
}

/**
 * Does not trust a request-supplied binding or packet. A durable checkout
 * adapter must atomically recheck the current binding and reserve the stable
 * key at order claim BEFORE the provider callback. This function deliberately
 * has no provider implementation.
 */
export async function checkoutDebtValidationMatter<Result>(input: {
  ownerId: string;
  matterId: string;
  repository: DebtValidationMatterRepository;
  /** Side-effecting callback: called ONLY for a newly claimed order. */
  checkout: (verified: {
    binding: DebtValidationApprovalBinding;
    idempotencyKey: string;
    expectedMatterVersion: number;
  }) => Promise<Result>;
  /**
   * Read-only lookup of an existing order/receipt, never a second provider
   * submission. Required for a reused claim. If a first attempt is still
   * pending, the adapter must report pending rather than submit again.
   */
  replayCheckout?: (verified: {
    binding: DebtValidationApprovalBinding;
    idempotencyKey: string;
    expectedMatterVersion: number;
  }) => Promise<Result>;
}): Promise<Result> {
  const { ownerId, matterId, repository, checkout, replayCheckout } = input;
  identity(ownerId, matterId);
  const binding = await repository.loadApproval(ownerId, matterId);
  if (!binding) throw new Error("debt_validation_approval_missing");
  const snapshot = requireSnapshot(await repository.loadCurrent(ownerId, matterId));
  assertDebtValidationPersistedPdf(
    await repository.loadPacketPdfBytes(ownerId, matterId),
    snapshot.packet.pdfSha256,
  );
  assertDebtValidationCheckoutBinding({
    ownerId,
    matterId,
    binding,
    trustedNotice: snapshot.trustedNotice,
    packet: snapshot.packet,
    currentIntake: snapshot.currentIntake,
  });
  const idempotencyKey = "debt_validation_checkout_" + createHash("sha256")
    .update(JSON.stringify([
      ownerId, matterId, binding.matterVersion, binding.pdfSha256,
      binding.intakeSha256, binding.enclosureManifestSha256,
      binding.totalCents, binding.mailClass,
    ]), "utf8").digest("hex");
  const verified = { binding, idempotencyKey, expectedMatterVersion: binding.matterVersion };
  // The earlier snapshot read is only preflight: the matter can change while
  // awaiting it. No provider callback is reachable until the repository's
  // durable, owner-scoped compare-and-claim succeeds.
  const claim = await repository.claimCheckout(ownerId, matterId, verified);
  // A resolved Promise<void> is not evidence of a durable order reservation.
  // Refuse any missing, malformed, or different claim before provider handoff.
  // The production adapter must return this receipt from its atomic transaction.
  if (!claim || claim.ownerId !== ownerId || claim.matterId !== matterId
    || claim.idempotencyKey !== idempotencyKey
    || claim.pdfSha256 !== binding.pdfSha256
    || claim.matterVersion !== binding.matterVersion
    || (claim.status !== "claimed" && claim.status !== "reused")) {
    throw new Error("debt_validation_checkout_claim_invalid");
  }
  // A reused durable order claim is not permission to charge or mail again.
  // Reconciliation must read an existing receipt (or pending state), never
  // invoke the side-effecting provider callback a second time.
  if (claim.status === "reused") {
    if (!replayCheckout) {
      throw new Error("debt_validation_checkout_replay_requires_receipt");
    }
    return replayCheckout(verified);
  }
  return checkout(verified);
}
