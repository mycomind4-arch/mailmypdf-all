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

export interface DebtValidationMatterRepository {
  /** One consistent read from authenticated owner-scoped persistence. */
  loadCurrent(ownerId: string, matterId: string): Promise<DebtValidationMatterSnapshot | null>;
  /** Atomic compare-and-insert: recheck the entire current owner-scoped binding via assertDebtValidationApprovalCommit inside the approval transaction; a matterVersion-only compare is insufficient. */
  persistApproval(
    ownerId: string,
    matterId: string,
    binding: DebtValidationApprovalBinding,
    expectedMatterVersion: number,
  ): Promise<void>;
  /** Return only the persisted approval for this authenticated owner/matter. */
  loadApproval(ownerId: string, matterId: string): Promise<DebtValidationApprovalBinding | null>;
  /**
   * Atomic, idempotent order claim BEFORE any payment or mailing callback.
   * In one transaction, reload the current owner-scoped notice, intake, packet
   * and persisted approval; re-run the exact checkout binding check; compare
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
  ): Promise<void>;
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
  repository: DebtValidationMatterRepository;
}): Promise<DebtValidationApprovalBinding> {
  const { ownerId, matterId, reviewedPdfSha256, userApprovedExactPacket, repository } = input;
  identity(ownerId, matterId);
  if (userApprovedExactPacket !== true) {
    throw new Error("debt_validation_explicit_approval_required");
  }
  const snapshot = requireSnapshot(await repository.loadCurrent(ownerId, matterId));
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
  checkout: (verified: {
    binding: DebtValidationApprovalBinding;
    idempotencyKey: string;
    expectedMatterVersion: number;
  }) => Promise<Result>;
}): Promise<Result> {
  const { ownerId, matterId, repository, checkout } = input;
  identity(ownerId, matterId);
  const binding = await repository.loadApproval(ownerId, matterId);
  if (!binding) throw new Error("debt_validation_approval_missing");
  const snapshot = requireSnapshot(await repository.loadCurrent(ownerId, matterId));
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
  await repository.claimCheckout(ownerId, matterId, verified);
  return checkout(verified);
}
