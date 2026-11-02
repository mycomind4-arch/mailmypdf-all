import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

// Executes the EXACT versioned SQL, not a hand-written lookalike fixture.
// Local embedded PostgreSQL only; never connects to hosted Supabase/providers.
const migration = readFileSync(
  new URL("../supabase/migrations/20261102180000_debt_validation_private_matter_ledger.sql", import.meta.url),
  "utf8",
);
const ownerA = "00000000-0000-4000-8000-000000000001";
const ownerB = "00000000-0000-4000-8000-000000000002";
const matter = "synthetic-matter";
const keyA = "debt_validation_checkout_" + "a".repeat(64);
const keyB = "debt_validation_checkout_" + "b".repeat(64);

function packetFixture(ownerId: string, matterId = matter) {
  return {
    ownerId, matterId, matterVersion: 1, totalCents: 1499,
    mailClass: "certified", pdfSha256: "a".repeat(64),
    enclosureManifestSha256: "b".repeat(64), intakeSha256: "c".repeat(64),
    recipientAddress: "Synthetic Collector\\nPO Box 123\\nAustin, TX 78701",
    noticeDocumentId: "notice-1", noticeSha256: "a".repeat(64),
    noticeVersion: 1,
  };
}

function approvalFixture(ownerId: string, matterId = matter) {
  return { ...packetFixture(ownerId, matterId) };
}

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to authenticated;
  `);
  await db.exec(migration);
  await db.query("insert into auth.users(id) values ($1),($2)", [ownerA, ownerB]);
  return db;
}

async function seed(db: PGlite, ownerId: string, matterId = matter) {
  return db.query(
    `insert into public.debt_validation_matter_snapshots
      (owner_id,matter_id,current_intake,trusted_notice,packet,pdf_bytes,notice_pdf_bytes)
      values ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::bytea,$7::bytea)
      on conflict (owner_id,matter_id) do nothing returning owner_id`,
    [ownerId, matterId, JSON.stringify({ recipientConfirmed: true }),
      JSON.stringify({ ownerId, matterId, sha256: "a".repeat(64) }),
      JSON.stringify(packetFixture(ownerId, matterId)),
      new TextEncoder().encode("%PDF-1.4\nSynthetic response\n%%EOF"),
      new TextEncoder().encode("%PDF-1.4\nSynthetic notice\n%%EOF")],
  );
}

async function claim(db: PGlite, ownerId: string, checkoutKey: string) {
  await db.query(
    "update public.debt_validation_matter_snapshots set approval=$3::jsonb where owner_id=$1 and matter_id=$2",
    [ownerId, matter, JSON.stringify(approvalFixture(ownerId))],
  );
  await db.query(
    "update public.debt_validation_matter_snapshots set checkout_key=$3 where owner_id=$1 and matter_id=$2",
    [ownerId, matter, checkoutKey],
  );
}

async function receipt(db: PGlite, ownerId: string, checkoutKey: string, kind: string,
  provider: string, reference: string, evidence = "c".repeat(64)) {
  return db.query(
    `insert into public.debt_validation_checkout_receipts
      (owner_id,matter_id,checkout_key,kind,provider,provider_reference,evidence_sha256)
      values ($1,$2,$3,$4,$5,$6,$7)`,
    [ownerId, matter, checkoutKey, kind, provider, reference, evidence],
  );
}

test("debt-validation migration rejects preapproved matter creation even from a privileged SQL caller", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  const insertPreapproved = (approval: object | null, checkoutKey: string | null) => db.query(
    `insert into public.debt_validation_matter_snapshots
      (owner_id,matter_id,current_intake,trusted_notice,packet,pdf_bytes,notice_pdf_bytes,approval,checkout_key)
      values ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::bytea,$7::bytea,$8::jsonb,$9)`,
    [ownerA, matter, JSON.stringify({ recipientConfirmed: true }),
      JSON.stringify({ ownerId: ownerA, matterId: matter, sha256: "a".repeat(64) }),
      JSON.stringify({ ownerId: ownerA, matterId: matter, matterVersion: 1 }),
      new TextEncoder().encode("%PDF-1.4\\nSynthetic response\\n%%EOF"),
      new TextEncoder().encode("%PDF-1.4\\nSynthetic notice\\n%%EOF"),
      approval === null ? null : JSON.stringify(approval), checkoutKey],
  );
  await assert.rejects(
    insertPreapproved({ matterVersion: 1, pdfSha256: "a".repeat(64) }, null),
    /debt_validation_initial_approval_forbidden/,
    "privileged SQL must not fabricate approval during matter creation",
  );
  await assert.rejects(
    insertPreapproved({ matterVersion: 1, pdfSha256: "a".repeat(64) }, keyA),
    /debt_validation_initial_approval_forbidden/,
    "privileged SQL must not bypass both approval and checkout stages",
  );
  const absent = await db.query("select owner_id from public.debt_validation_matter_snapshots");
  assert.equal(absent.rows.length, 0, "rejected inserts must not leave partial matter state");
  await seed(db, ownerA);
  const created = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "select approval,checkout_key from public.debt_validation_matter_snapshots where owner_id=$1 and matter_id=$2",
    [ownerA, matter],
  );
  assert.equal(created.rows.length, 1, "normal unapproved matter creation still succeeds");
  assert.equal(created.rows[0]!.approval, null);
  assert.equal(created.rows[0]!.checkout_key, null);
});

test("debt-validation SQL rejects an approval for a different owner, PDF, quote or notice", async (t) => {
  // Execute the actual unapplied migration as a privileged SQL caller. This
  // checks structural integrity only, not genuine user consent or Stripe/Lob.
  const db = await setup();
  t.after(() => db.close());
  await seed(db, ownerA);
  const approval = approvalFixture(ownerA);
  for (const [label, changed] of [
    ["other owner", { ownerId: ownerB }],
    ["other PDF", { pdfSha256: "f".repeat(64) }],
    ["changed price", { totalCents: 1 }],
    ["changed enclosure", { enclosureManifestSha256: "e".repeat(64) }],
    ["missing source identity", { noticeSha256: undefined }],
  ] as const) {
    await assert.rejects(
      db.query(
        "update public.debt_validation_matter_snapshots set approval=$3::jsonb where owner_id=$1 and matter_id=$2",
        [ownerA, matter, JSON.stringify({ ...approval, ...changed })],
      ),
      /debt_validation_approval_packet_mismatch/,
      label + " cannot become a durable approval",
    );
  }
  const before = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "select approval,checkout_key from public.debt_validation_matter_snapshots where owner_id=$1 and matter_id=$2",
    [ownerA, matter],
  );
  assert.equal(before.rows[0]?.approval, null);
  assert.equal(before.rows[0]?.checkout_key, null);
  await claim(db, ownerA, keyA);
  const after = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "select approval,checkout_key from public.debt_validation_matter_snapshots where owner_id=$1 and matter_id=$2",
    [ownerA, matter],
  );
  assert.deepEqual(after.rows[0]?.approval, approval, "matching approval still works");
  assert.equal(after.rows[0]?.checkout_key, keyA);
});

test("debt-validation migration applies offline and owner-scoped RLS denies other users and all browser writes", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  await seed(db, ownerA);
  await seed(db, ownerB);
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ownerA}';`);
  const own = await db.query<{ owner_id: string }>(
    "select owner_id from public.debt_validation_matter_snapshots order by owner_id",
  );
  assert.deepEqual(own.rows.map((row) => row.owner_id), [ownerA]);
  const foreign = await db.query(
    "select owner_id from public.debt_validation_matter_snapshots where owner_id=$1",
    [ownerB],
  );
  assert.equal(foreign.rows.length, 0, "even a guessed other-owner ID cannot disclose PDF bytes");
  await assert.rejects(
    db.query("update public.debt_validation_matter_snapshots set approval='{}'::jsonb where owner_id=$1", [ownerA]),
    /permission denied/,
  );
  await assert.rejects(
    db.query("delete from public.debt_validation_matter_snapshots where owner_id=$1", [ownerA]),
    /permission denied/,
  );
  await assert.rejects(
    db.query(`insert into public.debt_validation_checkout_receipts
      (owner_id,matter_id,checkout_key,kind,provider,provider_reference,evidence_sha256)
      values ($1,$2,$3,'payment','fake','pi_fake',$4)`,
    [ownerA, matter, keyA, "c".repeat(64)]),
    /permission denied/,
  );
  await db.exec("reset role; reset request.jwt.claim.sub;");
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ownerB}';`);
  const otherOwn = await db.query<{ owner_id: string }>(
    "select owner_id from public.debt_validation_matter_snapshots",
  );
  assert.deepEqual(otherOwn.rows.map((row) => row.owner_id), [ownerB]);
  await db.exec("reset role; reset request.jwt.claim.sub;");
});

test("debt-validation migration freezes source/packet identity and makes approval and checkout one-way", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  await assert.rejects(
    db.query(`insert into public.debt_validation_matter_snapshots
      (owner_id,matter_id,current_intake,trusted_notice,packet,pdf_bytes,notice_pdf_bytes)
      values ($1,$2,'{}'::jsonb,$3::jsonb,$4::jsonb,$5::bytea,$6::bytea)`,
      [ownerA, matter, JSON.stringify({ matterId: matter }),
        JSON.stringify({ ownerId: ownerA, matterId: matter }),
        new TextEncoder().encode("pdf"), new TextEncoder().encode("notice")]),
    /check constraint/,
    "missing trusted-notice owner identity must not pass SQL's nullable CHECK semantics",
  );
  await seed(db, ownerA);
  await assert.rejects(
    db.query("update public.debt_validation_matter_snapshots set checkout_key=$3 where owner_id=$1 and matter_id=$2",
      [ownerA, matter, keyA]),
    /approval_must_precede_checkout/,
  );
  for (const [field, value] of [
    ["pdf_bytes", new TextEncoder().encode("changed PDF")],
    ["notice_pdf_bytes", new TextEncoder().encode("changed notice")],
    ["trusted_notice", JSON.stringify({ ownerId: ownerB, matterId: matter })],
    ["packet", JSON.stringify({ ownerId: ownerA, matterId: matter, matterVersion: 2 })],
  ] as const) {
    const cast = field === "trusted_notice" || field === "packet" ? "::jsonb" : "::bytea";
    await assert.rejects(
      db.query(`update public.debt_validation_matter_snapshots set ${field}=$3${cast}
        where owner_id=$1 and matter_id=$2`, [ownerA, matter, value]),
      /immutable_packet_identity/,
    );
  }
  await claim(db, ownerA, keyA);
  await assert.rejects(
    db.query("update public.debt_validation_matter_snapshots set approval=$3::jsonb where owner_id=$1 and matter_id=$2",
      [ownerA, matter, JSON.stringify({ changed: true })]),
    /immutable_approval/,
  );
  await assert.rejects(
    db.query("update public.debt_validation_matter_snapshots set checkout_key=$3 where owner_id=$1 and matter_id=$2",
      [ownerA, matter, keyB]),
    /immutable_checkout_claim/,
  );
});

test("debt-validation migration enforces exact checkout FKs, one handoff and globally unique provider references", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  await seed(db, ownerA);
  await seed(db, ownerB);
  await claim(db, ownerA, keyA);
  await claim(db, ownerB, keyB);
  await receipt(db, ownerA, keyA, "payment", "mock_stripe", "pi_unique");
  // Direct service-role SQL must not treat whitespace variants as different
  // provider IDs, even if an application adapter was accidentally bypassed.
  for (const reference of ["pi_unique ", " pi_unique", "pi_uni que", "pi_unique\t"]) {
    await assert.rejects(
      receipt(db, ownerB, keyB, "payment", "mock_stripe", reference),
      /check constraint/,
      "SQL must reject whitespace before checking provider uniqueness",
    );
  }
  await assert.rejects(
    receipt(db, ownerB, keyB, "payment", "MOCK_STRIPE", "pi_unique"),
    /duplicate key/,
  );
  await assert.rejects(
    receipt(db, ownerB, keyA, "payment", "mock_stripe", "pi_wrong_owner"),
    /foreign key/,
  );
  await receipt(db, ownerB, keyB, "payment", "mock_stripe", "pi_other");
  await db.query(
    "insert into public.debt_validation_mailing_handoffs(owner_id,matter_id,checkout_key) values ($1,$2,$3)",
    [ownerA, matter, keyA],
  );
  await assert.rejects(
    db.query("insert into public.debt_validation_mailing_handoffs(owner_id,matter_id,checkout_key) values ($1,$2,$3)",
      [ownerA, matter, keyA]),
    /duplicate key/,
  );
  await receipt(db, ownerA, keyA, "mailing", "mock_lob", "letter_unique");
  await assert.rejects(
    receipt(db, ownerB, keyB, "mailing", "mock_lob", "letter_unique "),
    /check constraint/,
    "SQL must reject whitespace variants of mailing provider references",
  );
  // With payment already recorded for B, reserve its own handoff before
  // testing cross-owner provider-reference uniqueness. The SQL stage guard
  // must not mask the actual uniqueness assertion.
  await db.query(
    "insert into public.debt_validation_mailing_handoffs(owner_id,matter_id,checkout_key) values ($1,$2,$3)",
    [ownerB, matter, keyB],
  );
  await assert.rejects(
    receipt(db, ownerB, keyB, "mailing", "MOCK_LOB", "letter_unique"),
    /duplicate key/,
  );
  await assert.rejects(
    db.query("update public.debt_validation_checkout_receipts set provider_reference='changed' where owner_id=$1",
      [ownerA]),
    /immutable_provider_evidence/,
  );
  await assert.rejects(
    db.query("update public.debt_validation_mailing_handoffs set checkout_key=$3 where owner_id=$1 and matter_id=$2",
      [ownerA, matter, keyB]),
    /immutable_provider_evidence/,
  );
});

test("debt-validation SQL refuses mailing handoff or receipt until payment and reservation are persisted", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  await seed(db, ownerA);
  await claim(db, ownerA, keyA);
  const reserve = () => db.query(
    "insert into public.debt_validation_mailing_handoffs(owner_id,matter_id,checkout_key) values ($1,$2,$3)",
    [ownerA, matter, keyA],
  );
  await assert.rejects(
    reserve(),
    /debt_validation_verified_payment_required/,
    "a checkout claim alone must never authorize physical mailing",
  );
  await assert.rejects(
    receipt(db, ownerA, keyA, "mailing", "mock_lob", "letter_unpaid"),
    /debt_validation_verified_payment_required/,
    "a direct service-role mailing acknowledgement cannot bypass payment verification",
  );
  await receipt(db, ownerA, keyA, "payment", "mock_stripe", "pi_paid");
  await assert.rejects(
    receipt(db, ownerA, keyA, "mailing", "mock_lob", "letter_unreserved"),
    /debt_validation_mailing_handoff_required/,
    "payment alone cannot certify a mailing without its durable handoff reservation",
  );
  await reserve();
  await receipt(db, ownerA, keyA, "mailing", "mock_lob", "letter_reserved");
  const recorded = await db.query<{ kind: string }>(
    "select kind from public.debt_validation_checkout_receipts where owner_id=$1 and matter_id=$2 order by kind",
    [ownerA, matter],
  );
  assert.deepEqual(recorded.rows.map((row) => row.kind), ["mailing", "payment"]);
});

test("debt-validation migration scopes both provider-ledger tables to the authenticated owner", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  for (const [ownerId, checkoutKey, suffix] of [
    [ownerA, keyA, "a"],
    [ownerB, keyB, "b"],
  ] as const) {
    await seed(db, ownerId);
    await claim(db, ownerId, checkoutKey);
    await receipt(db, ownerId, checkoutKey, "payment", "mock_stripe", "pi_owner_" + suffix);
    await db.query(
      "insert into public.debt_validation_mailing_handoffs(owner_id,matter_id,checkout_key) values ($1,$2,$3)",
      [ownerId, matter, checkoutKey],
    );
    await receipt(db, ownerId, checkoutKey, "mailing", "mock_lob", "letter_owner_" + suffix);
  }

  // Exercise the exact migration's GRANTs and RLS policies as a browser role,
  // not as the privileged fixture setup role that bypasses owner isolation.
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ownerA}';`);
  for (const [table, expectedCount] of [
    ["debt_validation_mailing_handoffs", 1],
    ["debt_validation_checkout_receipts", 2],
  ] as const) {
    const visible = await db.query<{ owner_id: string }>(
      `select owner_id from public.${table} order by owner_id`,
    );
    assert.equal(visible.rows.length, expectedCount);
    assert.ok(visible.rows.every((row) => row.owner_id === ownerA),
      `${table} must expose only the authenticated owner's records`);
    const foreign = await db.query(
      `select owner_id from public.${table} where owner_id=$1`,
      [ownerB],
    );
    assert.equal(foreign.rows.length, 0,
      `${table} must not disclose a guessed other-owner receipt or handoff`);
  }
  await assert.rejects(
    db.query("delete from public.debt_validation_checkout_receipts where owner_id=$1", [ownerA]),
    /permission denied/,
    "an authenticated browser cannot erase its own payment or mailing evidence",
  );
  await assert.rejects(
    db.query("delete from public.debt_validation_mailing_handoffs where owner_id=$1", [ownerA]),
    /permission denied/,
    "an authenticated browser cannot erase its own mailing reservation",
  );
  await db.exec("reset role; reset request.jwt.claim.sub;");

  await db.exec("set role anon;");
  for (const table of ["debt_validation_mailing_handoffs", "debt_validation_checkout_receipts"]) {
    await assert.rejects(
      db.query(`select owner_id from public.${table}`),
      /permission denied/,
      `anonymous clients must not read ${table}`,
    );
  }
  await db.exec("reset role;");
});

test("debt-validation migration rejects duplicate matter creation under overlapping attempts", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  // PGlite serializes one connection; this exercises the actual database
  // uniqueness/ON CONFLICT boundary, not multi-process transaction races.
  const outcomes = await Promise.all([
    seed(db, ownerA),
    seed(db, ownerA),
  ]);
  assert.deepEqual(outcomes.map((outcome) => outcome.rows.length).sort(), [0, 1]);
  const rows = await db.query("select owner_id from public.debt_validation_matter_snapshots");
  assert.equal(rows.rows.length, 1);
});
