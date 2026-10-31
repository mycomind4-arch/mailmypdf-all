import { createDebtValidationApprovalHttpHandler } from "../src/lib/secure-core/debt-validation-approval-http.server";
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
const schema = String.raw`
  CREATE TABLE debt_validation_matter_snapshots (
    owner_id text NOT NULL,
    matter_id text NOT NULL,
    current_intake jsonb NOT NULL,
    trusted_notice jsonb NOT NULL,
    packet jsonb NOT NULL,
    pdf_bytes bytea NOT NULL,
    notice_pdf_bytes bytea NOT NULL,
    approval jsonb,
    checkout_key text,
    PRIMARY KEY (owner_id, matter_id)
  );
`;
const owner = "synthetic-owner-a";
const other = "synthetic-owner-b";
const matter = "synthetic-matter-1";
const address = "Example Collections\nPO Box 456\nAustin, TX 78701";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const pdf = new TextEncoder().encode("%PDF-1.4\nSynthetic reviewed packet\n%%EOF");
const sourceNoticePdf = new TextEncoder().encode("%PDF-1.4\nSynthetic controlling collection notice\n%%EOF");

function fixture(ownerId = owner): DebtValidationMatterSnapshot {
  const noticeSha = sha(sourceNoticePdf);
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
  // Deterministically inject a committed change after an orchestration
  // preflight read but before the repository's atomic transaction begins.
  // The adapter must re-read under its row lock instead of trusting preflight.
  let beforeTransaction: (() => Promise<unknown>) | undefined;
  const armBeforeTransaction = (hook: () => Promise<unknown>) => {
    beforeTransaction = hook;
  };
  // Explicit adapters make the production SQL transaction contract testable
  // against real PostgreSQL semantics without network or credentials.
  const sql: DebtValidationSqlDatabase = {
    query: (statement, parameters = []) => db.query(statement, parameters),
    transaction: async (work) => {
      const hook = beforeTransaction;
      beforeTransaction = undefined;
      await hook?.();
      return db.transaction(async (tx) =>
        work({ query: (statement, parameters = []) => tx.query(statement, parameters) }));
    },
  };
  const repository = createPostgresDebtValidationMatterRepository(sql);
  const seed = async (ownerId = owner, snapshot = fixture(ownerId), bytes = pdf) =>
    db.query(
      "INSERT INTO debt_validation_matter_snapshots (owner_id,matter_id,current_intake,trusted_notice,packet,pdf_bytes,notice_pdf_bytes) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::bytea,$7::bytea)",
      [ownerId, matter, JSON.stringify(snapshot.currentIntake),
        JSON.stringify(snapshot.trustedNotice), JSON.stringify(snapshot.packet), bytes, sourceNoticePdf],
    );
  const approve = (ownerId = owner) => approveDebtValidationMatter({
    ownerId, matterId: matter, repository,
    reviewedPdfSha256: sha(pdf), reviewedTotalCents: 1499,
    reviewedMailClass: "certified", userApprovedExactPacket: true,
  });
  return { db, repository, seed, approve, armBeforeTransaction };
}

test("PostgreSQL debt validation: exact owner-scoped bytes, approval and one durable checkout claim", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  assert.equal(sha((await repository.loadPacketPdfBytes(owner, matter))!), sha(pdf));
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
    "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb,pdf_bytes=$4::bytea WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, JSON.stringify(fixture().currentIntake), new TextEncoder().encode("replaced PDF")],
  );
  await assert.rejects(approve(), /debt_validation_persisted_pdf_changed/);
  rows = await db.query("SELECT approval FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2", [owner, matter]);
  assert.equal(rows.rows[0]?.approval, null);
  assert.equal(await repository.loadApproval(owner, matter), null);
});

test("PostgreSQL debt validation: changed recipient, controlling notice or PDF blocks checkout and all mocked providers", async (t) => {
  const changes: Array<[string, (db: PGlite) => Promise<unknown>]> = [
    ["recipient confirmation revoked", async (db) => {
      const modified = fixture().currentIntake;
      modified.recipientConfirmed = false;
      return db.query("UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(modified)]);
    }],
    ["recipient replaced with synchronized, valid notice fields", async (db) => {
      const modified = fixture();
      const alternate = "Example Collections\nPO Box 999\nAustin, TX 78701";
      modified.currentIntake.collectorResponseAddress = alternate;
      modified.currentIntake.noticeResponseAddress = alternate;
      modified.currentIntake.confirmedRecipientAddress = alternate;
      modified.trustedNotice.responseMailingAddress = alternate;
      modified.packet.recipientAddress = alternate;
      modified.packet.intakeSha256 = debtValidationIntakeSha256(modified.currentIntake);
      return db.query(
        "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb,trusted_notice=$4::jsonb,packet=$5::jsonb WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(modified.currentIntake),
          JSON.stringify(modified.trustedNotice), JSON.stringify(modified.packet)],
      );
    }],
    ["controlling notice replaced with synchronized, valid notice fields", async (db) => {
      const modified = fixture();
      const replacementSha = "c".repeat(64);
      modified.currentIntake.noticeSha256 = replacementSha;
      modified.currentIntake.confirmedNoticeSha256 = replacementSha;
      modified.trustedNotice.sha256 = replacementSha;
      modified.packet.noticeSha256 = replacementSha;
      modified.packet.intakeSha256 = debtValidationIntakeSha256(modified.currentIntake);
      return db.query(
        "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb,trusted_notice=$4::jsonb,packet=$5::jsonb WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(modified.currentIntake),
          JSON.stringify(modified.trustedNotice), JSON.stringify(modified.packet)],
      );
    }],
    ["PDF bytes", async (db) =>
      db.query("UPDATE debt_validation_matter_snapshots SET pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
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


test("PostgreSQL debt validation: changed stored controlling notice bytes block approval and checkout", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  const changedNotice = new TextEncoder().encode("Replaced notice with different payment instructions");
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, changedNotice],
  );
  await assert.rejects(approve(), /debt_validation_persisted_notice_changed/);
  const before = await db.query<{ approval: unknown }>(
    "SELECT approval FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2", [owner, matter],
  );
  assert.equal(before.rows[0]?.approval, null, "no approval is persisted for a replaced source");

  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, sourceNoticePdf],
  );
  await approve();
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, changedNotice],
  );
  let providerCalls = 0;
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    checkout: async () => { providerCalls++; return "should-not-submit"; },
  }), /debt_validation_persisted_notice_changed/);
  assert.equal(providerCalls, 0, "no mocked Stripe/Lob handoff after source replacement");
  const after = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2", [owner, matter],
  );
  assert.equal(after.rows[0]?.checkout_key, null, "no durable order claim after source replacement");
});


test("PostgreSQL debt validation: recipient confirmation revoked after approval preflight blocks atomic commit", async (t) => {
  const { db, seed, approve, armBeforeTransaction } = await setup();
  t.after(() => db.close());
  await seed();

  armBeforeTransaction(async () => {
    const changed = fixture().currentIntake;
    changed.recipientConfirmed = false;
    await db.query(
      "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter, JSON.stringify(changed)],
    );
  });

  await assert.rejects(approve(), /debt_validation_/);
  const result = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(result.rows[0]?.approval, null, "stale preflight must never persist approval");
  assert.equal(result.rows[0]?.checkout_key, null, "stale preflight must never reserve an order");
});

test("PostgreSQL debt validation: PDF replaced after checkout preflight blocks atomic claim and providers", async (t) => {
  const { db, repository, seed, approve, armBeforeTransaction } = await setup();
  t.after(() => db.close());
  await seed();
  await approve();

  armBeforeTransaction(async () => {
    await db.query(
      "UPDATE debt_validation_matter_snapshots SET pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter, new TextEncoder().encode("changed after checkout preflight")],
    );
  });

  let stripeCalls = 0;
  let lobCalls = 0;
  await assert.rejects(
    checkoutDebtValidationMatter({
      ownerId: owner, matterId: matter, repository,
      checkout: async () => {
        stripeCalls++;
        lobCalls++;
        return "must-not-submit";
      },
    }),
    /debt_validation_persisted_pdf_changed/,
  );
  assert.equal(stripeCalls, 0);
  assert.equal(lobCalls, 0);
  const result = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(result.rows[0]?.checkout_key, null, "changed bytes must never reserve an order");
});


test("PostgreSQL debt validation: controlling notice replaced after checkout preflight blocks atomic claim", async (t) => {
  const { db, repository, seed, approve, armBeforeTransaction } = await setup();
  t.after(() => db.close());
  await seed();
  await approve();

  // All preflight metadata and original bytes still match. Replace only the
  // stored controlling notice bytes immediately before the locked transaction,
  // without changing its declared SHA, document ID, revision or matter version.
  armBeforeTransaction(async () => {
    await db.query(
      "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter, new TextEncoder().encode("synthetic notice substituted after checkout preflight")],
    );
  });

  let stripeCalls = 0;
  let lobCalls = 0;
  let replayCalls = 0;
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    checkout: async () => {
      stripeCalls++;
      lobCalls++;
      return "must-not-submit";
    },
    replayCheckout: async () => {
      replayCalls++;
      return "must-not-reconcile";
    },
  }), /debt_validation_persisted_notice_changed/);

  assert.equal(stripeCalls, 0, "no mocked payment submission after notice substitution");
  assert.equal(lobCalls, 0, "no mocked mail submission after notice substitution");
  assert.equal(replayCalls, 0, "no receipt lookup without a durable claim");
  const stored = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(stored.rows[0]?.checkout_key, null, "no checkout claim committed");
});


test("PostgreSQL debt validation: failed first provider callback cannot resubmit on retry", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  await approve();

  let firstSubmissions = 0;
  await assert.rejects(
    checkoutDebtValidationMatter({
      ownerId: owner, matterId: matter, repository,
      checkout: async () => {
        firstSubmissions++;
        throw new Error("synthetic_provider_unavailable");
      },
    }),
    /synthetic_provider_unavailable/,
  );
  assert.equal(firstSubmissions, 1, "the first durable claim reaches the mock once");

  const first = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.match(first.rows[0]?.checkout_key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/);

  // A failed callback leaves an uncertain external outcome. The order claim
  // MUST remain durable: retries cannot charge or mail again, even if the
  // original callback failed before returning a receipt.
  let repeatSubmissions = 0;
  await assert.rejects(
    checkoutDebtValidationMatter({
      ownerId: owner, matterId: matter, repository,
      checkout: async () => { repeatSubmissions++; return "duplicate-submission"; },
    }),
    /debt_validation_checkout_replay_requires_receipt/,
  );
  assert.equal(repeatSubmissions, 0, "a retry without receipt reconciliation must fail closed");

  let readOnlyReplays = 0;
  const result = await checkoutDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    checkout: async () => { repeatSubmissions++; return "duplicate-submission"; },
    replayCheckout: async () => { readOnlyReplays++; return "pending-reconciliation"; },
  });
  assert.equal(result, "pending-reconciliation");
  assert.equal(readOnlyReplays, 1);
  assert.equal(repeatSubmissions, 0, "reconciliation never invokes the side-effecting callback");

  const after = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(after.rows[0]?.checkout_key, first.rows[0]?.checkout_key,
    "the original claim remains stable after provider failure and retries");
});

test("PostgreSQL debt validation: approval transaction rejects same-version source and quote races", async () => {
  const cases: Array<[string, (db: PGlite) => Promise<unknown>, RegExp]> = [
    ["controlling notice bytes", (db) => db.query(
      "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter, new TextEncoder().encode("notice swapped after approval preflight")],
    ), /debt_validation_persisted_notice_changed/],
    ["server-authoritative price", (db) => {
      const changed = fixture().packet;
      changed.totalCents += 100;
      return db.query(
        "UPDATE debt_validation_matter_snapshots SET packet=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(changed)],
      );
    }, /debt_validation_concurrent_approval_change/],
    ["physical mailing class", (db) => {
      const changed = fixture().packet;
      changed.mailClass = "registered";
      return db.query(
        "UPDATE debt_validation_matter_snapshots SET packet=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(changed)],
      );
    }, /debt_validation_concurrent_approval_change/],
  ];

  for (const [name, change, expected] of cases) {
    const { db, repository, seed, approve, armBeforeTransaction } = await setup();
    try {
      await seed();
      // The user reviewed the original packet and quote. Mutate the durable
      // record only after preflight but before the locked approval transaction.
      armBeforeTransaction(() => change(db));
      await assert.rejects(approve(), expected, name);
      const result = await db.query<{ approval: unknown; checkout_key: string | null }>(
        "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter],
      );
      assert.equal(result.rows[0]?.approval, null, name + ": no stale approval");
      assert.equal(result.rows[0]?.checkout_key, null, name + ": no order claim");
      let providerCalls = 0;
      await assert.rejects(checkoutDebtValidationMatter({
        ownerId: owner, matterId: matter, repository,
        checkout: async () => { providerCalls++; return "must-not-submit"; },
      }), /debt_validation_approval_missing/, name);
      assert.equal(providerCalls, 0, name + ": no payment or mailing handoff");
    } finally {
      await db.close();
    }
  }
});

test("debt-validation HTTP approval boundary: authenticated owner, exact review and fail-closed mutations", async () => {
  const origin = "https://mailmypdf.example";
  const request = (payload: Record<string, unknown>, options: { origin?: string; token?: string } = {}) =>
    new Request(origin + "/api/debt-validation/approval", {
      method: "POST",
      headers: {
        origin: options.origin ?? origin,
        authorization: options.token ?? "Bearer synthetic-owner-a",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  const reviewed = {
    matterId: matter,
    reviewedPdfSha256: sha(pdf),
    reviewedTotalCents: 1499,
    reviewedMailClass: "certified",
    userApprovedExactPacket: true,
  };
  const fresh = async (snapshot = fixture()) => {
    const state = await setup();
    await state.seed(owner, snapshot);
    const handle = createDebtValidationApprovalHttpHandler({
      allowedOrigin: origin,
      repository: state.repository,
      authenticate: async (req) => {
        const token = req.headers.get("authorization");
        return token === "Bearer synthetic-owner-a" ? { id: owner }
          : token === "Bearer synthetic-owner-b" ? { id: other } : null;
      },
    });
    return { ...state, handle };
  };

  {
    const { db, handle } = await fresh();
    try {
      const success = await handle(request(reviewed));
      assert.equal(success.status, 200);
      assert.equal((await success.json()).code, "approved");
      assert.equal((await handle(request(reviewed))).status, 200,
        "same exact packet approval retry is idempotent");
      const stored = await db.query<{ approval: unknown; checkout_key: string | null }>(
        "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter],
      );
      assert.ok(stored.rows[0]?.approval, "only an explicit reviewed packet may be approved");
      assert.equal(stored.rows[0]?.checkout_key, null, "HTTP approval never claims an order");
      assert.equal((await handle(request(reviewed, { origin: "https://attacker.example" }))).status, 403);
      assert.equal((await handle(request(reviewed, { token: "Bearer invalid" }))).status, 401);
      assert.equal((await handle(request(reviewed, { token: "Bearer synthetic-owner-b" }))).status, 409,
        "another authenticated owner cannot approve this matter");
      assert.equal((await handle(request({ ...reviewed, ownerId: other }))).status, 400,
        "request-supplied owner is never authoritative");
      assert.equal((await handle(request({ ...reviewed, userApprovedExactPacket: false }))).status, 400);
    } finally {
      await db.close();
    }
  }

  for (const [label, mutate] of [
    ["confirmation revoked", (snapshot: DebtValidationMatterSnapshot) => {
      snapshot.currentIntake.recipientConfirmed = false;
    }],
    ["recipient changed", (snapshot: DebtValidationMatterSnapshot) => {
      snapshot.currentIntake.collectorResponseAddress = "Example Collections\nPO Box 999\nAustin, TX 78701";
    }],
    ["controlling notice replaced", (snapshot: DebtValidationMatterSnapshot) => {
      snapshot.currentIntake.noticeSha256 = "a".repeat(64);
    }],
  ] as Array<[string, (snapshot: DebtValidationMatterSnapshot) => void]>) {
    const snapshot = fixture();
    mutate(snapshot);
    const { db, handle } = await fresh(snapshot);
    try {
      const rejected = await handle(request(reviewed));
      assert.equal(rejected.status, 409, label);
      const stored = await db.query<{ approval: unknown; checkout_key: string | null }>(
        "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter],
      );
      assert.equal(stored.rows[0]?.approval, null, label + ": no approval");
      assert.equal(stored.rows[0]?.checkout_key, null, label + ": no checkout claim");
    } finally {
      await db.close();
    }
  }
});

test("debt-validation HTTP approval: malformed, cross-origin and altered quote requests cannot persist consent", async (t) => {
  const { db, repository, seed } = await setup();
  t.after(() => db.close());
  await seed();
  const origin = "https://mailmypdf.example";
  const handle = createDebtValidationApprovalHttpHandler({
    allowedOrigin: origin,
    repository,
    authenticate: async (request) =>
      request.headers.get("authorization") === "Bearer synthetic-owner-a"
        ? { id: owner } : null,
  });
  const reviewed = {
    matterId: matter,
    reviewedPdfSha256: sha(pdf),
    reviewedTotalCents: 1499,
    reviewedMailClass: "certified",
    userApprovedExactPacket: true,
  };
  const request = (body: string, headers: Record<string, string> = {}) =>
    new Request(origin + "/api/debt-validation/approval", {
      method: "POST",
      headers: {
        origin,
        authorization: "Bearer synthetic-owner-a",
        "content-type": "application/json",
        ...headers,
      },
      body,
    });
  const json = (payload: Record<string, unknown>, headers?: Record<string, string>) =>
    request(JSON.stringify(payload), headers);
  const cases: Array<[string, Request, number]> = [
    ["cross-site origin", json(reviewed, { origin: "https://attacker.example" }), 403],
    ["missing origin", json(reviewed, { origin: "" }), 403],
    ["missing authentication", json(reviewed, { authorization: "" }), 401],
    ["missing explicit consent", json({ ...reviewed, userApprovedExactPacket: false }), 400],
    ["changed reviewed price", json({ ...reviewed, reviewedTotalCents: 1599 }), 409],
    ["changed reviewed mailing class", json({ ...reviewed, reviewedMailClass: "registered" }), 409],
    ["unreviewed packet digest", json({ ...reviewed, reviewedPdfSha256: "a".repeat(64) }), 409],
    ["negative quote", json({ ...reviewed, reviewedTotalCents: -1 }), 409],
    ["client-supplied trusted notice", json({ ...reviewed, trustedNotice: {} }), 400],
    ["client-supplied approval binding", json({ ...reviewed, binding: {} }), 400],
    ["client-supplied packet", json({ ...reviewed, packet: {} }), 400],
    ["malformed JSON", request("{not-json"), 400],
    ["non-JSON content type", json(reviewed, { "content-type": "text/plain" }), 415],
    ["oversized request", request(JSON.stringify({ ...reviewed, padding: "x".repeat(9000) })), 413],
    ["spoofed small content length", request(
      JSON.stringify({ ...reviewed, padding: "x".repeat(9000) }),
      { "content-length": "1" },
    ), 413],
  ];
  for (const [label, input, status] of cases) {
    const result = await handle(input);
    assert.equal(result.status, status, label);
    const stored = await db.query<{ approval: unknown; checkout_key: string | null }>(
      "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter],
    );
    assert.equal(stored.rows[0]?.approval, null, label + ": no persisted approval");
    assert.equal(stored.rows[0]?.checkout_key, null, label + ": no checkout reservation");
  }
  const accepted = await handle(json(reviewed));
  assert.equal(accepted.status, 200, "a subsequent valid explicit approval remains available");
  assert.equal((await accepted.json()).code, "approved");
});
