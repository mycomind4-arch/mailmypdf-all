/**
 * Review-only HTTP boundary for debt-validation exact-packet approval.
 *
 * NOT MOUNTED: a production route still needs reviewed schema/RLS, immutable
 * owner-scoped packet persistence, and deployment approval. This handler
 * deliberately has no checkout, Stripe, Lob, or mailing capability.
 */
import {
  approveDebtValidationMatter,
  type DebtValidationMatterRepository,
} from "../../../../dispute-mail/workflows/debt-validation/server-matter-approval";

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
      const code = error instanceof Error ? error.message : "invalid_json";
      return response(code === "body_too_large" ? 413 : code === "invalid_content_type" ? 415 : 400, code);
    }
    // Do not accept an owner, trusted notice, approval binding, or packet from
    // the browser. All authoritative values are read from the owner's store.
    if ("ownerId" in body || "trustedNotice" in body || "binding" in body || "packet" in body) {
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
