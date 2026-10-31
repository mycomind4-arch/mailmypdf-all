import { createDebtValidationApprovalHttpHandler, createDebtValidationCheckoutHttpHandler, createDebtValidationPacketReviewHttpHandler } from "../src/lib/secure-core/debt-validation-approval-http.server";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { generatePlainTextPdf } from "@mailmypdf/packet-builder";
import { calculateQuote } from "../../packages/pricing/src/index";
import { createLocalDebtValidationPdfPreview } from "../../dispute-mail/workflows/debt-validation/pdf-preview";
import { prepareDebtValidationMatterPacket } from "../../dispute-mail/workflows/debt-validation/server-packet-preparation";
import {
  createPostgresDebtValidationMatterRepository,
  prepareAndPersistDebtValidationMatter,
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
  const seed = async (ownerId = owner, snapshot = fixture(ownerId), bytes = pdf, noticeBytes = sourceNoticePdf) =>
    db.query(
      "INSERT INTO debt_validation_matter_snapshots (owner_id,matter_id,current_intake,trusted_notice,packet,pdf_bytes,notice_pdf_bytes) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::bytea,$7::bytea)",
      [ownerId, matter, JSON.stringify(snapshot.currentIntake),
        JSON.stringify(snapshot.trustedNotice), JSON.stringify(snapshot.packet), bytes, noticeBytes],
    );
  const approve = (ownerId = owner) => approveDebtValidationMatter({
    ownerId, matterId: matter, repository,
    reviewedPdfSha256: sha(pdf), reviewedTotalCents: 1499,
    reviewedMailClass: "certified", userApprovedExactPacket: true,
  });
  return { db, repository, seed, approve, armBeforeTransaction };
}

function sqlFromDb(db: PGlite): DebtValidationSqlDatabase {
  return {
    query: (statement, parameters = []) => db.query(statement, parameters),
    transaction: (work) => db.transaction(async (tx) =>
      work({ query: (statement, parameters = []) => tx.query(statement, parameters) })),
  };
}

test("debt-validation review summary binds the exact physical envelope to the stored PDF and quote", async (t) => {
  // Isolated PGlite; the summary must be useful for a future authenticated
  // approval UI without trusting any browser-supplied postal or price fields.
  const { db, repository, seed } = await setup();
  t.after(() => db.close());
  await seed();
  const origin = "https://mailmypdf.example";
  const handle = createDebtValidationPacketReviewHttpHandler({
    allowedOrigin: origin, repository,
    authenticate: async (request) => request.headers.get("authorization") === "Bearer owner-a"
      ? { id: owner } : request.headers.get("authorization") === "Bearer owner-b"
        ? { id: other } : null,
  });
  const url = origin + "/api/debt-validation/review?view=summary&matterId=" + matter;
  const request = (authorization = "Bearer owner-a", suffix = "") =>
    new Request(url + suffix, { headers: { authorization } });
  assert.equal((await handle(request(""))).status, 401);
  assert.equal((await handle(request("Bearer owner-b"))).status, 404,
    "another owner must not see the collector's postal address or quote");
  assert.equal((await handle(request("Bearer owner-a", "&recipientAddress=attacker"))).status, 400,
    "browser-selected envelope fields must never be accepted");
  assert.equal((await handle(request("Bearer owner-a", "&view=summary"))).status, 400,
    "duplicate query keys must fail closed");
  const summary = await handle(request());
  assert.equal(summary.status, 200);
  assert.match(summary.headers.get("content-type") ?? "", /application\/json/);
  assert.match(summary.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await summary.json(), {
    code: "review_ready",
    matterId: matter,
    pdfSha256: sha(pdf),
    totalCents: 1499,
    mailClass: "certified",
    recipientAddress: address,
    returnAddress: "Synthetic Consumer\n123 Example St\nSacramento, CA 95814",
    noticeDocumentId: "notice-1",
    noticeSha256: sha(sourceNoticePdf),
    noticeVersion: 1,
  });
  // The summary cannot rely on unchanged metadata if the controlling notice
  // bytes were replaced; neither a false review nor an order is permitted.
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3 WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, new TextEncoder().encode("%PDF-1.4\nDifferent notice\n%%EOF")],
  );
  assert.equal((await handle(request())).status, 409);
  const state = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(state.rows[0]?.approval, null, "review cannot grant approval");
  assert.equal(state.rows[0]?.checkout_key, null, "review cannot reserve checkout");
});

test("debt-validation review isolates envelope summaries for owners sharing a matter ID", async (t) => {
  // Matter IDs are only unique within an owner. Even when the same PDF bytes,
  // collector and matter ID are used, the private return address and reviewed
  // envelope must come from the authenticated owner's stored intake.
  // Isolated PGlite only: no production database, approval or provider calls.
  const { db, repository, seed } = await setup();
  t.after(() => db.close());
  await seed(owner);
  const second = fixture(other);
  second.currentIntake.consumerName = "Synthetic Consumer B";
  second.currentIntake.consumerMailingAddress = "77 Test Road\nEureka, CA 95501";
  second.packet.intakeSha256 = debtValidationIntakeSha256(second.currentIntake);
  await seed(other, second);

  const origin = "https://mailmypdf.example";
  const review = createDebtValidationPacketReviewHttpHandler({
    allowedOrigin: origin, repository,
    authenticate: async (request) =>
      request.headers.get("authorization") === "Bearer owner-a" ? { id: owner }
        : request.headers.get("authorization") === "Bearer owner-b" ? { id: other } : null,
  });
  const url = origin + "/api/debt-validation/review?matterId=" + matter + "&view=summary";
  const read = async (token: string) => review(new Request(url, {
    headers: { authorization: "Bearer " + token },
  }));
  const responseA = await read("owner-a");
  const responseB = await read("owner-b");
  assert.equal(responseA.status, 200);
  assert.equal(responseB.status, 200);
  const summaryA = await responseA.json();
  const summaryB = await responseB.json();
  assert.equal(summaryA.returnAddress, "Synthetic Consumer\n123 Example St\nSacramento, CA 95814");
  assert.equal(summaryB.returnAddress, "Synthetic Consumer B\n77 Test Road\nEureka, CA 95501");
  assert.equal(summaryA.recipientAddress, address);
  assert.equal(summaryB.recipientAddress, address);
  assert.equal(summaryA.pdfSha256, summaryB.pdfSha256,
    "identical PDF digests do not collapse distinct owner-scoped review records");

  const denied = await review(new Request(url + "&ownerId=" + other, {
    headers: { authorization: "Bearer owner-a" },
  }));
  assert.equal(denied.status, 400, "the browser cannot select another owner's review");
  const state = await db.query<{ owner_id: string; approval: unknown; checkout_key: string | null }>(
    "SELECT owner_id,approval,checkout_key FROM debt_validation_matter_snapshots ORDER BY owner_id",
  );
  assert.equal(state.rows.length, 2);
  for (const row of state.rows) {
    assert.equal(row.approval, null, row.owner_id + ": review must not grant approval");
    assert.equal(row.checkout_key, null, row.owner_id + ": review must not reserve mailing");
  }
});

test("debt-validation HTTP read-only review rejects silently replaced controlling notice bytes", async (t) => {
  // The persisted letter may still hash correctly while the controlling
  // collection notice has been replaced without updating its metadata.
  // Do not present that letter/quote as review-ready for approval.
  const { db, repository, seed } = await setup();
  t.after(() => db.close());
  await seed();
  const origin = "https://mailmypdf.example";
  const handle = createDebtValidationPacketReviewHttpHandler({
    allowedOrigin: origin,
    repository,
    authenticate: async () => ({ id: owner }),
  });
  const request = () => new Request(origin + "/api/debt-validation/review?matterId=" + matter);
  const original = await handle(request());
  assert.equal(original.status, 200, "unchanged notice permits exact PDF review");
  assert.equal(original.headers.get("x-reviewed-pdf-sha256"), sha(pdf));

  // Only bytes change: source SHA, document ID, revision, recipient and
  // packet metadata are intentionally unchanged to expose a stale-read gap.
  const replaced = new TextEncoder().encode("%PDF-1.4\\nDifferent synthetic controlling notice\\n%%EOF");
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3 WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, replaced],
  );
  const denied = await handle(request());
  assert.equal(denied.status, 409, "changed source bytes must block read-only review");
  assert.deepEqual(await denied.json(), { code: "debt_validation_persisted_notice_changed" });
  const stored = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(stored.rows[0]?.approval, null, "review never grants approval");
  assert.equal(stored.rows[0]?.checkout_key, null, "review never claims checkout");
  // No provider adapter is supplied by this review handler, so it cannot
  // submit mocked or real payments/mailings in either outcome.

  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3 WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, sourceNoticePdf],
  );
  const restored = await handle(request());
  assert.equal(restored.status, 200, "restoring exact source bytes permits review");
  assert.equal(restored.headers.get("x-reviewed-pdf-sha256"), sha(pdf));
});

test("debt-validation real generated physical-mail packet traverses isolated approval and mocked checkout", async (t) => {
  // Unlike synthetic %PDF fixtures, this proves the actual canonical PDF
  // builder, server quote, immutable packet and SQL/HTTP boundaries agree.
  // PGlite is isolated; no hosted database, Stripe, Lob or mailing is used.
  const { db, repository } = await setup();
  t.after(() => db.close());
  const noticeBytes = await generatePlainTextPdf(
    "Synthetic collection notice for offline integration testing. PO Box 456, Austin TX 78701.",
  );
  const noticeSha = sha(noticeBytes);
  const base = fixture();
  const intake = {
    ...base.currentIntake,
    noticeSha256: noticeSha,
    confirmedNoticeSha256: noticeSha,
  };
  const trustedNotice = { ...base.trustedNotice, sha256: noticeSha };
  const letterDate = "2026-10-30";
  const preview = await createLocalDebtValidationPdfPreview(intake, letterDate);
  const quote = calculateQuote({
    workflowId: "debt-validation",
    verticalId: "dispute-mail",
    actualPages: preview.responsePages,
    supportingPages: preview.supportingPages,
    mailClass: "certified",
  });
  const prepared = await prepareDebtValidationMatterPacket({
    ownerId: owner, matterId: matter, matterVersion: 2,
    totalCents: quote.totalCents, mailClass: "certified",
    letterDate, intake, trustedNotice, noticePdfBytes: noticeBytes,
  });
  assert.equal(prepared.packet.totalCents, quote.totalCents);
  assert.equal(prepared.packet.pdfSha256, sha(prepared.pdfBytes));
  assert.equal(prepared.packet.noticeSha256, noticeSha);
  assert.equal(prepared.supportingPages, 0, "source notice is evidence, not an enclosure");
  assert.deepEqual(prepared.manifest, []);
  // Exercise the actual server-side create-only persistence bridge rather
  // than seeding the SQL row by hand. Missing confirmation or a replaced
  // controlling notice must never create a reviewable matter.
  const input = {
    ownerId: owner, matterId: matter, matterVersion: 2,
    totalCents: quote.totalCents, mailClass: "certified" as const,
    letterDate, intake, trustedNotice, noticePdfBytes: noticeBytes,
  };
  await assert.rejects(
    prepareAndPersistDebtValidationMatter(sqlFromDb(db), {
      ...input, intake: { ...intake, recipientConfirmed: false },
    }),
    /debt_validation_invalid_intake/,
  );
  const empty = await db.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM debt_validation_matter_snapshots",
  );
  assert.equal(empty.rows[0]?.count, "0", "invalid recipient confirmation cannot persist a matter");
  const storedPacket = await prepareAndPersistDebtValidationMatter(sqlFromDb(db), input);
  assert.equal(storedPacket.totalCents, quote.totalCents);
  assert.equal(storedPacket.noticeSha256, noticeSha);
  await assert.rejects(
    prepareAndPersistDebtValidationMatter(sqlFromDb(db), input),
    /debt_validation_matter_already_exists/,
    "a second create cannot overwrite a previously reviewable packet",
  );
  const replacedNotice = await generatePlainTextPdf("A different synthetic controlling notice.");
  await assert.rejects(
    prepareAndPersistDebtValidationMatter(sqlFromDb(db), {
      ...input, noticePdfBytes: replacedNotice,
    }),
    /debt_validation_source_integrity/,
  );

  const origin = "https://mailmypdf.example";
  const authenticate = async (request: Request) =>
    request.headers.get("authorization") === "Bearer synthetic-owner-a"
      ? { id: owner } : null;
  // The authenticated customer must be able to inspect the exact persisted
  // server PDF, not merely a browser-generated approximation, before consent.
  // The review boundary is read-only: no approval, order or provider call.
  const review = createDebtValidationPacketReviewHttpHandler({
    allowedOrigin: origin, repository,
    authenticate: async (request) => {
      const authorization = request.headers.get("authorization");
      return authorization === "Bearer synthetic-owner-a" ? { id: owner }
        : authorization === "Bearer synthetic-owner-b" ? { id: other } : null;
    },
  });
  const reviewUrl = origin + "/api/debt-validation/review?matterId=" + encodeURIComponent(matter);
  const reviewRequest = (authorization = "Bearer synthetic-owner-a", headers: Record<string, string> = {}) =>
    new Request(reviewUrl, { headers: { authorization, ...headers } });
  assert.equal((await review(new Request(reviewUrl))).status, 401, "unauthenticated PDF review denied");
  assert.equal((await review(reviewRequest("Bearer synthetic-owner-b"))).status, 404,
    "other customer cannot read this matter's packet");
  assert.equal((await review(reviewRequest("Bearer synthetic-owner-a", { "sec-fetch-site": "cross-site" }))).status, 403,
    "cross-site embedding cannot request private review bytes");
  assert.equal((await review(new Request(reviewUrl + "&ownerId=" + other, {
    headers: { authorization: "Bearer synthetic-owner-a" },
  }))).status, 400, "browser cannot select an owner for review");
  const previewResponse = await review(reviewRequest());
  assert.equal(previewResponse.status, 200);
  assert.equal(previewResponse.headers.get("content-type"), "application/pdf");
  assert.match(previewResponse.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(previewResponse.headers.get("x-reviewed-pdf-sha256"), storedPacket.pdfSha256);
  assert.equal(previewResponse.headers.get("x-reviewed-total-cents"), String(quote.totalCents));
  assert.equal(previewResponse.headers.get("x-reviewed-mail-class"), "certified");
  assert.equal(sha(new Uint8Array(await previewResponse.arrayBuffer())), storedPacket.pdfSha256,
    "the bytes shown to the user are the exact server-persisted approved candidate");
  const beforeReviewApproval = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(beforeReviewApproval.rows[0]?.approval, null, "preview does not grant consent");
  assert.equal(beforeReviewApproval.rows[0]?.checkout_key, null, "preview does not reserve checkout");

  await db.query(
    "UPDATE debt_validation_matter_snapshots SET pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, new TextEncoder().encode("tampered packet bytes")],
  );
  const tamperedPreview = await review(reviewRequest());
  assert.equal(tamperedPreview.status, 409, "tampered PDF cannot be presented as the reviewed packet");
  assert.equal((await tamperedPreview.json()).code, "debt_validation_persisted_pdf_changed");
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, prepared.pdfBytes],
  );

  const post = (route: string, body: Record<string, unknown>) =>
    new Request(origin + route, {
      method: "POST",
      headers: {
        origin, authorization: "Bearer synthetic-owner-a",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  const approval = createDebtValidationApprovalHttpHandler({
    allowedOrigin: origin, repository, authenticate,
  });
  const reviewed = {
    matterId: matter,
    reviewedPdfSha256: storedPacket.pdfSha256,
    reviewedTotalCents: quote.totalCents,
    reviewedMailClass: "certified",
  };
  const approved = await approval(post("/api/debt-validation/approval", {
    ...reviewed, userApprovedExactPacket: true,
  }));
  assert.equal(approved.status, 200, "real prepared PDF and quote can be approved");

  let submissions = 0;
  let reconciliations = 0;
  const checkout = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin, repository, authenticate,
    submitNewClaim: async () => { submissions++; return "pending" as const; },
    reconcileClaim: async () => { reconciliations++; return "pending" as const; },
  });
  const requestCheckout = () => post("/api/debt-validation/checkout", {
    ...reviewed, userConfirmedCheckout: true,
  });
  assert.equal((await checkout(requestCheckout())).status, 202);
  assert.equal((await checkout(requestCheckout())).status, 202);
  assert.equal(submissions, 1, "one mocked provider handoff for exact physical packet");
  assert.equal(reconciliations, 1, "retry only reconciles existing claim");
  const stored = await db.query<{ checkout_key: string | null; pdf_bytes: Uint8Array }>(
    "SELECT checkout_key,pdf_bytes FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(sha(stored.rows[0]!.pdf_bytes), storedPacket.pdfSha256);
  assert.match(stored.rows[0]!.checkout_key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/);
});

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

test("PostgreSQL debt validation: exact approval retry after checkout is read-only", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  const binding = await approve();
  let providerSubmissions = 0;
  await checkoutDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    checkout: async () => { providerSubmissions++; return "synthetic-receipt"; },
  });
  const query = "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2";
  const before = await db.query<{ approval: unknown; checkout_key: string | null }>(query, [owner, matter]);
  assert.match(before.rows[0]?.checkout_key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/);

  // Retrying the SAME explicit consent after a durable order claim must be
  // idempotent. Previously the checkout_key check rejected before comparing
  // the existing approved binding.
  assert.deepEqual(await approve(), binding);
  const after = await db.query<{ approval: unknown; checkout_key: string | null }>(query, [owner, matter]);
  assert.deepEqual(after.rows, before.rows, "retry cannot mutate approval or order claim");
  assert.equal(providerSubmissions, 1, "approval retry cannot resubmit payment or mail");

  await assert.rejects(approveDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    reviewedPdfSha256: "f".repeat(64), reviewedTotalCents: 1499,
    reviewedMailClass: "certified", userApprovedExactPacket: true,
  }), /debt_validation_/, "a different packet is not an idempotent retry");
  const final = await db.query<{ approval: unknown; checkout_key: string | null }>(query, [owner, matter]);
  assert.deepEqual(final.rows, before.rows);
  assert.equal(providerSubmissions, 1);
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

test("PostgreSQL debt validation: two owners sharing a matter ID keep approvals and checkout claims isolated", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  // Matter IDs are not globally unique: a malicious owner must never obtain
  // another customer's approval, receipt or durable order reservation.
  await seed(owner);
  await seed(other);

  const bindingA = await approve(owner);
  const bindingB = await approve(other);
  assert.equal(bindingA.ownerId, owner);
  assert.equal(bindingB.ownerId, other);
  assert.deepEqual(await repository.loadApproval(owner, matter), bindingA);
  assert.deepEqual(await repository.loadApproval(other, matter), bindingB);

  let submissionsA = 0;
  let submissionsB = 0;
  const keyA = await checkoutDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    checkout: async ({ idempotencyKey }) => { submissionsA++; return idempotencyKey; },
  });
  // An owner-A binding cannot claim or replay the identically named owner-B
  // matter even when both packets have identical PDF bytes and quote values.
  await assert.rejects(repository.claimCheckout(other, matter, {
    binding: bindingA, idempotencyKey: keyA,
    expectedMatterVersion: bindingA.matterVersion,
  }), /debt_validation_concurrent_checkout_change/);

  const keyB = await checkoutDebtValidationMatter({
    ownerId: other, matterId: matter, repository,
    checkout: async ({ idempotencyKey }) => { submissionsB++; return idempotencyKey; },
  });
  assert.notEqual(keyA, keyB, "owner identity must be part of the durable idempotency key");
  assert.equal(submissionsA, 1);
  assert.equal(submissionsB, 1);

  let replayReads = 0;
  const replay = await checkoutDebtValidationMatter({
    ownerId: other, matterId: matter, repository,
    checkout: async () => { submissionsB++; return "duplicate-provider-submission"; },
    replayCheckout: async ({ idempotencyKey }) => { replayReads++; return idempotencyKey; },
  });
  assert.equal(replay, keyB);
  assert.equal(replayReads, 1, "owner B's retry only reads the existing receipt");
  assert.equal(submissionsB, 1, "no second payment or mailing callback");

  const rows = await db.query<{ owner_id: string; checkout_key: string | null }>(
    "SELECT owner_id,checkout_key FROM debt_validation_matter_snapshots WHERE matter_id=$1 ORDER BY owner_id",
    [matter],
  );
  assert.deepEqual(rows.rows, [
    { owner_id: owner, checkout_key: keyA },
    { owner_id: other, checkout_key: keyB },
  ]);
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

test("PostgreSQL debt validation: recipient confirmation revoked after checkout preflight blocks atomic claim", async (t) => {
  const { db, repository, seed, approve, armBeforeTransaction } = await setup();
  t.after(() => db.close());
  await seed();
  await approve();

  // A valid approval and checkout preflight cannot authorize a submission
  // after the customer revokes consent before the locked order transaction.
  // Deliberately keep the packet, PDF and notice metadata unchanged.
  armBeforeTransaction(async () => {
    const revoked = fixture().currentIntake;
    revoked.recipientConfirmed = false;
    await db.query(
      "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter, JSON.stringify(revoked)],
    );
  });

  let stripeCalls = 0;
  let lobCalls = 0;
  let receiptReads = 0;
  await assert.rejects(checkoutDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    checkout: async () => {
      stripeCalls++;
      lobCalls++;
      return "must-not-submit";
    },
    replayCheckout: async () => {
      receiptReads++;
      return "must-not-reconcile";
    },
  }), /debt_validation_stale_intake/);

  assert.equal(stripeCalls, 0, "revoked confirmation cannot submit payment");
  assert.equal(lobCalls, 0, "revoked confirmation cannot submit physical mail");
  assert.equal(receiptReads, 0, "no receipt lookup without an order claim");
  const stored = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.ok(stored.rows[0]?.approval, "existing approval is retained for audit");
  assert.equal(stored.rows[0]?.checkout_key, null, "revocation prevents a durable checkout claim");
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
    ["client-supplied approval id", json({ ...reviewed, approvalId: "untrusted-approval" }), 400],
    ["client-supplied recipient", json({ ...reviewed, recipient: { line1: "Attacker destination" } }), 400],
    ["client-supplied checkout key", json({ ...reviewed, idempotencyKey: "untrusted-key" }), 400],
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


test("debt-validation HTTP checkout: exact owner review, one durable claim and read-only retry", async (t) => {
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  const origin = "https://mailmypdf.example";
  let submissions = 0;
  let reconciliations = 0;
  const handle = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin,
    repository,
    authenticate: async (req) =>
      req.headers.get("authorization") === "Bearer synthetic-owner-a" ? { id: owner }
        : req.headers.get("authorization") === "Bearer synthetic-owner-b" ? { id: other } : null,
    submitNewClaim: async () => { submissions++; return "pending"; },
    reconcileClaim: async () => { reconciliations++; return "pending"; },
  });
  const reviewed = {
    matterId: matter,
    reviewedPdfSha256: sha(pdf),
    reviewedTotalCents: 1499,
    reviewedMailClass: "certified",
    userConfirmedCheckout: true,
  };
  const request = (payload: Record<string, unknown>, headers: Record<string, string> = {}) =>
    new Request(origin + "/api/debt-validation/checkout", {
      method: "POST",
      headers: {
        origin,
        authorization: "Bearer synthetic-owner-a",
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(payload),
    });
  assert.equal((await handle(request(reviewed))).status, 409,
    "checkout cannot reserve an order before exact approval");
  await approve();

  const invalid: Array<[string, Record<string, unknown>, Record<string, string>, number]> = [
    ["missing explicit checkout consent", { ...reviewed, userConfirmedCheckout: false }, {}, 400],
    ["altered reviewed quote", { ...reviewed, reviewedTotalCents: 1599 }, {}, 409],
    ["altered mailing class", { ...reviewed, reviewedMailClass: "registered" }, {}, 409],
    ["altered PDF digest", { ...reviewed, reviewedPdfSha256: "f".repeat(64) }, {}, 409],
    ["untrusted owner", { ...reviewed, ownerId: other }, {}, 400],
    ["untrusted checkout key", { ...reviewed, idempotencyKey: "retry-2" }, {}, 400],
    ["untrusted notice", { ...reviewed, trustedNotice: {} }, {}, 400],
    ["cross-site request", reviewed, { origin: "https://attacker.example" }, 403],
    ["unauthenticated request", reviewed, { authorization: "" }, 401],
    ["another owner", reviewed, { authorization: "Bearer synthetic-owner-b" }, 409],
  ];
  for (const [label, payload, headers, status] of invalid) {
    const rejected = await handle(request(payload, headers));
    assert.equal(rejected.status, status, label);
    const stored = await db.query<{ checkout_key: string | null }>(
      "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter],
    );
    assert.equal(stored.rows[0]?.checkout_key, null, label + ": no durable claim");
    assert.equal(submissions, 0, label + ": zero mocked Stripe/Lob handoffs");
  }

  const first = await handle(request(reviewed));
  assert.equal(first.status, 202);
  assert.equal((await first.json()).code, "checkout_claim_pending");
  assert.equal(submissions, 1);
  assert.equal(reconciliations, 0);
  const retry = await handle(request(reviewed));
  assert.equal(retry.status, 202);
  assert.equal((await retry.json()).code, "checkout_claim_pending");
  assert.equal(submissions, 1, "same checkout cannot submit to mocked providers twice");
  assert.equal(reconciliations, 1, "retry is a read-only receipt lookup");
  const stored = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.match(stored.rows[0]?.checkout_key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/);
});

test("debt-validation HTTP checkout: changed recipient or controlling notice fails closed", async () => {
  const origin = "https://mailmypdf.example";
  const cases: Array<[string, (snapshot: DebtValidationMatterSnapshot) => void, "intake" | "notice"]> = [
    ["recipient confirmation revoked", (snapshot) => {
      snapshot.currentIntake.recipientConfirmed = false;
    }, "intake"],
    ["recipient changed after approval", (snapshot) => {
      snapshot.currentIntake.collectorResponseAddress = "Example Collections\\nPO Box 999\\nAustin, TX 78701";
    }, "intake"],
    ["controlling notice replaced", (snapshot) => {
      snapshot.trustedNotice.sha256 = "a".repeat(64);
    }, "notice"],
  ];
  for (const [label, mutate, field] of cases) {
    const { db, repository, seed, approve } = await setup();
    try {
      await seed();
      await approve();
      const changed = fixture();
      mutate(changed);
      await db.query(
        "UPDATE debt_validation_matter_snapshots SET " +
          (field === "intake" ? "current_intake=$3::jsonb" : "trusted_notice=$3::jsonb") +
          " WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter, JSON.stringify(field === "intake" ? changed.currentIntake : changed.trustedNotice)],
      );
      let submissions = 0;
      let reconciliations = 0;
      const handle = createDebtValidationCheckoutHttpHandler({
        allowedOrigin: origin,
        repository,
        authenticate: async () => ({ id: owner }),
        submitNewClaim: async () => { submissions++; return "pending"; },
        reconcileClaim: async () => { reconciliations++; return "pending"; },
      });
      const result = await handle(new Request(origin + "/api/debt-validation/checkout", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({
          matterId: matter,
          reviewedPdfSha256: sha(pdf),
          reviewedTotalCents: 1499,
          reviewedMailClass: "certified",
          userConfirmedCheckout: true,
        }),
      }));
      assert.equal(result.status, 409, label);
      const stored = await db.query<{ checkout_key: string | null }>(
        "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
        [owner, matter],
      );
      assert.equal(stored.rows[0]?.checkout_key, null, label + ": no order claim");
      assert.equal(submissions, 0, label + ": zero mocked provider submissions");
      assert.equal(reconciliations, 0, label + ": zero receipt lookups");
    } finally {
      await db.close();
    }
  }
});

test("debt-validation HTTP: request stream failure details never escape approval or checkout", async (t) => {
  const { db, repository, seed } = await setup();
  t.after(() => db.close());
  await seed();
  const origin = "https://mailmypdf.example";
  let submissions = 0;
  const deps = {
    allowedOrigin: origin,
    repository,
    authenticate: async () => ({ id: owner }),
  };
  const handlers = [
    ["approval", createDebtValidationApprovalHttpHandler(deps)],
    ["checkout", createDebtValidationCheckoutHttpHandler({
      ...deps,
      submitNewClaim: async () => { submissions++; return "pending" as const; },
      reconcileClaim: async () => "pending" as const,
    })],
  ] as const;
  for (const [kind, handle] of handlers) {
    const internalDetail = "synthetic_internal_transport_secret_" + kind;
    const brokenStream = new ReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error(internalDetail)); },
    });
    const request = new Request(origin + "/api/debt-validation/" + kind, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: brokenStream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    const result = await handle(request);
    assert.equal(result.status, 400, kind + ": unreadable body is invalid JSON");
    const payload = await result.text();
    assert.deepEqual(JSON.parse(payload), { code: "invalid_json" },
      kind + ": never return underlying stream/transport exception details");
    assert.doesNotMatch(payload, /synthetic_internal_transport_secret/);
  }
  const stored = await db.query<{ approval: unknown; checkout_key: string | null }>(
    "SELECT approval,checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(stored.rows[0]?.approval, null);
  assert.equal(stored.rows[0]?.checkout_key, null);
  assert.equal(submissions, 0, "a failed request body never reaches mocked payment or mailing");
});


test("debt-validation HTTP checkout: provider failure is reconciled without a second physical-mail submission", async (t) => {
  // An ambiguous provider failure happens AFTER the durable order claim.
  // HTTP retries must never charge or mail again; only a read-only receipt
  // reconciliation is permitted. This is isolated PGlite + mocked callbacks.
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  await approve();

  const origin = "https://mailmypdf.example";
  let submissions = 0;
  let receiptLookups = 0;
  const handle = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin,
    repository,
    authenticate: async () => ({ id: owner }),
    submitNewClaim: async () => {
      submissions++;
      throw new Error("synthetic_uncertain_provider_outcome");
    },
    reconcileClaim: async () => {
      receiptLookups++;
      return "pending";
    },
  });
  const request = () => new Request(origin + "/api/debt-validation/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({
      matterId: matter,
      reviewedPdfSha256: sha(pdf),
      reviewedTotalCents: 1499,
      reviewedMailClass: "certified",
      userConfirmedCheckout: true,
    }),
  });

  const first = await handle(request());
  assert.equal(first.status, 500, "provider uncertainty is not a successful mailing");
  assert.deepEqual(await first.json(), { code: "checkout_unavailable" },
    "internal provider exception details must not escape the HTTP boundary");
  assert.equal(submissions, 1, "only the first durable claim invokes the mock provider");
  assert.equal(receiptLookups, 0);
  const claimed = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  const key = claimed.rows[0]?.checkout_key;
  assert.match(key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/,
    "a failed callback must not erase the durable claim");

  for (let attempt = 1; attempt <= 2; attempt++) {
    const retry = await handle(request());
    assert.equal(retry.status, 202, "retry is pending receipt reconciliation");
    assert.deepEqual(await retry.json(), { code: "checkout_claim_pending" });
    assert.equal(submissions, 1, "HTTP retries must not invoke mocked Stripe/Lob again");
    assert.equal(receiptLookups, attempt, "retry uses read-only receipt lookup");
  }
  const after = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(after.rows[0]?.checkout_key, key, "original claim is immutable across retries");
});


test("debt-validation HTTP checkout: in-flight provider submission permits receipt-only retry", { timeout: 15000 }, async (t) => {
  // Two requests overlap while the FIRST mocked provider callback has not
  // returned. The durable SQL claim must already exist, so the second request
  // can only reconcile; it cannot charge or mail again. Offline PGlite only.
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  await approve();

  const origin = "https://mailmypdf.example";
  let submissions = 0;
  let receiptLookups = 0;
  let signalFirstSubmission!: () => void;
  let releaseFirstSubmission!: () => void;
  const firstSubmissionStarted = new Promise<void>((resolve) => { signalFirstSubmission = resolve; });
  const firstSubmissionReleased = new Promise<void>((resolve) => { releaseFirstSubmission = resolve; });
  const handle = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin,
    repository,
    authenticate: async () => ({ id: owner }),
    submitNewClaim: async () => {
      submissions++;
      signalFirstSubmission();
      await firstSubmissionReleased;
      return "pending";
    },
    reconcileClaim: async () => {
      receiptLookups++;
      return "pending";
    },
  });
  const request = () => new Request(origin + "/api/debt-validation/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({
      matterId: matter,
      reviewedPdfSha256: sha(pdf),
      reviewedTotalCents: 1499,
      reviewedMailClass: "certified",
      userConfirmedCheckout: true,
    }),
  });

  const originalRequest = handle(request());
  try {
    await firstSubmissionStarted;
    assert.equal(submissions, 1, "first durable claim permits one mock submission");
    const beforeRetry = await db.query<{ checkout_key: string | null }>(
      "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter],
    );
    const claimedKey = beforeRetry.rows[0]?.checkout_key;
    assert.match(claimedKey ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/,
      "order claim must be durable before the provider callback completes");

    const retry = await handle(request());
    assert.equal(retry.status, 202, "overlapping retry remains pending, not a second mailing");
    assert.deepEqual(await retry.json(), { code: "checkout_claim_pending" });
    assert.equal(submissions, 1, "no second mocked Stripe/Lob submission during in-flight call");
    assert.equal(receiptLookups, 1, "retry performs read-only receipt reconciliation");
    const afterRetry = await db.query<{ checkout_key: string | null }>(
      "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
      [owner, matter],
    );
    assert.equal(afterRetry.rows[0]?.checkout_key, claimedKey,
      "concurrent retry preserves the original durable order key");
  } finally {
    releaseFirstSubmission();
  }
  const first = await originalRequest;
  assert.equal(first.status, 202);
  assert.deepEqual(await first.json(), { code: "checkout_claim_pending" });
  assert.equal(submissions, 1);
  assert.equal(receiptLookups, 1);
});


test("PostgreSQL debt validation: existing checkout claim cannot reconcile a silently replaced controlling notice", async (t) => {
  // A receipt-only retry must not bypass the current controlling-notice
  // integrity check just because a durable checkout key already exists.
  // Synthetic PGlite bytes only: no payment, mailing, or hosted database.
  const { db, repository, seed, approve } = await setup();
  t.after(() => db.close());
  await seed();
  await approve();

  let providerSubmissions = 0;
  let receiptLookups = 0;
  const checkout = () => checkoutDebtValidationMatter({
    ownerId: owner, matterId: matter, repository,
    checkout: async ({ idempotencyKey }) => {
      providerSubmissions++;
      return idempotencyKey;
    },
    replayCheckout: async ({ idempotencyKey }) => {
      receiptLookups++;
      return idempotencyKey;
    },
  });
  const originalKey = await checkout();
  assert.match(originalKey, /^debt_validation_checkout_[a-f0-9]{64}$/);
  assert.equal(providerSubmissions, 1);

  // Replace only the original notice bytes; leave its SHA, revision, document
  // ID, approved packet and existing checkout key untouched.
  const replacedNotice = new TextEncoder().encode("%PDF-1.4\\nDifferent controlling notice\\n%%EOF");
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3 WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, replacedNotice],
  );
  await assert.rejects(checkout(), /debt_validation_persisted_notice_changed/);
  assert.equal(providerSubmissions, 1, "tampered notice cannot trigger a second provider submission");
  assert.equal(receiptLookups, 0, "tampered notice cannot even authorize receipt reconciliation");
  const afterTamper = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter],
  );
  assert.equal(afterTamper.rows[0]?.checkout_key, originalKey,
    "failed retry cannot replace or clear the durable order claim");

  // Restoring the exact original notice permits receipt-only idempotent retry.
  await db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3 WHERE owner_id=$1 AND matter_id=$2",
    [owner, matter, sourceNoticePdf],
  );
  assert.equal(await checkout(), originalKey);
  assert.equal(providerSubmissions, 1, "a valid retry still cannot submit twice");
  assert.equal(receiptLookups, 1, "valid retry uses the read-only receipt adapter");
});
