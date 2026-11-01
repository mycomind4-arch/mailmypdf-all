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
import {
  createDebtValidationApprovalHttpHandler,
  createDebtValidationCheckoutHttpHandler,
  createDebtValidationPacketReviewHttpHandler,
} from "../src/lib/secure-core/debt-validation-approval-http.server";

const origin = "https://mailmypdf.example";
const ownerId = "synthetic-owner";
const matterId = "synthetic-matter";
const address = "Example Collections\nPO Box 456\nAustin, TX 78701";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("authenticated debt-validation intake, exact PDF review, explicit approval and idempotent mocked checkout", async (t) => {
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
  const authenticate = async (request: Request) => request.headers.get("authorization") === "Bearer synthetic"
    ? { id: ownerId } : null;
  const handler = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin,
    authenticate,
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
    allowedOrigin: origin, repository, authenticate,
  });
  const summary = await review(new Request(origin + "/api/debt-validation/review?matterId=" + matterId + "&view=summary", {
    headers: { authorization: "Bearer synthetic" },
  }));
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

  // The exact PDF/quote returned by authenticated intake and review must be
  // the only packet that can receive a separate, explicit server approval.
  // No live Stripe, Lob, hosted DB or mailing adapter is used in this test.
  const approval = createDebtValidationApprovalHttpHandler({
    allowedOrigin: origin, repository, authenticate,
  });
  let receiptReads = 0;
  const checkout = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin, repository, authenticate,
    submitNewClaim: async () => {
      providerSubmissions++;
      return "pending" as const;
    },
    reconcileClaim: async () => {
      receiptReads++;
      return "pending" as const;
    },
  });
  const action = (path: string, payload: unknown, handle: (request: Request) => Promise<Response>,
    authorization = "Bearer synthetic") => handle(new Request(origin + path, {
    method: "POST",
    headers: { "content-type": "application/json", origin, authorization },
    body: JSON.stringify(payload),
  }));
  const reviewed = {
    matterId,
    reviewedPdfSha256: result.pdfSha256,
    reviewedTotalCents: result.totalCents,
    reviewedMailClass: "certified",
  };
  const requestApproval = (payload: unknown) => action("/api/debt-validation/approval", payload, approval);
  const requestCheckout = (payload: unknown, authorization?: string) =>
    action("/api/debt-validation/checkout", payload, checkout, authorization);
  const confirmedCheckout = { ...reviewed, userConfirmedCheckout: true };

  assert.equal((await requestCheckout(confirmedCheckout)).status, 409,
    "a prepared/reviewed packet without approval cannot claim checkout");
  assert.equal((await requestApproval({ ...reviewed, userApprovedExactPacket: false })).status, 400);
  assert.equal((await requestApproval({
    ...reviewed, reviewedTotalCents: result.totalCents + 1, userApprovedExactPacket: true,
  })).status, 409, "a changed quote cannot be approved");
  assert.equal(providerSubmissions, 0);
  assert.equal((await requestApproval({ ...reviewed, userApprovedExactPacket: true })).status, 200);

  // Even after valid approval, replacing the controlling notice bytes or
  // revoking recipient confirmation must fail before any mock handoff.
  const updateNotice = (bytes: Uint8Array) => db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, matterId, bytes],
  );
  await updateNotice(await generatePlainTextPdf("Synthetic replaced notice."));
  assert.equal((await requestCheckout(confirmedCheckout)).status, 409);
  await updateNotice(noticePdfBytes);
  const updateIntake = (value: typeof intake) => db.query(
    "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, matterId, JSON.stringify(value)],
  );
  await updateIntake({ ...intake, recipientConfirmed: false });
  assert.equal((await requestCheckout(confirmedCheckout)).status, 409);
  await updateIntake(intake);
  assert.equal(providerSubmissions, 0, "stale notice or recipient never submits mock providers");
  assert.equal(receiptReads, 0);

  assert.equal((await requestCheckout(confirmedCheckout, "")).status, 401);
  assert.equal((await requestCheckout({ ...confirmedCheckout, reviewedTotalCents: result.totalCents + 1 })).status, 409);
  assert.equal((await requestCheckout(confirmedCheckout)).status, 202);
  assert.equal((await requestCheckout(confirmedCheckout)).status, 202,
    "retry must reconcile the same durable checkout claim");
  assert.equal(providerSubmissions, 1, "one mock checkout handoff for the approved packet");
  assert.equal(receiptReads, 1, "replay is read-only, never a second provider submission");
  const final = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, matterId],
  );
  assert.match(final.rows[0]?.checkout_key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/);
});
