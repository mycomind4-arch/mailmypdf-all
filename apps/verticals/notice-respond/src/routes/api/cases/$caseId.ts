import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import {
  deserializeCase,
  serializeCase,
  toCaseSummary,
  updateCase,
} from "@/domain/notice";
import type { WorkflowState } from "@/domain/workflow-runtime";

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

function noStore(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

function materialFingerprint(state: WorkflowState | null | undefined): string {
  if (!state) return "";
  return JSON.stringify({
    upload: state.upload
      ? {
          fileName: state.upload.fileName,
          fileSize: state.upload.fileSize,
          fileType: state.upload.fileType,
          rawText: state.upload.rawText,
        }
      : null,
    extraction: state.extraction,
    userFacts: state.userFacts,
    userObjective: state.userObjective,
    evidence: state.evidence,
    draft: state.draft,
    recipient: state.mailing?.recipient ?? null,
    mailingMethod: state.mailing?.method ?? null,
  });
}

function sanitizeCheckpoint(
  incoming: WorkflowState,
  workflowId: string,
): WorkflowState {
  if (incoming.workflowId !== workflowId) {
    throw new Error("Workflow checkpoint does not match this case.");
  }
  if (incoming.draft?.length > 500_000) {
    throw new Error("Draft exceeds maximum checkpoint size.");
  }
  if (incoming.userFacts?.length > 200_000 || incoming.userObjective?.length > 100_000) {
    throw new Error("Workflow input exceeds maximum checkpoint size.");
  }
  if (incoming.upload?.rawText && incoming.upload.rawText.length > 5_000_000) {
    throw new Error("Source document text exceeds maximum checkpoint size.");
  }

  return {
    ...incoming,
    workflowId,
    isProcessing: false,
    approved: false,
    mailing: incoming.mailing
      ? {
          ...incoming.mailing,
          status: "draft",
          providerOrderId: undefined,
          trackingNumber: undefined,
        }
      : null,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * GET    /api/cases/$caseId — load an owner-scoped resumable case.
 * PATCH  /api/cases/$caseId — persist a restricted UI checkpoint.
 *
 * Consequential state is deliberately not client writable. Approval, payment,
 * provider order IDs, tracking, and final delivery state have separate
 * authoritative server transitions.
 */
export const Route = createFileRoute("/api/cases/$caseId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const caseId = params.caseId as string;
          const supabase = serviceSupabase();

          const { data, error } = await supabase
            .from("cases")
            .select("data")
            .eq("id", caseId)
            .eq("owner_id", user.id)
            .maybeSingle();

          if (error) {
            return noStore({ error: "Unable to load case." }, { status: 502 });
          }
          if (!data?.data) {
            return noStore({ error: "Case not found." }, { status: 404 });
          }

          return noStore({
            case: deserializeCase(data.data as Record<string, unknown>),
          });
        } catch (error) {
          return authErrorResponse(error);
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const caseId = params.caseId as string;
          const supabase = serviceSupabase();

          const { data, error } = await supabase
            .from("cases")
            .select("data, status")
            .eq("id", caseId)
            .eq("owner_id", user.id)
            .maybeSingle();

          if (error) {
            return noStore({ error: "Unable to load case for update." }, { status: 502 });
          }
          if (!data?.data) {
            return noStore({ error: "Case not found." }, { status: 404 });
          }

          const existing = deserializeCase(data.data as Record<string, unknown>);
          if (["mailed", "delivered", "closed"].includes(existing.status)) {
            return noStore(
              { error: "Completed mailing cases cannot be modified through workflow checkpoints." },
              { status: 409 },
            );
          }

          const body = await request.json() as {
            workflowState?: WorkflowState;
            userFacts?: string;
            userObjective?: string;
            draftProvenance?: unknown;
          };

          const allowedKeys = new Set([
            "workflowState",
            "userFacts",
            "userObjective",
            "draftProvenance",
          ]);
          const unexpectedKeys = Object.keys(body as Record<string, unknown>)
            .filter((key) => !allowedKeys.has(key));
          if (unexpectedKeys.length > 0) {
            return noStore(
              { error: `Checkpoint contains server-owned fields: ${unexpectedKeys.join(", ")}` },
              { status: 400 },
            );
          }

          let checkpoint = existing.workflowState as WorkflowState | undefined;
          if (body.workflowState) {
            try {
              checkpoint = sanitizeCheckpoint(body.workflowState, existing.workflowId);
            } catch (error) {
              return noStore(
                { error: error instanceof Error ? error.message : "Invalid workflow checkpoint." },
                { status: 400 },
              );
            }
          }

          const beforeFingerprint = materialFingerprint(
            existing.workflowState as WorkflowState | undefined,
          );
          const afterFingerprint = materialFingerprint(checkpoint);
          const materialChanged =
            body.workflowState !== undefined &&
            beforeFingerprint !== afterFingerprint;

          const updated = updateCase(existing, {
            workflowState: checkpoint,
            userFacts:
              typeof body.userFacts === "string"
                ? body.userFacts.slice(0, 200_000)
                : checkpoint?.userFacts ?? existing.userFacts,
            userObjective:
              typeof body.userObjective === "string"
                ? body.userObjective.slice(0, 100_000)
                : checkpoint?.userObjective ?? existing.userObjective,
            draftProvenance:
              body.draftProvenance !== undefined
                ? body.draftProvenance
                : existing.draftProvenance,
          });

          if (materialChanged) {
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
              return noStore(
                { error: "Unable to invalidate stale approval." },
                { status: 502 },
              );
            }
          }

          const summary = toCaseSummary(updated);
          const { error: updateError } = await supabase
            .from("cases")
            .update({
              status: updated.status,
              notice_type: updated.noticeType,
              agency: updated.agency ?? null,
              reference_number: updated.referenceNumber ?? null,
              notice_date: updated.noticeDate ?? null,
              readiness_score: updated.readinessScore,
              health_status: updated.healthStatus,
              deadline_date: summary.deadlineDate ?? null,
              has_draft: summary.hasDraft,
              has_mailing: summary.hasMailing,
              updated_at: updated.updatedAt,
              data: serializeCase(updated),
            })
            .eq("id", caseId)
            .eq("owner_id", user.id);

          if (updateError) {
            return noStore({ error: "Unable to save workflow checkpoint." }, { status: 502 });
          }

          return noStore({
            case: updated,
            approvalRevoked: materialChanged,
          });
        } catch (error) {
          return authErrorResponse(error);
        }
      },
    },
  },
});
