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
  approval: DebtValidationApprovalBinding | null;
  checkout_key: string | null;
}

const SELECT_ROW =
  "SELECT current_intake,trusted_notice,packet,pdf_bytes,approval,checkout_key " +
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
    async loadCurrent(ownerId, matterId) {
      const row = await readRow(db, ownerId, matterId, false);
      return row ? current(requireRow(row)) : null;
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
        if (row.checkout_key) {
          throw new Error("debt_validation_order_already_claimed");
        }
        if (row.approval) {
          if (!sameBinding(row.approval, binding)) {
            throw new Error("debt_validation_conflicting_approval");
          }
          return; // Identical explicit approval retry, no second write.
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
