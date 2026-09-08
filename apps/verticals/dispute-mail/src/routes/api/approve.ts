/**
 * POST /api/approve
 *
 * Server-side approval gate for Dispute Mail.
 *
 * Validates draft completeness, recipient address, and case ownership.
 * Persists an immutable approval record with SHA-256 hashes of the draft
 * and recipient. These hashes are later verified during fulfillment to
 * ensure the mailing matches what was approved.
 *
 * The approval ID is required by /api/checkout.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { hashDraft, hashRecipient } from "@mailmypdf/payment-fulfillment";

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase server configuration is incomplete.");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/approve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const input = (await request.json()) as {
            caseId?: string;
            workflowId?: string;
            draftContent?: string;
            recipient?: {
              name?: string;
              org?: string;
              address1?: string;
              address2?: string;
              city?: string;
              state?: string;
              zip?: string;
            };
          };

          const caseId = input?.caseId?.trim();
          const workflowId = input?.workflowId?.trim();
          const draft = input?.draftContent?.trim();
          const recipient = input?.recipient;

          if (!caseId) {
            return Response.json({ error: "Case ID is required." }, { status: 400 });
          }
          if (!workflowId) {
            return Response.json({ error: "Workflow ID is required." }, { status: 400 });
          }
          if (!draft || draft.length < 20) {
            return Response.json(
              { error: "A completed draft is required before approval." },
              { status: 400 }
            );
          }
          if (draft.length > 500_000) {
            return Response.json(
              { error: "Draft exceeds maximum size." },
              { status: 400 }
            );
          }
          if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) {
            return Response.json(
              {
                error: "A complete recipient address is required before approval.",
              },
              { status: 400 }
            );
          }
          if (!/^[A-Za-z]{2}$/.test(recipient.state)) {
            return Response.json(
              { error: "Recipient state must be a 2-letter abbreviation." },
              { status: 400 }
            );
          }
          if (!/^\d{5}(-\d{4})?$/.test(recipient.zip)) {
            return Response.json(
              { error: "Recipient ZIP code is invalid." },
              { status: 400 }
            );
          }

          const supabase = serviceSupabase();

          // Verify case ownership
          const { data: ownedCase, error: caseError } = await supabase
            .from("dispute_cases")
            .select("id")
            .eq("id", caseId)
            .eq("owner_id", user.id)
            .maybeSingle();

          if (caseError || !ownedCase) {
            return Response.json(
              { error: "Dispute case not found or not owned by this account." },
              { status: 404 }
            );
          }

          // Revoke prior active approvals for this case (only one active approval per case)
          await supabase
            .from("approvals")
            .update({
              status: "revoked",
              updated_at: new Date().toISOString(),
            })
            .eq("case_id", caseId)
            .eq("owner_id", user.id)
            .eq("status", "active");

          // Hash the draft and recipient using the shared package functions
          const draftHash = hashDraft(draft);
          const recipientHash = hashRecipient(
            recipient as Record<string, string>
          );

          // Create approval record
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
              status: "active",
            })
            .select("id, draft_hash, recipient_hash, approved_at")
            .single();

          if (approvalError || !approval) {
            return Response.json(
              {
                error: `Unable to record approval: ${
                  approvalError?.message || "unknown error"
                }`,
              },
              { status: 502 }
            );
          }

          return Response.json({
            ok: true,
            approvalId: approval.id,
            draftHash: approval.draft_hash,
            recipientHash: approval.recipient_hash,
            approvedAt: approval.approved_at,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to approve.";
          return Response.json(
            { error: message },
            {
              status: /authentication|required|token/i.test(message) ? 401 : 502,
            }
          );
        }
      },
    },
  },
});
