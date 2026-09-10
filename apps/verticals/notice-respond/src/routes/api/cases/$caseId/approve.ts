/**
 * POST /api/cases/$caseId/approve
 *
 * Authoritative server-side approval boundary for a Notice Respond case.
 * Approval is durable, owner-scoped, and bound to the exact reviewed draft
 * and recipient via SHA-256 hashes. Checkout accepts only this persisted ID.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { deserializeCase } from "@/domain/notice";
import { setCaseDraft, type CP2000Case } from "@/domain/cp2000-case";
import { validateCP2000Draft, validateFactualConsistency } from "@/domain/cp2000-validation";
import type { CP2000Extraction } from "@/domain/cp2000";
import type { Discrepancy } from "@/domain/cp2000-discrepancy";
import {
  hashDraft,
  hashRecipient,
  hashEvidenceSnapshot,
  sha256,
  type MailingEvidenceItem,
  type MailingRecipient,
} from "@mailmypdf/payment-fulfillment";

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
            reviewChecks?: boolean[];
            evidenceItems?: Array<{ id: string; fileId?: string; status: string }>;
          };

          if (!body.draftContent || body.draftContent.trim().length < 20) {
            return Response.json(
              { error: "Draft content is required for approval." },
              { status: 400 },
            );
          }
          if (body.draftContent.length > 500_000) {
            return Response.json(
              { error: "Draft exceeds maximum size." },
              { status: 400 },
            );
          }
          if (!body.workflowId?.trim()) {
            return Response.json({ error: "Workflow ID is required." }, { status: 400 });
          }
          if (!body.recipient?.name || !body.recipient?.address1 || !body.recipient?.city || !body.recipient?.state || !body.recipient?.zip) {
            return Response.json(
              { error: "A complete recipient is required before approval." },
              { status: 400 },
            );
          }
          if (!/^[A-Za-z]{2}$/.test(body.recipient.state)) {
            return Response.json({ error: "Recipient state is invalid." }, { status: 400 });
          }
          if (!/^\d{5}(-\d{4})?$/.test(body.recipient.zip)) {
            return Response.json({ error: "Recipient ZIP code is invalid." }, { status: 400 });
          }
          // Client validation state is only a UX signal. The exact draft is
          // independently validated below against the persisted server analysis.
          if (!Array.isArray(body.reviewChecks) || body.reviewChecks.length === 0 || !body.reviewChecks.every(Boolean)) {
            return Response.json(
              { error: "All review checks must be completed before approval." },
              { status: 422 },
            );
          }

          const supabase = serviceSupabase();

          // Service-role access is used only after authenticated ownership is
          // explicitly enforced here. Cross-owner case IDs are indistinguishable
          // from missing cases.
          const { data: ownedCase, error: caseError } = await supabase
            .from("cases")
            .select("id, owner_id, workflow_id, data")
            .eq("id", caseId)
            .eq("owner_id", user.id)
            .maybeSingle();

          if (caseError || !ownedCase) {
            return Response.json({ error: "Case not found." }, { status: 404 });
          }
          if (ownedCase.workflow_id !== body.workflowId) {
            return Response.json(
              { error: "Case does not match the requested workflow." },
              { status: 409 },
            );
          }

          const persistedCase = deserializeCase(
            ownedCase.data as Record<string, unknown>,
          );
          const runtimeChecklist =
            persistedCase.runtimeExecution?.cp2000?.evidenceChecklist?.items;
          const checklistItems = Array.isArray(runtimeChecklist)
            ? runtimeChecklist
            : [];
          const attachedEvidence = Array.isArray(persistedCase.evidence)
            ? persistedCase.evidence
            : [];
          const storedEvidenceFiles = attachedEvidence.filter(
            (item: unknown): item is MailingEvidenceItem => {
              if (typeof item !== "object" || item === null) return false;
              const candidate = item as Partial<MailingEvidenceItem>;
              return Boolean(
                candidate.id &&
                candidate.fileName &&
                candidate.fileType &&
                typeof candidate.fileSize === "number" &&
                candidate.fileHash &&
                candidate.storagePath &&
                candidate.status &&
                ["provided", "verified"].includes(candidate.status)
              );
            },
          );
          const attachedRequirementIds = new Set(
            storedEvidenceFiles
              .map((item) => item.requirementId ?? "")
              .filter(Boolean),
          );
          const missingRequired = checklistItems.filter(
            (item: unknown) => {
              if (typeof item !== "object" || item === null) return false;
              const candidate = item as {
                id?: string;
                label?: string;
                requirement?: string;
                state?: string;
              };
              return (
                candidate.requirement === "required" &&
                candidate.state !== "provided" &&
                candidate.state !== "verified" &&
                (!candidate.id || !attachedRequirementIds.has(candidate.id))
              );
            },
          );

          if (missingRequired.length > 0) {
            return Response.json(
              {
                error: "Required supporting evidence is missing.",
                missingEvidence: missingRequired.map(
                  (item: unknown) =>
                    (item as { label?: string }).label ?? "Required evidence",
                ),
              },
              { status: 422 },
            );
          }

          const cp2000Snapshot = persistedCase.runtimeExecution?.cp2000 as
            | {
                case?: CP2000Case;
                extraction?: CP2000Extraction;
                discrepancies?: Discrepancy[];
              }
            | undefined;

          if (
            !cp2000Snapshot?.case ||
            !cp2000Snapshot.extraction ||
            !Array.isArray(cp2000Snapshot.discrepancies)
          ) {
            return Response.json(
              { error: "Server analysis snapshot is unavailable; re-run the CP2000 analysis before approval." },
              { status: 409 },
            );
          }

          const userFacts =
            (persistedCase.workflowState as { userFacts?: string } | undefined)?.userFacts ??
            persistedCase.userFacts ??
            null;
          const factualFindings = validateFactualConsistency(
            body.draftContent,
            cp2000Snapshot.extraction,
            cp2000Snapshot.discrepancies,
            userFacts,
          );

          const unresolvedPlaceholders = Array.from(
            body.draftContent.matchAll(/\[([A-Z][A-Z0-9 _-]{1,80})\]/g),
          ).map((match) => ({
            placeholder: match[1],
            reason: "Unresolved placeholder remains in the approved draft",
          }));

          const validationCase = setCaseDraft(cp2000Snapshot.case, {
            content: body.draftContent,
            wordCount: body.draftContent.split(/\s+/).filter(Boolean).length,
            unresolvedPlaceholders,
          });
          const requirementValidation = validateCP2000Draft(validationCase);

          const blockingFactual = factualFindings.filter(
            (finding) =>
              !finding.passed &&
              (finding.severity === "error" || finding.severity === "block"),
          );
          if (
            blockingFactual.length > 0 ||
            !requirementValidation.passed ||
            requirementValidation.blocked
          ) {
            return Response.json(
              {
                error: "The exact draft failed server-side CP2000 validation.",
                validation: {
                  factual: factualFindings,
                  requirements: requirementValidation,
                },
              },
              { status: 422 },
            );
          }

          const draftHash = hashDraft(body.draftContent);
          const recipientHash = hashRecipient(body.recipient);
          const evidenceHash = hashEvidenceSnapshot(storedEvidenceFiles);

          // Any content/recipient change requires a new approval; only one
          // active approval may authorize checkout for a case.
          const { error: revokeError } = await supabase
            .from("approvals")
            .update({
              status: "revoked",
              revoked_at: new Date().toISOString(),
            })
            .eq("case_id", caseId)
            .eq("owner_id", user.id)
            .eq("status", "active");

          if (revokeError) {
            return Response.json(
              { error: `Unable to revoke prior approval: ${revokeError.message}` },
              { status: 502 },
            );
          }

          const { data: persisted, error: approvalError } = await supabase
            .from("approvals")
            .insert({
              owner_id: user.id,
              case_id: caseId,
              workflow_id: body.workflowId,
              draft_hash: draftHash,
              recipient_hash: recipientHash,
              evidence_hash: evidenceHash,
              draft: body.draftContent,
              recipient: body.recipient,
              review_state: {
                reviewChecks: body.reviewChecks,
                validationPassed: true,
                serverValidation: {
                  factual: factualFindings,
                  requirements: requirementValidation,
                },
                evidenceItems: storedEvidenceFiles,
                mailingMethod: body.mailingMethod,
              },
              status: "active",
            })
            .select("id, draft_hash, recipient_hash, evidence_hash, approved_at")
            .single();

          if (approvalError || !persisted) {
            return Response.json(
              { error: `Unable to persist approval: ${approvalError?.message || "unknown error"}` },
              { status: 502 },
            );
          }

          const approval = {
            id: persisted.id as string,
            caseId,
            ownerId: user.id,
            workflowId: body.workflowId,
            approvedDraftHash: persisted.draft_hash as string,
            approvedRecipientHash: persisted.recipient_hash as string,
            approvedEvidenceHash: persisted.evidence_hash as string,
            approvedAt: persisted.approved_at as string,
            approvedBy: user.id,
            mailingMethod: body.mailingMethod,
            evidenceSnapshot: storedEvidenceFiles,
            status: "approved" as const,
          };

          // Backward-compatible stable key for callers that record approval
          // identity. Actual provider submission idempotency is anchored to
          // the Stripe Checkout Session in @mailmypdf/payment-fulfillment.
          const idempotencyKey = sha256(
            `${caseId}:${approval.approvedDraftHash}:${approval.approvedRecipientHash}:${approval.approvedEvidenceHash}`,
          );

          return Response.json({
            ok: true,
            approval,
            idempotencyKey,
          }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Approval failed.";
          if (/authentication|required|token/i.test(message)) {
            return authErrorResponse(error);
          }
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
