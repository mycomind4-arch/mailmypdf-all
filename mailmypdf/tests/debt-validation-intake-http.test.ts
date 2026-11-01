import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { generatePlainTextPdf } from "@mailmypdf/packet-builder";
import { createDebtValidationIntakeHttpHandler } from "../src/lib/secure-core/debt-validation-intake-http.server";
import {
  prepareAndPersistDebtValidationMatter,
  createPostgresDebtValidationMatterRepository,
  type DebtValidationSqlDatabase,
} from "../src/lib/secure-core/debt-validation-postgres.server";
import { createDebtValidationPacketReviewHttpHandler } from "../src/lib/secure-core/debt-validation-approval-http.server";

const origin = "https://mailmypdf.example";
const ownerId = "synthetic-owner";
const matterId = "synthetic-matter";
const address = "Example Collections\nPO Box 456\nAustin, TX 78701";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("authenticated debt-validation intake prepares a verified vault notice for exact server PDF review, never checkout", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
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
      PRIMARY KEY (owner_id,matter_id)
    );
  `);
  const sql: DebtValidationSqlDatabase = {
    query: (statement, params = []) => db.query(statement, params),
    transaction: (work) => db.transaction((tx) =>
      work({ query: (statement, params = []) => tx.query(statement, params) })),
  };
  const repository = createPostgresDebtValidationMatterRepository(sql);
  const noticePdfBytes = await generatePlainTextPdf("Synthetic collection notice. Reply to Example Collections PO Box 456.");
  const noticeSha256 = sha(noticePdfBytes);
  const intake = {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: "Example Collections",
    collectorResponseAddress: address,
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "I dispute the stated balance and request verification.",
    requestOriginalCreditor: true,
    noticeDocumentId: "notice-1",
    noticeSha256,
    noticeVersion: 1,
    noticeResponseAddress: address,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: address,
    confirmedNoticeSha256: noticeSha256,
    confirmedNoticeDocumentId: "notice-1",
    confirmedNoticeVersion: 1,
  };
  const trustedNotice = {
    ownerId, matterId, documentId: "notice-1", sha256: noticeSha256,
    version: 1, responseMailingAddress: address, mailingAddressVerified: true,
  };
  let sourceReads = 0;
  let persistCalls = 0;
  let providerSubmissions = 0;
  let source = { trustedNotice, noticePdfBytes };
  const handler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin,
    authenticate: async (request) => request.headers.get("authorization") === "Bearer synthetic"
      ? { id: ownerId } : null,
    loadVerifiedNotice: async (owner, matter, document) => {
      sourceReads += 1;
      if (owner !== ownerId || matter !== matterId || document !== "notice-1") return null;
      return source;
    },
    persistPreparedMatter: async (input) => {
      persistCalls += 1;
      return prepareAndPersistDebtValidationMatter(sql, input);
    },
  });
  const body = {
    matterId, noticeDocumentId: "notice-1", letterDate: "2026-10-30",
    mailClass: "certified", intake,
  };
  const post = (value: unknown, auth = "Bearer synthetic", requestOrigin = origin) =>
    handler(new Request(origin + "/api/debt-validation/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: auth,
        origin: requestOrigin,
      },
      body: JSON.stringify(value),
    }));
  assert.equal((await post(body, "")).status, 401);
  assert.equal((await post(body, "Bearer synthetic", "https://evil.example")).status, 403);
  assert.equal((await post({ ...body, ownerId: "other-owner" })).status, 400);
  assert.equal((await post({ ...body, totalCents: 1 })).status, 400);
  assert.equal((await post({ ...body, letterDate: "2026-02-30" })).status, 400);
  assert.equal((await post({ ...body, intake: { ...intake, recipientConfirmed: false } })).status, 409);
  assert.equal((await post({ ...body, intake: {
    ...intake, collectorResponseAddress: "Example Collections\nPO Box 999\nAustin, TX 78701",
  } })).status, 409);
  assert.equal((await post({ ...body, noticeDocumentId: "another-notice" })).status, 409);
  assert.equal(persistCalls, 0, "rejected requests cannot create packets or orders");
  assert.equal(providerSubmissions, 0);

  source = { trustedNotice: { ...trustedNotice, mailingAddressVerified: false }, noticePdfBytes };
  assert.equal((await post(body)).status, 409);
  source = { trustedNotice, noticePdfBytes: await generatePlainTextPdf("Replaced notice bytes.") };
  assert.equal((await post(body)).status, 409);
  source = { trustedNotice, noticePdfBytes };
  assert.equal(persistCalls, 1, "swapped source reaches create-only persistence but cannot commit");
  const before = await db.query("SELECT count(*)::int AS count FROM debt_validation_matter_snapshots");
  assert.equal(before.rows[0]?.count, 0);

  const prepared = await post(body);
  assert.equal(prepared.status, 201);
  const result = await prepared.json() as { code: string; pdfSha256: string; totalCents: number };
  assert.equal(result.code, "packet_prepared_for_review");
  assert.match(result.pdfSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.totalCents > 0, true);
  const review = createDebtValidationPacketReviewHttpHandler({
    allowedOrigin: origin, repository, authenticate: async () => ({ id: ownerId }),
  });
  const summary = await review(new Request(origin + "/api/debt-validation/review?matterId=" + matterId + "&view=summary"));
  assert.equal(summary.status, 200);
  const snapshot = await summary.json() as { pdfSha256: string; recipientAddress: string; totalCents: number };
  assert.equal(snapshot.pdfSha256, result.pdfSha256);
  assert.equal(snapshot.recipientAddress, address);
  assert.equal(snapshot.totalCents, result.totalCents);
  const state = await db.query("SELECT approval,checkout_key FROM debt_validation_matter_snapshots");
  assert.equal(state.rows.length, 1);
  assert.equal(state.rows[0]?.approval, null);
  assert.equal(state.rows[0]?.checkout_key, null);
  assert.equal(providerSubmissions, 0, "intake and review have no provider callback");

  assert.equal((await post(body)).status, 409, "create-only retry cannot overwrite reviewed bytes");
  const after = await db.query("SELECT count(*)::int AS count FROM debt_validation_matter_snapshots");
  assert.equal(after.rows[0]?.count, 1);
  assert.equal(sourceReads > 0, true);
});
