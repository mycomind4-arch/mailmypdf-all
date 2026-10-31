/**
 * Local PostgreSQL-backed persistence contract for debt-validation matters.
 *
 * NOT WIRED TO HTTP ROUTES OR PRODUCTION. The SQL table is intentionally
 * created only by an isolated PGlite regression fixture; there is no hosted
 * migration, service-role bypass, provider call, or deployment in this change.
 *
 * A future authenticated endpoint must derive ownerId from its verified user,
 * use a reviewed schema/RLS policy, and supply a database transaction adapter.
 * The table stores exact PDF bytes (bytea), not just untrusted digest metadata.
 */
import { createHash } from "node:crypto";
import type { DebtValidationIntake } from "../../../../dispute-mail/workflows/debt-validation/domain";
import { prepareDebtValidationMatterPacket } from "../../../../dispute-mail/workflows/debt-validation/server-packet-preparation";
import {
  assertDebtValidationCheckoutBinding,
  type DebtValidationApprovalBinding,
  type DebtValidationPacketSnapshot,
  type TrustedDebtValidationNotice,
} from "../../../../dispute-mail/workflows/debt-validation/server-approval-binding";
import {
  assertDebtValidationApprovalCommit,
  assertDebtValidationPersistedPdf,
  type DebtValidationMatterRepository,
  type DebtValidationMatterSnapshot,
} from "../../../../dispute-mail/workflows/debt-validation/server-matter-approval";

/**
 * Parameterized SQL client. A production postgres.js wrapper can implement
 * query with sql.unsafe(statement, parameters) and transaction with sql.begin.
 * An embedded PGlite instance implements the same contract in offline tests.
 * Do not use an autocommit-only client: row locks must span the write.
 */
export interface DebtValidationSqlSession {
  query(statement: string, parameters?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}
export interface DebtValidationSqlDatabase extends DebtValidationSqlSession {
  transaction<T>(work: (session: DebtValidationSqlSession) => Promise<T>): Promise<T>;
}

interface StoredRow {
  current_intake: DebtValidationIntake;
  trusted_notice: TrustedDebtValidationNotice;
  packet: DebtValidationPacketSnapshot;
  pdf_bytes: Uint8Array;
  notice_pdf_bytes: Uint8Array;
  approval: DebtValidationApprovalBinding | null;
  checkout_key: string | null;
}

const SELECT_ROW =
  "SELECT current_intake,trusted_notice,packet,pdf_bytes,notice_pdf_bytes,approval,checkout_key " +
  "FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2";

function requireScope(ownerId: string, matterId: string): void {
  if (!ownerId?.trim() || !matterId?.trim()) {
    throw new Error("debt_validation_owner_scope");
  }
}

async function readRow(
  session: DebtValidationSqlSession,
  ownerId: string,
  matterId: string,
  lock: boolean,
): Promise<StoredRow | null> {
  requireScope(ownerId, matterId);
  const result = await session.query(
    SELECT_ROW + (lock ? " FOR UPDATE" : ""),
    [ownerId, matterId],
  );
  if (result.rows.length > 1) {
    throw new Error("debt_validation_duplicate_matter");
  }
  return (result.rows[0] as unknown as StoredRow | undefined) ?? null;
}

function requireRow(row: StoredRow | null): StoredRow {
  if (!row || !row.current_intake || !row.trusted_notice || !row.packet) {
    throw new Error("debt_validation_missing_trusted_state");
  }
  return row;
}

function current(row: StoredRow): DebtValidationMatterSnapshot {
  return {
    currentIntake: row.current_intake,
    trustedNotice: row.trusted_notice,
    packet: row.packet,
  };
}

function sameBinding(left: DebtValidationApprovalBinding, right: DebtValidationApprovalBinding): boolean {
  if (!left || !right) return false;
  const keys = Object.keys(right) as Array<keyof DebtValidationApprovalBinding>;
  return Object.keys(left).length === keys.length &&
    keys.every((key) => left[key] === right[key]);
}

/**
 * Rehash the original controlling notice bytes, not merely its JSON metadata.
 * A replaced source notice must invalidate approval and checkout even if a
 * caller forgets to increment the notice revision or update the stored SHA.
 * The notice bytes are evidence, not an automatic mailing enclosure.
 */
function assertStoredControllingNotice(row: StoredRow): void {
  try {
    assertDebtValidationPersistedPdf(row.notice_pdf_bytes, row.trusted_notice.sha256);
  } catch {
    throw new Error("debt_validation_persisted_notice_changed");
  }
}

function expectedCheckoutKey(ownerId: string, matterId: string, binding: DebtValidationApprovalBinding): string {
  // Must exactly match checkoutDebtValidationMatter's stable key. A caller
  // cannot choose a new key to manufacture a second order for one approval.
  return "debt_validation_checkout_" + createHash("sha256")
    .update(JSON.stringify([
      ownerId, matterId, binding.matterVersion, binding.pdfSha256,
      binding.intakeSha256, binding.enclosureManifestSha256,
      binding.totalCents, binding.mailClass,
    ]), "utf8").digest("hex");
}

/**
 * Atomic approval and checkout use SELECT ... FOR UPDATE on the SAME
 * owner/matter row that holds the current notice, intake, PDF and approval.
 * No provider callback is available inside this adapter.
 */
export function createPostgresDebtValidationMatterRepository(
  db: DebtValidationSqlDatabase,
): DebtValidationMatterRepository {
  return {
    async loadReviewArtifact(ownerId, matterId) {
      // Both source and generated packet bytes are selected in ONE statement,
      // so the review cannot mix a notice from one revision with a PDF from
      // another. Approval and checkout still recheck under their row locks.
      const row = await readRow(db, ownerId, matterId, false);
      if (!row) return null;
      const stored = requireRow(row);
      assertStoredControllingNotice(stored);
      assertDebtValidationPersistedPdf(stored.pdf_bytes, stored.packet.pdfSha256);
      return {
        snapshot: current(stored),
        pdfBytes: Uint8Array.from(stored.pdf_bytes),
      };
    },

    async loadCurrent(ownerId, matterId) {
      const row = await readRow(db, ownerId, matterId, false);
      if (!row) return null;
      // A read-only review must not present a packet as approvable when the
      // controlling notice's stored bytes have changed behind its metadata.
      // Approval/checkout also recheck under their own row locks.
      assertStoredControllingNotice(requireRow(row));
      return current(row);
    },

    async loadPacketPdfBytes(ownerId, matterId) {
      const row = await readRow(db, ownerId, matterId, false);
      return row?.pdf_bytes instanceof Uint8Array ? row.pdf_bytes.slice() : null;
    },

    async loadApproval(ownerId, matterId) {
      const row = await readRow(db, ownerId, matterId, false);
      return row?.approval ?? null;
    },

    async persistApproval(ownerId, matterId, binding, expectedMatterVersion) {
      await db.transaction(async (tx) => {
        const row = requireRow(await readRow(tx, ownerId, matterId, true));
        if (row.packet.matterVersion !== expectedMatterVersion ||
            binding.matterVersion !== expectedMatterVersion) {
          throw new Error("debt_validation_concurrent_approval_change");
        }
        // Recheck fresh state and stored bytes UNDER THE LOCK. A stale
        // preflight read or an unincremented document revision is insufficient.
        assertDebtValidationApprovalCommit({
          ownerId, matterId, binding, current: current(row),
        });
        assertDebtValidationPersistedPdf(row.pdf_bytes, row.packet.pdfSha256);
        assertStoredControllingNotice(row);
        if (row.approval) {
          if (!sameBinding(row.approval, binding)) {
            throw new Error("debt_validation_conflicting_approval");
          }
          // A completed checkout does not revoke an identical, already
          // recorded approval. This retry is read-only and cannot create an
          // order or trigger another provider submission.
          return;
        }
        if (row.checkout_key) {
          throw new Error("debt_validation_order_already_claimed");
        }
        await tx.query(
          "UPDATE debt_validation_matter_snapshots SET approval=$3::jsonb " +
          "WHERE owner_id=$1 AND matter_id=$2",
          [ownerId, matterId, JSON.stringify(binding)],
        );
      });
    },

    async claimCheckout(ownerId, matterId, verified) {
      return db.transaction(async (tx) => {
        const row = requireRow(await readRow(tx, ownerId, matterId, true));
        const { binding, idempotencyKey, expectedMatterVersion } = verified;
        if (!row.approval || !sameBinding(row.approval, binding) ||
            row.packet.matterVersion !== expectedMatterVersion ||
            binding.matterVersion !== expectedMatterVersion) {
          throw new Error("debt_validation_concurrent_checkout_change");
        }
        assertDebtValidationCheckoutBinding({
          ownerId, matterId, binding: row.approval,
          trustedNotice: row.trusted_notice,
          packet: row.packet,
          currentIntake: row.current_intake,
        });
        assertDebtValidationPersistedPdf(row.pdf_bytes, row.packet.pdfSha256);
        assertStoredControllingNotice(row);
        if (idempotencyKey !== expectedCheckoutKey(ownerId, matterId, row.approval)) {
          throw new Error("debt_validation_checkout_key_mismatch");
        }
        if (row.checkout_key) {
          if (row.checkout_key !== idempotencyKey) {
            throw new Error("debt_validation_conflicting_checkout_claim");
          }
          return {
            ownerId, matterId, idempotencyKey,
            pdfSha256: binding.pdfSha256, matterVersion: binding.matterVersion,
            status: "reused" as const,
          };
        }
        await tx.query(
          "UPDATE debt_validation_matter_snapshots SET checkout_key=$3 " +
          "WHERE owner_id=$1 AND matter_id=$2",
          [ownerId, matterId, idempotencyKey],
        );
        return {
          ownerId, matterId, idempotencyKey,
          pdfSha256: binding.pdfSha256, matterVersion: binding.matterVersion,
          status: "claimed" as const,
        };
      });
    },
  };
}

/**
 * Persist a server-generated, validated mailing packet as one immutable matter
 * snapshot. The caller MUST supply an authenticated ownerId and controlling
 * notice bytes from that owner's trusted vault, never browser-supplied metadata.
 *
 * This is a create-only bridge from packet preparation to the existing
 * owner-scoped approval/checkout repository. An existing matter must be
 * revised through a separately reviewed versioned workflow, never overwritten
 * here (which could invalidate a prior approval or durable order claim).
 *
 * No production schema, HTTP route, Stripe/Lob adapter, or migration is
 * installed by this function.
 */
export async function prepareAndPersistDebtValidationMatter(
  db: DebtValidationSqlDatabase,
  input: Parameters<typeof prepareDebtValidationMatterPacket>[0],
): Promise<DebtValidationPacketSnapshot> {
  const prepared = await prepareDebtValidationMatterPacket(input);
  const { ownerId, matterId, intake, trustedNotice, noticePdfBytes } = input;
  const inserted = await db.transaction((tx) => tx.query(
    "INSERT INTO debt_validation_matter_snapshots " +
      "(owner_id,matter_id,current_intake,trusted_notice,packet,pdf_bytes,notice_pdf_bytes) " +
      "VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::bytea,$7::bytea) " +
      "ON CONFLICT (owner_id,matter_id) DO NOTHING RETURNING owner_id",
    [ownerId, matterId, JSON.stringify(intake), JSON.stringify(trustedNotice),
      JSON.stringify(prepared.packet), prepared.pdfBytes, noticePdfBytes],
  ));
  if (inserted.rows.length !== 1) {
    throw new Error("debt_validation_matter_already_exists");
  }
  return prepared.packet;
}


/**
 * Offline-testable, durable provider-receipt reconciliation primitive.
 *
 * This does NOT submit a charge or a letter. Only trusted server callbacks
 * holding the exact durable checkout claim may record immutable provider
 * acknowledgements. Payment and mailing are separate stages: one receipt
 * never proves the other, and neither is proof of postal delivery.
 *
 * The companion table exists only in the isolated PGlite fixture. There is
 * deliberately no production migration, HTTP route, Stripe or Lob adapter.
 */
export interface DebtValidationProviderReceipt {
  kind: "payment" | "mailing";
  provider: string;
  providerReference: string;
  evidenceSha256: string;
}

export interface DebtValidationReceiptReconciliation {
  status: "pending" | "recorded";
  payment: DebtValidationProviderReceipt | null;
  mailing: DebtValidationProviderReceipt | null;
}

type VerifiedDebtValidationReceiptClaim = {
  binding: DebtValidationApprovalBinding;
  idempotencyKey: string;
  expectedMatterVersion: number;
};

function assertReceiptClaim(
  row: StoredRow | null,
  ownerId: string,
  matterId: string,
  verified: VerifiedDebtValidationReceiptClaim,
): void {
  if (!row?.approval || !verified?.binding ||
      row.checkout_key !== verified.idempotencyKey ||
      !sameBinding(row.approval, verified.binding) ||
      row.approval.matterVersion !== verified.expectedMatterVersion ||
      expectedCheckoutKey(ownerId, matterId, row.approval) !== verified.idempotencyKey) {
    throw new Error("debt_validation_receipt_claim_mismatch");
  }
  // A durable order key is not sufficient after the source notice, recipient,
  // or reviewed packet changes. Receipt writes AND read-only reconciliation
  // must revalidate the exact approval against current owner-scoped bytes.
  assertDebtValidationCheckoutBinding({
    ownerId, matterId, binding: row.approval,
    trustedNotice: row.trusted_notice,
    packet: row.packet,
    currentIntake: row.current_intake,
  });
  assertDebtValidationPersistedPdf(row.pdf_bytes, row.packet.pdfSha256);
  assertStoredControllingNotice(row);
}

function validateProviderReceipt(receipt: DebtValidationProviderReceipt): void {
  if (!receipt || !["payment", "mailing"].includes(receipt.kind) ||
      typeof receipt.provider !== "string" ||
      !/^[a-z0-9][a-z0-9_-]{1,63}$/i.test(receipt.provider) ||
      typeof receipt.providerReference !== "string" ||
      !receipt.providerReference.trim() ||
      receipt.providerReference.length > 256 ||
      /[\u0000-\u001f\u007f]/.test(receipt.providerReference) ||
      typeof receipt.evidenceSha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(receipt.evidenceSha256)) {
    throw new Error("debt_validation_invalid_provider_receipt");
  }
}

function normalizeReceipt(receipt: DebtValidationProviderReceipt): DebtValidationProviderReceipt {
  return {
    kind: receipt.kind,
    provider: receipt.provider,
    providerReference: receipt.providerReference,
    evidenceSha256: receipt.evidenceSha256.toLowerCase(),
  };
}

export function createPostgresDebtValidationReceiptLedger(db: DebtValidationSqlDatabase) {
  return {
    /**
     * Record a trusted provider acknowledgement only for an existing atomic
     * checkout claim. The row lock serializes competing receipt writes.
     * Identical replays are read-only; conflicting evidence fails closed.
     */
    async record(
      ownerId: string,
      matterId: string,
      verified: VerifiedDebtValidationReceiptClaim,
      receipt: DebtValidationProviderReceipt,
    ): Promise<void> {
      requireScope(ownerId, matterId);
      validateProviderReceipt(receipt);
      const normalized = normalizeReceipt(receipt);
      await db.transaction(async (tx) => {
        const row = await readRow(tx, ownerId, matterId, true);
        assertReceiptClaim(row, ownerId, matterId, verified);
        // A mailing acknowledgement cannot certify a physical-mailing stage
        // unless this exact owner/order already has a valid payment receipt.
        // Keep the check under the matter row lock so concurrent callbacks
        // cannot bypass the ordering rule. This is a ledger guard, NOT an
        // authorization to submit a letter to Lob.
        if (normalized.kind === "mailing") {
          const paid = await tx.query(
            "SELECT provider,provider_reference,evidence_sha256 " +
              "FROM debt_validation_checkout_receipts " +
              "WHERE owner_id=$1 AND matter_id=$2 AND checkout_key=$3 AND kind='payment'",
            [ownerId, matterId, verified.idempotencyKey],
          );
          if (paid.rows.length !== 1) {
            throw new Error("debt_validation_payment_receipt_required");
          }
          validateProviderReceipt({
            kind: "payment",
            provider: paid.rows[0]!.provider as string,
            providerReference: paid.rows[0]!.provider_reference as string,
            evidenceSha256: paid.rows[0]!.evidence_sha256 as string,
          });
        }
        const existing = await tx.query(
          "SELECT provider,provider_reference,evidence_sha256 " +
            "FROM debt_validation_checkout_receipts " +
            "WHERE owner_id=$1 AND matter_id=$2 AND checkout_key=$3 AND kind=$4",
          [ownerId, matterId, verified.idempotencyKey, normalized.kind],
        );
        if (existing.rows.length > 1) {
          throw new Error("debt_validation_duplicate_provider_receipt");
        }
        if (existing.rows.length === 1) {
          const previous = existing.rows[0]!;
          if (previous.provider !== normalized.provider ||
              previous.provider_reference !== normalized.providerReference ||
              previous.evidence_sha256 !== normalized.evidenceSha256) {
            throw new Error("debt_validation_conflicting_provider_receipt");
          }
          return;
        }
        await tx.query(
          "INSERT INTO debt_validation_checkout_receipts " +
            "(owner_id,matter_id,checkout_key,kind,provider,provider_reference,evidence_sha256) " +
            "VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [ownerId, matterId, verified.idempotencyKey, normalized.kind,
            normalized.provider, normalized.providerReference, normalized.evidenceSha256],
        );
      });
    },

    /**
     * Read-only pre-mailing gate for a trusted host adapter. A durable checkout
     * claim alone is NOT payment: require an actual recorded payment receipt
     * for the exact owner/order while rechecking source notice, recipient,
     * reviewed PDF and approval under the same row lock.
     *
     * This only validates evidence already accepted into the local ledger.
     * The future provider adapter must independently authenticate Stripe's
     * payment event, enforce provider idempotency, and revalidate authorization
     * immediately before Lob submission. No provider is called here.
     */
    async requireRecordedPaymentForMailing(
      ownerId: string,
      matterId: string,
      verified: VerifiedDebtValidationReceiptClaim,
    ): Promise<DebtValidationProviderReceipt> {
      requireScope(ownerId, matterId);
      return db.transaction(async (tx) => {
        const row = await readRow(tx, ownerId, matterId, true);
        assertReceiptClaim(row, ownerId, matterId, verified);
        const paid = await tx.query(
          "SELECT provider,provider_reference,evidence_sha256 " +
            "FROM debt_validation_checkout_receipts " +
            "WHERE owner_id=$1 AND matter_id=$2 AND checkout_key=$3 AND kind='payment'",
          [ownerId, matterId, verified.idempotencyKey],
        );
        if (paid.rows.length !== 1) {
          throw new Error("debt_validation_payment_receipt_required");
        }
        const receipt: DebtValidationProviderReceipt = {
          kind: "payment",
          provider: paid.rows[0]!.provider as string,
          providerReference: paid.rows[0]!.provider_reference as string,
          evidenceSha256: paid.rows[0]!.evidence_sha256 as string,
        };
        validateProviderReceipt(receipt);
        return normalizeReceipt(receipt);
      });
    },

    /** Read-only reconciliation; never calls a payment or mailing provider. */
    async reconcile(
      ownerId: string,
      matterId: string,
      verified: VerifiedDebtValidationReceiptClaim,
    ): Promise<DebtValidationReceiptReconciliation> {
      // Keep the source/packet read and receipt lookup in one locked
      // transaction; a concurrent notice replacement cannot turn a stale
      // preflight into a false "recorded" reconciliation result.
      return db.transaction(async (tx) => {
      const row = await readRow(tx, ownerId, matterId, true);
      assertReceiptClaim(row, ownerId, matterId, verified);
      const results = await tx.query(
        "SELECT kind,provider,provider_reference,evidence_sha256 " +
          "FROM debt_validation_checkout_receipts " +
          "WHERE owner_id=$1 AND matter_id=$2 AND checkout_key=$3",
        [ownerId, matterId, verified.idempotencyKey],
      );
      if (results.rows.length > 2) {
        throw new Error("debt_validation_duplicate_provider_receipt");
      }
      const receipts = new Map<string, DebtValidationProviderReceipt>();
      for (const item of results.rows) {
        const receipt = {
          kind: item.kind,
          provider: item.provider,
          providerReference: item.provider_reference,
          evidenceSha256: item.evidence_sha256,
        } as DebtValidationProviderReceipt;
        validateProviderReceipt(receipt);
        if (receipts.has(receipt.kind)) {
          throw new Error("debt_validation_duplicate_provider_receipt");
        }
        receipts.set(receipt.kind, normalizeReceipt(receipt));
      }
      const payment = receipts.get("payment") ?? null;
      const mailing = receipts.get("mailing") ?? null;
      // Fail closed on a legacy or manually corrupted mailing-only row.
      // Payment and mailing receipts must never be conflated.
      if (mailing && !payment) {
        throw new Error("debt_validation_payment_receipt_required");
      }
      return {
        status: payment && mailing ? "recorded" : "pending",
        payment,
        mailing,
      };
      });
    },
  };
}
