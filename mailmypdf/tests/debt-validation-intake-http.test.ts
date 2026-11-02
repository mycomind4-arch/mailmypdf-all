import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { generatePlainTextPdf } from "@mailmypdf/packet-builder";
import { createDebtValidationIntakeHttpHandler } from "../src/lib/secure-core/debt-validation-intake-http.server";
import {
  createDebtValidationHostIntakeHandler,
  createDebtValidationHostReviewAndApprovalHandlers,
  createDebtValidationHostCheckoutHandler,
} from "../src/lib/secure-core/debt-validation-host-review.server";
import { AuthenticationError } from "../src/lib/secure-core/auth.server";
import {
  prepareAndPersistDebtValidationMatter,
  createPostgresDebtValidationMatterRepository,
  type DebtValidationSqlDatabase,
} from "../src/lib/secure-core/debt-validation-postgres.server";
import {
  createDebtValidationCheckoutHttpHandler,
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
  const authenticate = async (request: Request) => {
    const token = request.headers.get("authorization");
    return token === "Bearer synthetic" ? { id: ownerId }
      : token === "Bearer other-owner" ? { id: "other-owner" } : null;
  };
  // Exercise the unmounted host bearer-to-owner adapter for every step,
  // not only the lower-level HTTP handlers with a preselected actor.
  const verifyUser = async (request: Request) => {
    const actor = await authenticate(request);
    if (!actor) throw new AuthenticationError("synthetic_invalid_bearer");
    return { user: { id: actor.id } };
  };
  const handler = createDebtValidationHostIntakeHandler({
    allowedOrigin: origin,
    loadVerifiedNotice: async (owner, matter, document) => {
      sourceReads += 1;
      if (owner !== ownerId || matter !== matterId || document !== "notice-1") return null;
      return source;
    },
    persistPreparedMatter: async (input) => {
      persistCalls += 1;
      return prepareAndPersistDebtValidationMatter(sql, input);
    },
  }, verifyUser);
  const body = {
    matterId, noticeDocumentId: "notice-1", letterDate: "2026-10-30",
    mailClass: "certified", intake,
  };
  const post = (value: unknown, auth = "Bearer synthetic", requestOrigin = origin, declaredLength?: string) =>
    handler(new Request(origin + "/api/debt-validation/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: auth,
        origin: requestOrigin,
        ...(declaredLength ? { "content-length": declaredLength } : {}),
      },
      body: JSON.stringify(value),
    }));
  assert.equal((await post(body, "Bearer synthetic", origin, "8193")).status, 413);
  assert.equal(sourceReads, 0, "oversized declared intake cannot read a notice");
  assert.equal(persistCalls, 0, "oversized declared intake cannot persist a packet");
  assert.equal(providerSubmissions, 0, "oversized declared intake cannot submit mail or payment");
  assert.equal((await post(body, "")).status, 401);
  assert.equal((await post(body, "Bearer other-owner")).status, 404,
    "host-verified other owner cannot load the controlling notice");
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
  const result = await prepared.json() as { code: string; pdfSha256: string; totalCents: number;
    matterVersion: number; enclosureManifestSha256: string };
  assert.equal(result.code, "packet_prepared_for_review");
  assert.match(result.pdfSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.totalCents > 0, true);
  const hostReviewAndApproval = createDebtValidationHostReviewAndApprovalHandlers({
    allowedOrigin: origin, repository,
  }, verifyUser);
  const review = hostReviewAndApproval.review;
  const summary = await review(new Request(origin + "/api/debt-validation/review?matterId=" + matterId + "&view=summary", {
    headers: { authorization: "Bearer synthetic" },
  }));
  assert.equal(summary.status, 200);
  assert.equal(summary.headers.get("cross-origin-resource-policy"), "same-origin",
    "private envelope and quote summary cannot be embedded cross-origin");
  const snapshot = await summary.json() as {
    pdfSha256: string; recipientAddress: string; totalCents: number;
    matterVersion: number; enclosureManifestSha256: string;
  };
  assert.equal(snapshot.pdfSha256, result.pdfSha256);
  assert.equal(snapshot.recipientAddress, address);
  assert.equal(snapshot.totalCents, result.totalCents);
  // The exact PDF and envelope/quote summary must identify the same durable
  // revision and enclosure manifest, not just the same letter digest.
  const persisted = await repository.loadCurrent(ownerId, matterId);
  assert.ok(persisted);
  assert.equal(snapshot.matterVersion, persisted.packet.matterVersion);
  assert.equal(snapshot.enclosureManifestSha256, persisted.packet.enclosureManifestSha256);
  assert.equal(result.matterVersion, snapshot.matterVersion);
  assert.equal(result.enclosureManifestSha256, snapshot.enclosureManifestSha256);
  assert.match(snapshot.enclosureManifestSha256, /^[a-f0-9]{64}$/);
  // The same authenticated intake must expose the ACTUAL server-stored PDF,
  // not only a digest/quote or an unrelated browser-generated preview.
  const reviewUrl = origin + "/api/debt-validation/review?matterId=" + matterId;
  const pdfReview = await review(new Request(reviewUrl, {
    headers: { authorization: "Bearer synthetic" },
  }));
  assert.equal(pdfReview.status, 200);
  assert.equal(pdfReview.headers.get("content-type"), "application/pdf");
  assert.equal(pdfReview.headers.get("cross-origin-resource-policy"), "same-origin",
    "private reviewed PDF cannot be embedded cross-origin");
  assert.equal(pdfReview.headers.get("x-reviewed-pdf-sha256"), result.pdfSha256);
  assert.equal(pdfReview.headers.get("x-reviewed-matter-version"), String(snapshot.matterVersion));
  assert.equal(pdfReview.headers.get("x-reviewed-enclosure-manifest-sha256"), snapshot.enclosureManifestSha256);
  const reviewedPdfBytes = new Uint8Array(await pdfReview.arrayBuffer());
  assert.equal(sha(reviewedPdfBytes), result.pdfSha256,
    "the exact prepared server PDF must be the bytes served for review");
  assert.equal((await review(new Request(reviewUrl))).status, 401,
    "anonymous visitors cannot download the stored PDF");
  assert.equal((await review(new Request(reviewUrl, {
    headers: { authorization: "Bearer other-owner" },
  }))).status, 404, "a different authenticated owner cannot read the packet");
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
  const approval = hostReviewAndApproval.approval;
  let receiptReads = 0;
  let receiptLookupUnavailable = false;
  const checkout = createDebtValidationHostCheckoutHandler({
    allowedOrigin: origin, repository,
    submitNewClaim: async () => {
      providerSubmissions++;
      // An optimistic provider response is not verified payment AND mailing
      // evidence. The HTTP boundary must consult the read-only reconciler.
      return "recorded" as const;
    },
    reconcileClaim: async () => {
      receiptReads++;
      if (receiptLookupUnavailable) throw new Error("synthetic_receipt_lookup_unavailable");
      return "pending" as const;
    },
  }, verifyUser);
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
    reviewedMatterVersion: snapshot.matterVersion,
    reviewedEnclosureManifestSha256: snapshot.enclosureManifestSha256,
  };
  const requestApproval = (payload: unknown) => action("/api/debt-validation/approval", payload, approval);
  const requestCheckout = (payload: unknown, authorization?: string) =>
    action("/api/debt-validation/checkout", payload, checkout, authorization);
  const confirmedCheckout = { ...reviewed, userConfirmedCheckout: true };
  const updateNotice = (bytes: Uint8Array) => db.query(
    "UPDATE debt_validation_matter_snapshots SET notice_pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, matterId, bytes],
  );
  const updatePacket = (bytes: Uint8Array) => db.query(
    "UPDATE debt_validation_matter_snapshots SET pdf_bytes=$3::bytea WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, matterId, bytes],
  );
  const updateIntake = (value: typeof intake) => db.query(
    "UPDATE debt_validation_matter_snapshots SET current_intake=$3::jsonb WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, matterId, JSON.stringify(value)],
  );

  // Revocation between exact PDF review and approval must invalidate BOTH
  // read-only review surfaces and the actual server approval endpoint. A
  // stale browser digest/quote must not turn into consent for a changed notice
  // or a recipient whose confirmation was withdrawn.
  const approvedRequest = { ...reviewed, userApprovedExactPacket: true };
  const reviewRequests = [reviewUrl, reviewUrl + "&view=summary"];
  await updateNotice(await generatePlainTextPdf("Synthetic notice replaced before approval."));
  for (const url of reviewRequests) {
    assert.equal((await review(new Request(url, {
      headers: { authorization: "Bearer synthetic" },
    }))).status, 409, "replaced controlling notice blocks PDF and summary review");
  }
  assert.equal((await requestApproval(approvedRequest)).status, 409,
    "approval must recheck the controlling notice's actual stored bytes");
  await updateNotice(noticePdfBytes);

  await updateIntake({ ...intake, recipientConfirmed: false });
  for (const url of reviewRequests) {
    assert.equal((await review(new Request(url, {
      headers: { authorization: "Bearer synthetic" },
    }))).status, 409, "revoked recipient confirmation blocks PDF and summary review");
  }
  assert.equal((await requestApproval(approvedRequest)).status, 409,
    "approval must not reuse an earlier recipient confirmation");
  await updateIntake(intake);
  const preapproval = await db.query("SELECT approval,checkout_key FROM debt_validation_matter_snapshots");
  assert.equal(preapproval.rows[0]?.approval, null);
  assert.equal(preapproval.rows[0]?.checkout_key, null);
  assert.equal(providerSubmissions, 0, "stale review cannot submit mocked providers");

  assert.equal((await requestCheckout(confirmedCheckout)).status, 409,
    "a prepared/reviewed packet without approval cannot claim checkout");
  assert.equal((await action("/api/debt-validation/approval", {
    ...reviewed, userApprovedExactPacket: true,
  }, approval, "")).status, 401,
  "an unauthenticated host caller cannot approve a reviewed packet");
  assert.equal((await requestApproval({ ...reviewed, userApprovedExactPacket: false })).status, 400);
  assert.equal((await requestApproval({
    ...reviewed, reviewedTotalCents: result.totalCents + 1, userApprovedExactPacket: true,
  })).status, 409, "a changed quote cannot be approved");
  assert.equal(providerSubmissions, 0);
  assert.equal((await requestApproval({ ...reviewed, userApprovedExactPacket: true })).status, 200);
  assert.equal((await action("/api/debt-validation/approval", {
    ...reviewed, userApprovedExactPacket: true,
  }, approval, "Bearer other-owner")).status, 409,
  "another authenticated owner cannot approve the reviewed packet");

  // The PDF actually served for review is the only approved mailing artifact.
  // Substituting stored PDF bytes without updating their digest must fail closed
  // at the authenticated checkout boundary before any provider callback.
  await updatePacket(await generatePlainTextPdf("Synthetic substituted approved letter."));
  assert.equal((await requestCheckout(confirmedCheckout)).status, 409,
    "changed approved PDF bytes must invalidate checkout despite unchanged metadata");
  assert.equal(providerSubmissions, 0, "tampered PDF cannot reach mocked providers");
  await updatePacket(reviewedPdfBytes);

  // Even after valid approval, replacing the controlling notice bytes or
  // revoking recipient confirmation must fail before any mock handoff.
  await updateNotice(await generatePlainTextPdf("Synthetic replaced notice."));
  assert.equal((await requestCheckout(confirmedCheckout)).status, 409);
  await updateNotice(noticePdfBytes);
  await updateIntake({ ...intake, recipientConfirmed: false });
  assert.equal((await requestCheckout(confirmedCheckout)).status, 409);
  await updateIntake(intake);
  // Approval binds both the physical envelope and the exact letter contents.
  // Changing the recipient, sender, consumer identity, account or dispute
  // after PDF review must not reuse consent for the original approved packet.
  const changedApprovedIntakes: Array<{ label: string; value: typeof intake }> = [
    { label: "recipient", value: { ...intake,
      confirmedRecipientAddress: "Example Collections\nPO Box 999\nAustin, TX 78701",
    } },
    { label: "return address", value: { ...intake,
      consumerMailingAddress: "999 Changed St\nSacramento, CA 95814",
    } },
    { label: "consumer name", value: { ...intake,
      consumerName: "Different Synthetic Consumer",
    } },
    { label: "account reference", value: { ...intake,
      accountReference: "SYNTHETIC-OTHER-ACCOUNT",
    } },
    { label: "dispute text", value: { ...intake,
      disputeExplanation: "Different dispute and verification request.",
    } },
    { label: "collector name", value: { ...intake,
      collectorName: "Different Synthetic Collector",
    } },
    { label: "original creditor request", value: { ...intake,
      requestOriginalCreditor: false,
    } },
    { label: "printed notice date", value: { ...intake,
      noticeDate: "2026-10-11",
    } },
    { label: "printed dispute deadline", value: { ...intake,
      noticeDisputeDeadline: "2026-11-10",
    } },
  ];
  for (const { label, value } of changedApprovedIntakes) {
    await updateIntake(value);
    assert.equal((await requestCheckout(confirmedCheckout)).status, 409,
      `post-approval ${label} change must invalidate checkout`);
    await updateIntake(intake);
    assert.equal(providerSubmissions, 0, `changed ${label} cannot submit payment or mail`);
  }
  assert.equal(providerSubmissions, 0, "stale notice or recipient never submits mock providers");
  assert.equal(receiptReads, 0);

  assert.equal((await requestCheckout(confirmedCheckout, "")).status, 401);
  assert.equal((await requestCheckout(confirmedCheckout, "Bearer other-owner")).status, 409,
    "another authenticated owner cannot claim checkout");
  assert.equal((await requestCheckout({ ...confirmedCheckout, reviewedTotalCents: result.totalCents + 1 })).status, 409);
  assert.equal((await requestCheckout(confirmedCheckout)).status, 202,
    "optimistic provider success cannot certify mailing without independent receipts");
  assert.equal(receiptReads, 1,
    "new-claim provider success must be checked against read-only receipt evidence");
  assert.equal((await requestCheckout(confirmedCheckout)).status, 202,
    "retry must reconcile the same durable checkout claim");
  assert.equal(providerSubmissions, 1, "one mock checkout handoff for the approved packet");
  assert.equal(receiptReads, 2,
    "first optimistic success and replay both reconcile without resubmission");
  // An outage during read-only receipt reconciliation must never re-submit
  // the already durably claimed order. Once lookup recovers, the same claim
  // remains pending until independently verified payment AND mailing receipts.
  receiptLookupUnavailable = true;
  const failedLookup = await requestCheckout(confirmedCheckout);
  assert.equal(failedLookup.status, 500, "receipt lookup outage must fail closed");
  assert.equal((await failedLookup.json() as { code: string }).code, "checkout_unavailable");
  assert.equal(providerSubmissions, 1, "receipt lookup failure cannot re-submit the claimed order");
  assert.equal(receiptReads, 3, "failed replay attempted only a read-only receipt lookup");
  receiptLookupUnavailable = false;
  assert.equal((await requestCheckout(confirmedCheckout)).status, 202,
    "recovered receipt lookup resumes reconciliation of the existing claim");
  assert.equal(providerSubmissions, 1, "recovery cannot submit another payment or mailing");
  assert.equal(receiptReads, 4, "recovery uses read-only reconciliation");

  const final = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, matterId],
  );
  assert.match(final.rows[0]?.checkout_key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/);

  // A provider may fail AFTER the durable order claim but BEFORE it returns
  // an acknowledgement. A retry must never infer that nothing was submitted
  // and must only reconcile the existing claim (no second charge/mail call).
  const outageMatterId = "synthetic-submission-outage";
  const inFlightMatterId = "synthetic-inflight-retry";
  const outageIntake = createDebtValidationIntakeHttpHandler({
    allowedOrigin: origin, authenticate,
    loadVerifiedNotice: async (owner, matter, document) =>
      owner === ownerId && (matter === outageMatterId || matter === inFlightMatterId) && document === "notice-1"
        ? { trustedNotice: { ...trustedNotice, matterId: matter }, noticePdfBytes }
        : null,
    persistPreparedMatter: (input) => prepareAndPersistDebtValidationMatter(sql, input),
  });
  const outagePreparedResponse = await outageIntake(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer synthetic", origin },
    body: JSON.stringify({ ...body, matterId: outageMatterId }),
  }));
  assert.equal(outagePreparedResponse.status, 201);
  const outagePrepared = await outagePreparedResponse.json() as {
    pdfSha256: string; totalCents: number;
    matterVersion: number; enclosureManifestSha256: string;
  };
  const outageReviewed = {
    matterId: outageMatterId,
    reviewedPdfSha256: outagePrepared.pdfSha256,
    reviewedTotalCents: outagePrepared.totalCents,
    reviewedMailClass: "certified",
    reviewedMatterVersion: outagePrepared.matterVersion,
    reviewedEnclosureManifestSha256: outagePrepared.enclosureManifestSha256,
  };
  assert.equal((await requestApproval({ ...outageReviewed, userApprovedExactPacket: true })).status, 200);
  let failedSubmissions = 0;
  let outageReconciliations = 0;
  const outageCheckout = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin, repository, authenticate,
    submitNewClaim: async () => {
      failedSubmissions++;
      throw new Error("synthetic_provider_timeout_after_submission");
    },
    reconcileClaim: async () => {
      outageReconciliations++;
      return "pending" as const;
    },
  });
  const outageCheckoutRequest = { ...outageReviewed, userConfirmedCheckout: true };
  const firstOutage = await action("/api/debt-validation/checkout", outageCheckoutRequest, outageCheckout);
  assert.equal(firstOutage.status, 500, "provider timeout after a durable claim fails closed");
  assert.equal((await firstOutage.json() as { code: string }).code, "checkout_unavailable",
    "provider error details must not be exposed to the browser");
  const claimed = await db.query<{ checkout_key: string | null }>(
    "SELECT checkout_key FROM debt_validation_matter_snapshots WHERE owner_id=$1 AND matter_id=$2",
    [ownerId, outageMatterId],
  );
  assert.match(claimed.rows[0]?.checkout_key ?? "", /^debt_validation_checkout_[a-f0-9]{64}$/,
    "the order claim survives an ambiguous provider timeout");
  assert.equal((await action("/api/debt-validation/checkout", outageCheckoutRequest, outageCheckout)).status, 202,
    "retry reconciles the already-claimed order without submitting again");
  assert.equal(failedSubmissions, 1, "ambiguous provider failure must never cause duplicate submissions");
  assert.equal(outageReconciliations, 1, "retry performs exactly one read-only receipt lookup");

  // Retry WHILE the first provider submission is still in flight. The durable
  // order claim must already exist before the first provider callback begins;
  // an overlapping request can only read the same claim, never submit again.
  const inFlightPreparedResponse = await outageIntake(new Request(origin + "/api/debt-validation/intake", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer synthetic", origin },
    body: JSON.stringify({ ...body, matterId: inFlightMatterId }),
  }));
  assert.equal(inFlightPreparedResponse.status, 201);
  const inFlightPrepared = await inFlightPreparedResponse.json() as {
    pdfSha256: string; totalCents: number;
    matterVersion: number; enclosureManifestSha256: string;
  };
  const inFlightReviewed = {
    matterId: inFlightMatterId,
    reviewedPdfSha256: inFlightPrepared.pdfSha256,
    reviewedTotalCents: inFlightPrepared.totalCents,
    reviewedMailClass: "certified",
    reviewedMatterVersion: inFlightPrepared.matterVersion,
    reviewedEnclosureManifestSha256: inFlightPrepared.enclosureManifestSha256,
  };
  assert.equal((await requestApproval({ ...inFlightReviewed, userApprovedExactPacket: true })).status, 200);
  let inFlightSubmissions = 0;
  let inFlightReceiptReads = 0;
  let signalFirstSubmission!: () => void;
  let releaseFirstSubmission!: () => void;
  const firstSubmissionStarted = new Promise<void>((resolve) => { signalFirstSubmission = resolve; });
  const firstSubmissionMayFinish = new Promise<void>((resolve) => { releaseFirstSubmission = resolve; });
  const inFlightCheckout = createDebtValidationCheckoutHttpHandler({
    allowedOrigin: origin, repository, authenticate,
    submitNewClaim: async () => {
      inFlightSubmissions++;
      signalFirstSubmission();
      await firstSubmissionMayFinish;
      return "pending" as const;
    },
    reconcileClaim: async () => {
      inFlightReceiptReads++;
      return "pending" as const;
    },
  });
  const inFlightRequest = { ...inFlightReviewed, userConfirmedCheckout: true };
  const firstInFlight = action("/api/debt-validation/checkout", inFlightRequest, inFlightCheckout);
  await firstSubmissionStarted;
  try {
    const overlappingRetry = await action("/api/debt-validation/checkout", inFlightRequest, inFlightCheckout);
    assert.equal(overlappingRetry.status, 202, "overlapping retry only reconciles the durable claim");
    assert.equal(inFlightSubmissions, 1, "in-flight retry cannot submit a second charge or letter");
    assert.equal(inFlightReceiptReads, 1, "in-flight retry uses read-only receipt reconciliation");
  } finally {
    releaseFirstSubmission();
  }
  assert.equal((await firstInFlight).status, 202, "original pending submission completes normally");
  assert.equal(inFlightSubmissions, 1, "only one provider handoff across overlapping checkout requests");
});
