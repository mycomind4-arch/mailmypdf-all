import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  createPostgresDebtValidationMatterRepository,
  type DebtValidationSqlDatabase,
} from "../src/lib/secure-core/debt-validation-postgres.server";
import {
  approveDebtValidationMatter,
  checkoutDebtValidationMatter,
  type DebtValidationMatterSnapshot,
} from "../../dispute-mail/workflows/debt-validation/server-matter-approval";
import {
  debtValidationIntakeSha256,
} from "../../dispute-mail/workflows/debt-validation/server-approval-binding";
import type { DebtValidationIntake } from "../../dispute-mail/workflows/debt-validation/domain";

// Isolated, embedded PostgreSQL (PGlite); never connects to hosted Supabase,
// Stripe, Lob, or a customer account. This is a test-only schema, NOT a migration.
const schema = String.raw\`
  CREATE TABLE debt_validation_matter_snapshots (
    owner_id text NOT NULL,
    matter_id text NOT NULL,
    current_intake jsonb NOT NULL,
    trusted_notice jsonb NOT NULL,
    packet jsonb NOT NULL,
    pdf_bytes bytea NOT NULL,
    approval jsonb,
    checkout_key text,
    PRIMARY KEY (owner_id, matter_id)
  );
\`;
const owner = "synthetic-owner-a";
const other = "synthetic-owner-b";
const matter = "synthetic-matter-1";
const address = "Example Collections\nPO Box 456\nAustin, TX 78701";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const pdf = new TextEncoder().encode("%PDF-1.4\nSynthetic reviewed packet\n%%EOF");

function fixture(ownerId = owner): DebtValidationMatterSnapshot {
  const noticeSha = "a".repeat(64);
  const intake: DebtValidationIntake = {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: "Example Collections",
    collectorResponseAddress: address,
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "I dispute the balance stated in this notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "notice-1",
    noticeSha256: noticeSha,
    noticeVersion: 1,
    noticeResponseAddress: address,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: address,
    confirmedNoticeSha256: noticeSha,
    confirmedNoticeDocumentId: "notice-1",
    confirmedNoticeVersion: 1,
  };
  return {
    currentIntake: intake,
    trustedNotice: {
      ownerId, matterId: matter, documentId: "notice-1", sha256: noticeSha,
      version: 1, responseMailingAddress: address, mailingAddressVerified: true,
    },
    packet: {
      ownerId, matterId: matter, matterVersion: 2, totalCents: 1499,
      mailClass: "certified", pdfSha256: sha(pdf),
      enclosureManifestSha256: "b".repeat(64),
      intakeSha256: debtValidationIntakeSha256(intake),
      recipientAddress: address, noticeDocumentId: "notice-1",
      noticeSha256: noticeSha, noticeVersion: 1,
    },
  };
}

async function setup() {
  const db = new PGlite();
  await db.exec(schema);
  // Explicit adapters make the production SQL transaction contract testable
  // against real PostgreSQL semantics without network or credentials.
  const sql: DebtValidationSqlDatabase = {
    query: (statement, parameters = []) => db.query(statement, parameters),
    transaction: (work) => db.transaction(async (tx) =>
      work({ query: (statement, parameters = []) => tx.query(statement, parameters) })),
  };
  const repository = createPostgresDebtValidationMatterRepository(sql);
  const seed = async (ownerId = owner, snapshot = fixture(ownerId), bytes = pdf) =>
    db.query(
      "INSERT INTO debt_validation_matter_snapshots (owner_id,matter_id,current_intake,trusted_notice,packet,pdf_bytes) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6)",
      [ownerId, matter, JSON.stringify(snapshot.currentIntake),
        JSON.stringify(snapshot.trustedNotice), JSON.stringify(snapshot.packet), bytes],
    );
  const approve = (ownerId = owner) => approveDebtValidationMatter({
    ownerId, matterId: matter, repository,
    reviewedPdfSha256: sha(pdf), reviewedTotalCents: 1499,
    reviewedMailClass: "certified", userApprovedExactPacket: true,
  });
  return { db, repository, seed, approve };
}

test("PostgreSQL debt validation: exact owner-scoped bytes, approval and one durable checkout claim", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  assert.deepEqual(await repository.loadPacketPdfBytes(owner, matter), pdf);
  const binding = await approve();
  assert.equal(binding.pdfSha256, sha(pdf));
  let providerSubmissions = 0;
  let receiptReads = 0;
  const checkout = async () => { providerSubmissions++; return "mock-receipt"; };
  const replayCheckout = async () => { receiptReads++; return "mock-receipt"; };
  const results = await Promise.all([
    checkoutDebtValidationMatter({ ownerId: owner, matterId: matter, repository, checkout, replayCheckout }),
    checkoutDebtValidationMatter({ ownerId: owner, matterId: matter, repository, checkout, replayCheckout }),
  ]);
  assert.deepEqual(results, ["mock-receipt", "mock-receipt"]);
  assert.equal(providerSubmissions, 1, "concurrent retries must not submit Stripe/Lob twice");
  assert.equal(receiptReads, 1, "reused claim is read-only");
  const stored = await db.query<{ approval: unknown; checkout_key: string }>(
    "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.deepEqual(stored.rows[0]?.approval, binding);
  assert.match(stored.rows[0]!.checkout_key, /^debt_validation_checkout_[a-f0-9]{64}$/);
});

test("PostgreSQL debt validation: owner B cannot read, approve or claim owner A's matter", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  assert.equal(await repository.loadCurrent(other, matter), null);
  assert.equal(await repository.loadPacketPdfBytes(other, matter), null);
  assert.equal(await repository.loadApproval(other, matter), null);
  await assert.rejects(approve(other), /debt_validation_/);
  await assert.rejects(repository.claimCheckout(other, matter, {
    binding: (await approve())!, idempotencyKey: "bad", expectedMatterVersion: 2,
  }), /debt_validation_/);
  const rows = await db.query<{ owner_id: string }>(
    "SELECT owner_id FROM debt_validation_matter_snapshots WHERE matter_id=$1", [matter],
  );
  assert.deepEqual(rows.rows.map((row) => row.owner_id), [owner]);
});

test("PostgreSQL debt validation: no confirmation and replaced PDF fail before approval", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  const unconfirmed = fixture();
  unconfirmed.currentIntake.recipientConfirmed = false;
  await seed(owner, unconfirmed);
  await assert.rejects(approve(), /debt_validation_/);
  let rows = await db.query<{ approval: unknown }>(
    "SELECT approval FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2", [owner, matter],
  );
  assert.equal(rows.rows[0]?.approval, null);
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb,pdf_bytes=$4 WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, JSON.stringify(fixture().currentIntake), new TextEncoder().encode("replaced PDF")],
  );
  await assert.rejects(approve(), /debt_validation_persisted_pdf_changed/);
  rows = await db.query("SELECT approval FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2", [owner, matter]);
  assert.equal(rows.rows[0]?.approval, null);
  assert.equal(await repository.loadApproval(owner, matter), null);
});

test("PostgreSQL debt validation: changed recipient, controlling notice or PDF blocks checkout and all mocked providers", async (t) => {
  const changes: Array<[string, (db: PGlite) => Promise<unknown>]> = [
    ["recipient", async (db) => {
      const modified = fixture().currentIntake;
      modified.recipientConfirmed = false;
      return db.query("UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(modified)]);
    }],
    ["controlling notice", async (db) => {
      const modified = fixture().trustedNotice;
      modified.sha256 = "c".repeat(64);
      return db.query("UPDATE debt_validation_matter_snapshots SET trusted_notice=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(modified)]);
    }],
    ["PDF bytes", async (db) =>
      db.query("UPDATE debt_validation_matter_snapshots SET pdf_bytes=$3 WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, new TextEncoder().encode("changed PDF")])],
  ];
  for (const [name, change] of changes) {
    const { db, repository, seed, approve } = await setup();
    try {
      await seed();
      await approve();
      await change(db);
      let stripeCalls = 0;
      let lobCalls = 0;
      await assert.rejects(checkoutDebtValidationMatter({
        ownerId: owner, matterId: matter, repository,
        checkout: async () => { stripeCalls++; lobCalls++; return "must-not-run"; },
      }), /debt_validation_/, name);
      assert.equal(stripeCalls, 0, name + ": no Stripe handoff");
      assert.equal(lobCalls, 0, name + ": no Lob handoff");
      const rows = await db.query<{ checkout_key: string | null }>(
        "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter],
      );
      assert.equal(rows.rows[0]?.checkout_key, null, name + ": no order reservation");
    } finally {
      await db.close();
    }
  }
});
