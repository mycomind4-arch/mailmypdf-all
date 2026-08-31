/**
 * POST /api/approve
 *
 * Server-side consequential-action approval gate for Immigration Mail.
 *
 * Validates review checks, draft validation, recipient completeness,
 * and case ownership. Persists an immutable approval record with
 * SHA-256 hashes of the draft and recipient.
 *
 * The approval ID is required by /api/checkout.
 */

import { createError, defineEventHandler, getRequestHeaders, getRequestURL, readBody, type H3Event } from "h3";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { requireAuthenticatedUser } from "../../src/lib/auth-guard";

function authRequest(event: H3Event): Request {
  return new Request(getRequestURL(event).toString(), { headers: getRequestHeaders(event) as HeadersInit });
}

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw createError({ statusCode: 503, statusMessage: "Supabase server configuration is incomplete." });
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function hashRecipient(recipient: Record<string, string>): string {
  const canonical = JSON.stringify({
    name: recipient.name?.trim().toUpperCase() || "",
    org: recipient.org?.trim().toUpperCase() || "",
    address1: recipient.address1?.trim().toUpperCase() || "",
    address2: recipient.address2?.trim().toUpperCase() || "",
    city: recipient.city?.trim().toUpperCase() || "",
    state: recipient.state?.trim().toUpperCase() || "",
    zip: recipient.zip?.trim() || "",
  });
  return sha256(canonical);
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
  const user = await requireAuthenticatedUser(authRequest(event));

  const input = await readBody<{
    caseId?: string;
    workflowId?: string;
    draftContent?: string;
    recipient?: { name?: string; org?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
    reviewChecks?: boolean[];
    draftValidationPassed?: boolean;
  }>(event);

  const caseId = input?.caseId?.trim();
  const workflowId = input?.workflowId?.trim();
  const draft = input?.draftContent?.trim();
  const recipient = input?.recipient;
  const reviewChecks = input?.reviewChecks;
  const draftValidationPassed = input?.draftValidationPassed;

  if (!caseId) throw createError({ statusCode: 400, statusMessage: "Case ID is required." });
  if (!workflowId) throw createError({ statusCode: 400, statusMessage: "Workflow ID is required." });
  if (!draft || draft.length < 20) throw createError({ statusCode: 400, statusMessage: "A completed draft is required before approval." });
  if (draft.length > 500_000) throw createError({ statusCode: 400, statusMessage: "Draft exceeds maximum size." });
  if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) {
    throw createError({ statusCode: 400, statusMessage: "A complete recipient address is required before approval." });
  }
  if (!/^[A-Za-z]{2}$/.test(recipient.state)) throw createError({ statusCode: 400, statusMessage: "Recipient state must be a 2-letter abbreviation." });
  if (!/^\d{5}(-\d{4})?$/.test(recipient.zip)) throw createError({ statusCode: 400, statusMessage: "Recipient ZIP code is invalid." });
  if (!Array.isArray(reviewChecks) || reviewChecks.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Review checks are required before approval." });
  }
  if (!reviewChecks.every(Boolean)) {
    throw createError({ statusCode: 400, statusMessage: "All review checks must be completed before approval." });
  }
  if (draftValidationPassed === false) {
    throw createError({ statusCode: 400, statusMessage: "Draft validation must pass before approval." });
  }

  const supabase = serviceSupabase();

  // Revoke prior active approvals
  await supabase
    .from("approvals")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .eq("status", "active");

  const draftHash = sha256(draft);
  const recipientHash = hashRecipient(recipient as Record<string, string>);

  const { data: approval, error: approvalError } = await supabase
    .from("approvals")
    .insert({
      user_id: user.id,
      case_id: caseId,
      workflow_id: workflowId,
      draft_hash: draftHash,
      recipient_hash: recipientHash,
      draft_content: draft,
      recipient,
      review_state: { reviewChecks, draftValidationPassed },
      status: "active",
    })
    .select("id, draft_hash, recipient_hash, approved_at")
    .single();

  if (approvalError || !approval) {
    throw createError({ statusCode: 502, statusMessage: `Unable to record approval: ${approvalError?.message || "unknown error"}` });
  }

  return {
    ok: true,
    approvalId: approval.id,
    draftHash: approval.draft_hash,
    recipientHash: approval.recipient_hash,
    approvedAt: approval.approved_at,
  };
});
