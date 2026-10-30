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
  /** Atomic compare-and-insert: reject if matterVersion changed since loadCurrent. */
  persistApproval(
    ownerId: string,
    matterId: string,
    binding: DebtValidationApprovalBinding,
    expectedMatterVersion: number,
  ): Promise<void>;
  /** Return only the persisted approval for this authenticated owner/matter. */
  loadApproval(ownerId: string, matterId: string): Promise<DebtValidationApprovalBinding | null>;
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
  repository: DebtValidationMatterRepository;
}): Promise<DebtValidationApprovalBinding> {
  const { ownerId, matterId, reviewedPdfSha256, repository } = input;
  identity(ownerId, matterId);
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
 * adapter must compare the binding at order claim and use the stable key for
 * provider retries. This function deliberately has no provider implementation.
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
    ]), "utf8").digest("hex");
  return checkout({ binding, idempotencyKey, expectedMatterVersion: binding.matterVersion });
}
