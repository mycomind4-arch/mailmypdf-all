/**
 * POST /api/approve
 *
 * Server-side consequential-action approval gate.
 *
 * The client sends the case ID and the current workflow state (draft,
 * recipient, review checks). The server:
 *   1. Authenticates the user.
 *   2. Loads the case from Supabase and verifies ownership.
 *   3. Validates the workflow state: review checks complete, draft
 *      validation passed, draft non-empty, recipient complete.
 *   4. Computes SHA-256 hashes of the draft and recipient.
 *   5. Persists an immutable approval record.
 *   6. Returns the approval ID.
 *
 * The approval ID is required by /api/checkout. The checkout endpoint
 * will use the approved draft and recipient from this record, NOT
 * client-supplied values.
 */

import { createError, defineEventHandler, getRequestHeaders, getRequestURL, readBody, type H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
// Hashing now from @mailmypdf/payment-fulfillment via shared platform module
import { requireAuthenticatedUser } from "../../src/lib/auth-guard";
import { sha256, hashRecipient } from "../../src/platform/approval";

function toAuthRequest(event: H3Event): Request {
  return new Request(getRequestURL(event).toString(), {
    headers: getRequestHeaders(event) as HeadersInit,
  });
}

function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw createError({ statusCode: 503, statusMessage: "Supabase server configuration is incomplete." });
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });

  const user = await requireAuthenticatedUser(toAuthRequest(event));

  const input = await readBody<{
    caseId?: string;
    workflowId?: string;
    draft?: string;
    recipient?: { name?: string; org?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
    reviewChecks?: boolean[];
    draftValidationPassed?: boolean;
  }>(event);

  const caseId = input?.caseId?.trim();
  const workflowId = input?.workflowId?.trim();
  const draft = input?.draft?.trim();
  const recipient = input?.recipient;
  const reviewChecks = input?.reviewChecks;
  const draftValidationPassed = input?.draftValidationPassed;

  // ── Validate required fields ──────────────────────────────
  if (!caseId) throw createError({ statusCode: 400, statusMessage: "Case ID is required." });
  if (!workflowId) throw createError({ statusCode: 400, statusMessage: "Workflow ID is required." });
  if (!draft || draft.length < 20) throw createError({ statusCode: 400, statusMessage: "A completed draft is required before approval." });
  if (draft.length > 500_000) throw createError({ statusCode: 400, statusMessage: "Draft exceeds maximum size." });

  // ── Validate recipient ─────────────────────────────────────
  if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) {
    throw createError({ statusCode: 400, statusMessage: "A complete recipient address is required before approval." });
  }
  if (!/^[A-Za-z]{2}$/.test(recipient.state)) throw createError({ statusCode: 400, statusMessage: "Recipient state must be a 2-letter abbreviation." });
  if (!/^\d{5}(-\d{4})?$/.test(recipient.zip)) throw createError({ statusCode: 400, statusMessage: "Recipient ZIP code is invalid." });

  // ── Validate review checks ─────────────────────────────────
  if (!Array.isArray(reviewChecks) || reviewChecks.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Review checks are required before approval." });
  }
  if (!reviewChecks.every(Boolean)) {
    throw createError({ statusCode: 400, statusMessage: "All review checks must be completed before approval." });
  }

  // ── Validate draft validation ──────────────────────────────
  if (draftValidationPassed === false) {
    throw createError({ statusCode: 400, statusMessage: "Draft validation must pass before approval." });
  }

  // ── Verify case ownership ──────────────────────────────────
  const supabase = getSupabaseServiceClient();
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id, owner_id, data")
    .eq("id", caseId)
    .eq("owner_id", user.id)
    .single();

  if (caseError || !caseRow) {
    throw createError({ statusCode: 404, statusMessage: "Case not found or not owned by the authenticated user." });
  }

  // ── Revoke any prior active approvals for this case ────────
  await supabase
    .from("approvals")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("case_id", caseId)
    .eq("owner_id", user.id)
    .eq("status", "active");

  // ── Compute hashes ─────────────────────────────────────────
  const draftHash = sha256(draft);
  const recipientHash = hashRecipient(recipient as Record<string, string>);

  // ── Persist the approval record ────────────────────────────
  const { data: approval, error: approvalError } = await supabase
    .from("approvals")
    .insert({
      owner_id: user.id,
      case_id: caseId,
      workflow_id: workflowId,
      draft_hash: draftHash,
      recipient_hash: recipientHash,
      draft,
      recipient,
      review_state: { reviewChecks, draftValidationPassed },
      status: "active",
    })
    .select("id, draft_hash, recipient_hash, approved_at")
    .single();

  if (approvalError || !approval) {
    throw createError({ statusCode: 502, statusMessage: `Unable to record approval: ${approvalError?.message || "unknown error"}` });
  }

  // ── Record audit entry ────────────────────────────────────
  await supabase.from("audit_entries").insert({
    id: crypto.randomUUID(),
    case_id: caseId,
    owner_id: user.id,
    actor: user.id,
    action: "approve",
    object_type: "workflow",
    description: `Approved draft for mailing (workflow: ${workflowId})`,
    result: "success",
    is_security_event: true,
    data: { approvalId: approval.id, draftHash, recipientHash },
  });

  return {
    ok: true,
    approvalId: approval.id,
    draftHash: approval.draft_hash,
    recipientHash: approval.recipient_hash,
    approvedAt: approval.approved_at,
  };
});
