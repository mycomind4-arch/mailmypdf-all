/**
 * Unmounted authenticated intake-to-packet boundary for debt validation.
 *
 * The browser supplies its dispute text and explicit notice confirmation, NOT
 * the trusted notice, its PDF bytes, the owner, the quote or the packet.
 * A trusted host must load the source from the verified user's vault and use
 * create-only owner-scoped persistence. No payment, Lob or mail adapter exists.
 *
 * Do not mount until hosted RLS, immutable document storage, route security,
 * and independent legal/security review are complete.
 */
import { calculateQuote } from "@mailmypdf/pricing";
import {
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../../../../dispute-mail/workflows/debt-validation/domain";
import { createLocalDebtValidationPdfPreview } from "../../../../dispute-mail/workflows/debt-validation/pdf-preview";
import type { TrustedDebtValidationNotice, DebtValidationPacketSnapshot } from "../../../../dispute-mail/workflows/debt-validation/server-approval-binding";
import type { prepareDebtValidationMatterPacket } from "../../../../dispute-mail/workflows/debt-validation/server-packet-preparation";

type PreparedInput = Parameters<typeof prepareDebtValidationMatterPacket>[0];
type MailClass = DebtValidationPacketSnapshot["mailClass"];

export interface DebtValidationIntakeHttpDependencies {
  allowedOrigin: string;
  authenticate(request: Request): Promise<{ id: string } | null>;
  /** A single verified owner/matter/document read; never use request-supplied notice metadata. */
  loadVerifiedNotice(ownerId: string, matterId: string, documentId: string): Promise<{
    trustedNotice: TrustedDebtValidationNotice;
    noticePdfBytes: Uint8Array;
  } | null>;
  /** Must be create-only and atomic; existing PGlite adapter implements this contract. */
  persistPreparedMatter(input: PreparedInput): Promise<DebtValidationPacketSnapshot>;
}

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
} as const;
const fields = new Set(["matterId", "noticeDocumentId", "letterDate", "mailClass", "intake"]);
const intakeFields = new Set([
  "consumerName", "consumerMailingAddress", "collectorName",
  "collectorResponseAddress", "accountReference", "disputeExplanation",
  "requestOriginalCreditor", "noticeDocumentId", "noticeSha256",
  "noticeVersion", "noticeResponseAddress", "noticeDate",
  "noticeDisputeDeadline", "recipientConfirmed", "confirmedRecipientAddress",
  "confirmedNoticeSha256", "confirmedNoticeDocumentId", "confirmedNoticeVersion",
]);

function reply(status: number, code: string, details?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ code, ...details }), { status, headers });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new Error("invalid_content_type");
  }
  const limit = 8192;
  // Reject an oversized declared body before consuming its stream. The
  // streaming byte limit below remains authoritative for absent/false lengths.
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > limit) {
    throw new Error("body_too_large");
  }
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
  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Return the same generic error for invalid JSON and malformed UTF-8.
  }
  throw new Error("invalid_json");
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Only creates an owner-scoped, unapproved packet for later exact PDF review.
 * The response never grants approval, claims checkout, or submits a provider.
 */
export function createDebtValidationIntakeHttpHandler(deps: DebtValidationIntakeHttpDependencies) {
  if (!deps.allowedOrigin || new URL(deps.allowedOrigin).origin !== deps.allowedOrigin) {
    throw new Error("debt_validation_invalid_allowed_origin");
  }
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    // Fetch Metadata is an additional browser-origin guard. A sibling
    // subdomain is same-site but not same-origin; reject it before auth,
    // owner-scoped storage, consent, or a provider callback. Requests from
    // non-browser clients may omit this header but still require Origin.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (request.headers.get("origin") !== deps.allowedOrigin
      || (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none")) {
      return reply(403, "origin_not_allowed");
    }
    let actor: { id: string } | null;
    try {
      actor = await deps.authenticate(request);
    } catch {
      return reply(401, "authentication_required");
    }
    if (typeof actor?.id !== "string" || !actor.id.trim() || actor.id !== actor.id.trim()
      || /[\u0000-\u001f\u007f\p{Cf}]/u.test(actor.id)) {
      return reply(401, "authentication_required");
    }

    let body: Record<string, unknown>;
    try {
      body = await readJson(request);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      return reply(code === "body_too_large" ? 413 : code === "invalid_content_type" ? 415 : 400,
        ["body_too_large", "invalid_content_type"].includes(code) ? code : "invalid_json");
    }
    if (Object.keys(body).some((key) => !fields.has(key))) {
      return reply(400, "untrusted_intake_fields");
    }
    const { matterId, noticeDocumentId, letterDate, mailClass } = body;
    const rawIntake = body.intake;
    if (typeof matterId !== "string" || !matterId.trim() || matterId.length > 128
      || typeof noticeDocumentId !== "string" || !noticeDocumentId.trim()
      || noticeDocumentId.length > 200 || !validDate(letterDate)
      || !["standard", "certified", "registered"].includes(String(mailClass))
      || !rawIntake || typeof rawIntake !== "object" || Array.isArray(rawIntake)
      || Object.keys(rawIntake).some((key) => !intakeFields.has(key))) {
      return reply(400, "invalid_intake_request");
    }
    const intake = rawIntake as DebtValidationIntake;
    if (intake.noticeDocumentId !== noticeDocumentId
      || validateDebtValidationIntake(intake).length > 0) {
      return reply(409, "debt_validation_invalid_intake");
    }

    try {
      const source = await deps.loadVerifiedNotice(actor.id, matterId, noticeDocumentId);
      if (!source) return reply(404, "trusted_notice_not_found");
      const { trustedNotice, noticePdfBytes } = source;
      if (!trustedNotice || trustedNotice.ownerId !== actor.id
        || trustedNotice.matterId !== matterId
        || trustedNotice.documentId !== noticeDocumentId
        || trustedNotice.mailingAddressVerified !== true) {
        return reply(409, "debt_validation_unverified_notice");
      }
      // Quote is computed from the actual canonical PDF, never from a browser
      // price or an assumed page count. The persistence adapter independently
      // prepares and validates the PDF/quote before its create-only insert.
      let preview: Awaited<ReturnType<typeof createLocalDebtValidationPdfPreview>>;
      try {
        preview = await createLocalDebtValidationPdfPreview(intake, letterDate);
      } catch {
        return reply(409, "debt_validation_invalid_generated_pdf");
      }
      const quote = calculateQuote({
        workflowId: "debt-validation",
        verticalId: "dispute-mail",
        actualPages: preview.responsePages,
        supportingPages: preview.supportingPages,
        mailClass: mailClass as MailClass,
      });
      const packet = await deps.persistPreparedMatter({
        ownerId: actor.id, matterId, matterVersion: 1,
        intake, trustedNotice, noticePdfBytes, letterDate,
        mailClass: mailClass as MailClass, totalCents: quote.totalCents,
      });
      return reply(201, "packet_prepared_for_review", {
        matterId, pdfSha256: packet.pdfSha256,
        matterVersion: packet.matterVersion,
        enclosureManifestSha256: packet.enclosureManifestSha256,
        totalCents: packet.totalCents, mailClass: packet.mailClass,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (/^debt_validation_[a-z_]+$/.test(code)) return reply(409, code);
      return reply(500, "intake_unavailable");
    }
  };
}
