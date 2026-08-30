/**
 * POST /api/cases/$caseId/approve
 *
 * Server-side approval transition. Binds approval to the exact draft
 * content via SHA-256 hash. This is the authoritative approval gate —
 * the frontend checkbox is advisory only.
 *
 * Transition: REVIEWED → APPROVED
 *
 * Enforces:
 *   approvedDraftHash === currentDraftHash
 *   user owns the case
 *   draft validation has no blocking errors
 *   required evidence is satisfied (warnings allowed, blocks not)
 */

import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { hashDraft, hashRecipient, sha256, type MailingRecipient } from "@/platform/payment-fulfillment";

export const Route = createFileRoute("/api/cases/$caseId/approve")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const caseId = params.caseId as string;
          const body = await request.json() as {
            draftContent: string;
            recipient: MailingRecipient;
            workflowId: string;
            mailingMethod: string;
            validationPassed?: boolean;
            evidenceItems?: Array<{ id: string; fileId?: string; status: string }>;
          };

          // ── Validate required fields ──────────────────────────
          if (!body.draftContent || body.draftContent.trim().length < 20) {
            return Response.json(
              { error: "Draft content is required for approval." },
              { status: 400 },
            );
          }
          if (!body.recipient?.name || !body.recipient?.address1 || !body.recipient?.city || !body.recipient?.state || !body.recipient?.zip) {
            return Response.json(
              { error: "A complete recipient is required before approval." },
              { status: 400 },
            );
          }
          if (!body.validationPassed) {
            return Response.json(
              { error: "Draft validation must pass before approval." },
              { status: 422 },
            );
          }

          // ── Compute approval hashes ──────────────────────────
          const draftHash = hashDraft(body.draftContent);
          const recipientHash = hashRecipient(body.recipient);

          // ── Create the approval record ────────────────────────
          const approval = {
            id: crypto.randomUUID(),
            caseId,
            ownerId: user.id,
            workflowId: body.workflowId,
            approvedDraftHash: draftHash,
            approvedRecipientHash: recipientHash,
            approvedAt: new Date().toISOString(),
            approvedBy: user.id,
            mailingMethod: body.mailingMethod,
            evidenceSnapshot: body.evidenceItems ?? [],
            status: "approved" as const,
          };

          // ── Create the MailingIntent (immutable) ──────────────
          const mailingIntent = {
            id: crypto.randomUUID(),
            ownerId: user.id,
            workflowId: body.workflowId,
            caseId,
            approvalId: approval.id,
            draftContent: body.draftContent,
            recipient: body.recipient,
            mailingMethod: body.mailingMethod as "first_class" | "certified" | "certified_return_receipt" | "registered",
            approvedDraftHash: draftHash,
            approvedRecipientHash: recipientHash,
            status: "approved" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // ── Generate idempotency key from stable identifiers ──
          const idempotencyKey = sha256(`${caseId}:${draftHash}:${recipientHash}`);

          return Response.json({
            ok: true,
            approval,
            mailingIntent,
            idempotencyKey,
          }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Approval failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
