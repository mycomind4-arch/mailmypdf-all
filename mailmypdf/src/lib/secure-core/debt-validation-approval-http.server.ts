/**
 * Review-only HTTP boundary for debt-validation exact-packet approval.
 *
 * NOT MOUNTED: a production route still needs reviewed schema/RLS, immutable
 * owner-scoped packet persistence, and deployment approval. This handler
 * deliberately has no checkout, Stripe, Lob, or mailing capability.
 */
import {
  approveDebtValidationMatter,
  checkoutDebtValidationMatter,
  type DebtValidationMatterRepository,
  assertDebtValidationPersistedPdf,
} from "../../../../dispute-mail/workflows/debt-validation/server-matter-approval";
import { createDebtValidationApprovalBinding, type DebtValidationApprovalBinding } from "../../../../dispute-mail/workflows/debt-validation/server-approval-binding";

interface AuthenticatedActor { id: string }

export interface DebtValidationApprovalHttpDependencies {
  authenticate(request: Request): Promise<AuthenticatedActor | null>;
  repository: DebtValidationMatterRepository;
  /** Exact trusted application origin, e.g. https://mailmypdf.example. */
  allowedOrigin: string;
}

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
} as const;

function response(status: number, code: string, details?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ code, ...details }), { status, headers });
}

async function boundedJson(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new Error("invalid_content_type");
  }
  const limit = 8192;
  const length = request.headers.get("content-length");
  if (length !== null && Number(length) > limit) throw new Error("body_too_large");
  if (!request.body) throw new Error("invalid_json");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("invalid_json");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid_json");
  }
  return parsed as Record<string, unknown>;
}

/**
 * A request stream can reject with an arbitrary underlying transport error.
 * Never echo that exception text to an unauthenticated or authenticated client.
 * Only our explicitly defined size/content-type errors are public codes.
 */
function invalidBodyResponse(error: unknown): Response {
  const code = error instanceof Error ? error.message : "";
  if (code === "body_too_large") return response(413, code);
  if (code === "invalid_content_type") return response(415, code);
  return response(400, "invalid_json");
}

const approvalFields = new Set([
  "matterId", "reviewedPdfSha256", "reviewedTotalCents",
  "reviewedMailClass", "userApprovedExactPacket",
]);

export function createDebtValidationApprovalHttpHandler(deps: DebtValidationApprovalHttpDependencies) {
  if (!deps.allowedOrigin || new URL(deps.allowedOrigin).origin !== deps.allowedOrigin) {
    throw new Error("debt_validation_invalid_allowed_origin");
  }
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return response(405, "method_not_allowed");
    // Cookies must not authorize a cross-origin POST. The trusted origin is
    // supplied by server configuration, never by the request or its Host header.
    if (request.headers.get("origin") !== deps.allowedOrigin) {
      return response(403, "origin_not_allowed");
    }
    let actor: AuthenticatedActor | null;
    try {
      actor = await deps.authenticate(request);
    } catch {
      return response(401, "authentication_required");
    }
    if (!actor?.id?.trim()) return response(401, "authentication_required");
    let body: Record<string, unknown>;
    try {
      body = await boundedJson(request);
    } catch (error) {
      return invalidBodyResponse(error);
    }
    // Do not accept an owner, trusted notice, approval binding, or packet from
    // the browser. All authoritative values are read from the owner's store.
    if (Object.keys(body).some((key) => !approvalFields.has(key))) {
      return response(400, "untrusted_approval_fields");
    }
    if (typeof body.matterId !== "string" || !body.matterId.trim()
      || typeof body.reviewedPdfSha256 !== "string"
      || !/^[a-f0-9]{64}$/i.test(body.reviewedPdfSha256)
      || body.userApprovedExactPacket !== true
      || !Number.isSafeInteger(body.reviewedTotalCents)
      || !["standard", "certified", "registered"].includes(String(body.reviewedMailClass))) {
      return response(400, "invalid_approval_request");
    }
    try {
      const binding = await approveDebtValidationMatter({
        ownerId: actor.id,
        matterId: body.matterId,
        repository: deps.repository,
        reviewedPdfSha256: body.reviewedPdfSha256,
        reviewedTotalCents: body.reviewedTotalCents,
        reviewedMailClass: body.reviewedMailClass,
        userApprovedExactPacket: true,
      });
      return response(200, "approved", {
        matterId: binding.matterId,
        packetSha256: binding.pdfSha256,
        noticeSha256: binding.noticeSha256,
        matterVersion: binding.matterVersion,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (/^debt_validation_[a-z_]+$/.test(code)) return response(409, code);
      return response(500, "approval_unavailable");
    }
  };
}

/**
 * Unmounted, explicit checkout HTTP boundary. The only side-effecting adapter
 * is supplied by the host; this module never configures Stripe or Lob.
 *
 * A new submission is possible only AFTER the repository atomically reserves
 * the exact approved order. Retries use the read-only reconciliation adapter,
 * never the submission callback. Do not mount until persistence/RLS, provider
 * idempotency and receipt reconciliation have been independently reviewed.
 */
interface VerifiedDebtValidationClaim {
  binding: DebtValidationApprovalBinding;
  idempotencyKey: string;
  expectedMatterVersion: number;
}
type CheckoutProgress = "pending" | "recorded";

export interface DebtValidationCheckoutHttpDependencies extends DebtValidationApprovalHttpDependencies {
  /** Called once for a NEW durable claim. Mock-only until release review. */
  submitNewClaim(verified: VerifiedDebtValidationClaim): Promise<CheckoutProgress>;
  /** Read-only receipt lookup for an existing claim; MUST NOT resubmit. */
  reconcileClaim(verified: VerifiedDebtValidationClaim): Promise<CheckoutProgress>;
}

const checkoutFields = new Set([
  "matterId", "reviewedPdfSha256", "reviewedTotalCents",
  "reviewedMailClass", "userConfirmedCheckout",
]);

export function createDebtValidationCheckoutHttpHandler(deps: DebtValidationCheckoutHttpDependencies) {
  if (!deps.allowedOrigin || new URL(deps.allowedOrigin).origin !== deps.allowedOrigin) {
    throw new Error("debt_validation_invalid_allowed_origin");
  }
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return response(405, "method_not_allowed");
    if (request.headers.get("origin") !== deps.allowedOrigin) {
      return response(403, "origin_not_allowed");
    }
    let actor: AuthenticatedActor | null;
    try {
      actor = await deps.authenticate(request);
    } catch {
      return response(401, "authentication_required");
    }
    if (!actor?.id?.trim()) return response(401, "authentication_required");
    let body: Record<string, unknown>;
    try {
      body = await boundedJson(request);
    } catch (error) {
      return invalidBodyResponse(error);
    }
    // Do not accept browser-selected owners, notice/packet snapshots, order
    // keys, approval bindings, or receipts. The user confirms only the exact
    // already-approved packet/quote, fetched again from owner-scoped storage.
    if (Object.keys(body).some((key) => !checkoutFields.has(key))) {
      return response(400, "untrusted_checkout_fields");
    }
    if (typeof body.matterId !== "string" || !body.matterId.trim()
      || typeof body.reviewedPdfSha256 !== "string"
      || !/^[a-f0-9]{64}$/i.test(body.reviewedPdfSha256)
      || !Number.isSafeInteger(body.reviewedTotalCents)
      || !["standard", "certified", "registered"].includes(String(body.reviewedMailClass))
      || body.userConfirmedCheckout !== true) {
      return response(400, "invalid_checkout_request");
    }
    try {
      const approved = await deps.repository.loadApproval(actor.id, body.matterId);
      if (!approved
        || approved.pdfSha256.toLowerCase() !== body.reviewedPdfSha256.toLowerCase()
        || approved.totalCents !== body.reviewedTotalCents
        || approved.mailClass !== body.reviewedMailClass) {
        return response(409, "debt_validation_approval_or_quote_changed");
      }
      // The domain function independently rechecks the current notice, intake,
      // PDF bytes and binding, then atomically claims checkout before calling
      // submitNewClaim. The preflight comparison alone is not authorization.
      const progress = await checkoutDebtValidationMatter({
        ownerId: actor.id,
        matterId: body.matterId,
        repository: deps.repository,
        checkout: deps.submitNewClaim,
        replayCheckout: deps.reconcileClaim,
      });
      if (progress !== "pending" && progress !== "recorded") {
        return response(500, "checkout_status_unavailable");
      }
      // A durable claim is NOT proof of a charge, mailing, or delivery.
      return response(progress === "pending" ? 202 : 200, "checkout_claim_" + progress);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (/^debt_validation_[a-z_]+$/.test(code)) return response(409, code);
      return response(500, "checkout_unavailable");
    }
  };
}

/**
 * Read-only, authenticated preview of the exact server-persisted letter PDF.
 *
 * NOT MOUNTED. This is the missing review boundary between owner-scoped packet
 * persistence and explicit approval. It never records consent, reserves an
 * order, contacts Stripe/Lob, or exposes the controlling notice as an enclosure.
 * A future host must provide reviewed authentication, schema/RLS and routing.
 */
export function createDebtValidationPacketReviewHttpHandler(deps: DebtValidationApprovalHttpDependencies) {
  if (!deps.allowedOrigin || new URL(deps.allowedOrigin).origin !== deps.allowedOrigin) {
    throw new Error("debt_validation_invalid_allowed_origin");
  }
  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET") return response(405, "method_not_allowed");
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return response(400, "invalid_review_request");
    }
    if (url.origin !== deps.allowedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
      return response(403, "origin_not_allowed");
    }
    let actor: AuthenticatedActor | null;
    try {
      actor = await deps.authenticate(request);
    } catch {
      return response(401, "authentication_required");
    }
    if (!actor?.id?.trim()) return response(401, "authentication_required");
    const entries = Array.from(url.searchParams.entries());
    const matterValues = url.searchParams.getAll("matterId");
    const viewValues = url.searchParams.getAll("view");
    const summaryRequested = viewValues.length === 1 && viewValues[0] === "summary";
    // Accept exactly one owner-scoped matter ID, optionally requesting the
    // read-only envelope/quote summary. Never accept client-selected recipients,
    // owners, prices, duplicate keys, or arbitrary review options.
    const validQuery = matterValues.length === 1
      && (entries.length === 1 || (entries.length === 2 && summaryRequested));
    const matterId = validQuery ? matterValues[0] : "";
    if (!matterId.trim() || matterId.length > 200) {
      return response(400, "invalid_review_request");
    }
    try {
      const snapshot = await deps.repository.loadCurrent(actor.id, matterId);
      if (!snapshot) return response(404, "review_packet_not_found");
      // Only an internally consistent, notice-bound packet can be presented as
      // the server review artifact. This is NOT the user's approval action.
      createDebtValidationApprovalBinding({
        ownerId: actor.id,
        matterId,
        intake: snapshot.currentIntake,
        trustedNotice: snapshot.trustedNotice,
        packet: snapshot.packet,
        reviewedPdfSha256: snapshot.packet.pdfSha256,
      });
      const bytes = await deps.repository.loadPacketPdfBytes(actor.id, matterId);
      assertDebtValidationPersistedPdf(bytes, snapshot.packet.pdfSha256);
      if (summaryRequested) {
        // The PDF alone does not tell a checkout UI which physical envelope
        // destination and return address the server will use. Bind those
        // review facts to the same owner-scoped, verified PDF and quote.
        // This GET is read-only: it cannot approve, charge, or submit mail.
        const intake = snapshot.currentIntake;
        return new Response(JSON.stringify({
          code: "review_ready",
          matterId,
          pdfSha256: snapshot.packet.pdfSha256,
          totalCents: snapshot.packet.totalCents,
          mailClass: snapshot.packet.mailClass,
          recipientAddress: snapshot.packet.recipientAddress,
          returnAddress: [intake.consumerName.trim(), intake.consumerMailingAddress.trim()].join("\n"),
          noticeDocumentId: snapshot.packet.noticeDocumentId,
          noticeSha256: snapshot.packet.noticeSha256,
          noticeVersion: snapshot.packet.noticeVersion,
        }), {
          status: 200,
          headers: {
            ...headers,
            "referrer-policy": "no-referrer",
            "x-robots-tag": "noindex, nofollow",
          },
        });
      }
      // Copy the bytes to avoid returning a mutable repository buffer.
      const payload = Uint8Array.from(bytes!);
      return new Response(payload.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "cache-control": "private, no-store",
          "content-disposition": 'inline; filename="debt-validation-review.pdf"',
          "x-content-type-options": "nosniff",
          "x-frame-options": "SAMEORIGIN",
          "referrer-policy": "no-referrer",
          "x-robots-tag": "noindex, nofollow",
          "x-reviewed-pdf-sha256": snapshot.packet.pdfSha256,
          "x-reviewed-total-cents": String(snapshot.packet.totalCents),
          "x-reviewed-mail-class": snapshot.packet.mailClass,
        },
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (/^debt_validation_[a-z_]+$/.test(code)) return response(409, code);
      return response(500, "review_unavailable");
    }
  };
}
