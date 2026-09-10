/**
 * /api/cases/$caseId/evidence
 *
 * Durable, owner-scoped evidence storage for Notice Respond.
 * File bytes live in a private Supabase Storage bucket and immutable
 * integrity metadata is recorded inside the canonical Case aggregate.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { validateFilename, validateFileSize, validateMimeType } from "@/domain/security";
import { deserializeCase, serializeCase, updateCase } from "@/domain/notice";
import { extractDocument } from "@/platform/document-intelligence";

const EVIDENCE_BUCKET = "notice-evidence";

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

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180) || "evidence.bin";
}

export const Route = createFileRoute("/api/cases/$caseId/evidence")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let uploadedPath: string | null = null;
        try {
          const user = await requireAuthenticatedUser(request);
          const caseId = params.caseId as string;
          const supabase = serviceSupabase();

          const { data: row, error: caseError } = await supabase
            .from("cases")
            .select("data")
            .eq("id", caseId)
            .eq("owner_id", user.id)
            .maybeSingle();

          if (caseError || !row?.data) {
            return noStore({ error: "Case not found." }, { status: 404 });
          }

          const form = await request.formData();
          const file = form.get("file") ?? form.get("document");
          if (!(file instanceof File)) {
            return noStore({ error: "An evidence file is required." }, { status: 400 });
          }

          const requirementIdRaw = form.get("requirementId");
          const requirementId =
            typeof requirementIdRaw === "string" && requirementIdRaw.trim()
              ? requirementIdRaw.trim().slice(0, 200)
              : undefined;

          const nameCheck = validateFilename(file.name);
          if (!nameCheck.valid) {
            return noStore(
              { error: `Filename validation failed: ${nameCheck.errors.join(", ")}` },
              { status: 400 },
            );
          }
          const sizeCheck = validateFileSize(file.size);
          if (!sizeCheck.valid) {
            return noStore(
              { error: sizeCheck.error ?? "File too large" },
              { status: 413 },
            );
          }
          const mimeCheck = validateMimeType(file.type);
          if (!mimeCheck.valid) {
            return noStore(
              { error: mimeCheck.error ?? "File type not allowed" },
              { status: 415 },
            );
          }

          const mailableTypes = new Set([
            "application/pdf",
            "image/jpeg",
            "image/png",
          ]);
          if (!mailableTypes.has(file.type)) {
            return noStore(
              { error: "Supporting evidence must be a PDF, JPG, or PNG so it can be enclosed in the mailed packet." },
              { status: 415 },
            );
          }

          const measured = await extractDocument(file);
          if (measured.pageCount < 1 || measured.documentKind === "invalid") {
            return noStore(
              { error: "Supporting evidence could not be read as a mailable document." },
              { status: 422 },
            );
          }

          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
          const fileHash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const evidenceId = crypto.randomUUID();
          uploadedPath = `${user.id}/${caseId}/${evidenceId}/${safeFileName(file.name)}`;

          const { error: storageError } = await supabase.storage
            .from(EVIDENCE_BUCKET)
            .upload(uploadedPath, bytes, {
              contentType: file.type || "application/octet-stream",
              cacheControl: "3600",
              upsert: false,
            });

          if (storageError) {
            return noStore(
              { error: `Unable to store evidence file: ${storageError.message}` },
              { status: 502 },
            );
          }

          const evidenceItem = {
            id: evidenceId,
            caseId,
            requirementId,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            pageCount: measured.pageCount,
            fileHash,
            storagePath: uploadedPath,
            uploadedAt: new Date().toISOString(),
            status: "provided" as const,
          };

          const caseObj = deserializeCase(row.data as Record<string, unknown>);
          const updated = updateCase(caseObj, {
            evidence: [...(caseObj.evidence ?? []), evidenceItem],
          });

          const { error: updateError } = await supabase
            .from("cases")
            .update({
              data: serializeCase(updated),
              updated_at: updated.updatedAt,
            })
            .eq("id", caseId)
            .eq("owner_id", user.id);

          if (updateError) {
            await supabase.storage.from(EVIDENCE_BUCKET).remove([uploadedPath]);
            uploadedPath = null;
            return noStore(
              { error: "Evidence was not attached to the case." },
              { status: 502 },
            );
          }

          // Evidence changes invalidate any exact-draft approval because the
          // approved packet snapshot is no longer the same packet.
          await supabase
            .from("approvals")
            .update({
              status: "revoked",
              revoked_at: new Date().toISOString(),
            })
            .eq("case_id", caseId)
            .eq("owner_id", user.id)
            .eq("status", "active");

          return noStore({ ok: true, evidence: evidenceItem }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Evidence upload failed.";
          if (/authentication|required|token/i.test(message)) {
            return authErrorResponse(error);
          }
          return noStore({ error: message }, { status: 500 });
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const caseId = params.caseId as string;
          const url = new URL(request.url);
          const evidenceId = url.searchParams.get("evidenceId")?.trim();
          if (!evidenceId) {
            return noStore({ error: "Evidence ID is required." }, { status: 400 });
          }

          const supabase = serviceSupabase();
          const { data: row, error: caseError } = await supabase
            .from("cases")
            .select("data")
            .eq("id", caseId)
            .eq("owner_id", user.id)
            .maybeSingle();

          if (caseError || !row?.data) {
            return noStore({ error: "Case not found." }, { status: 404 });
          }

          const caseObj = deserializeCase(row.data as Record<string, unknown>);
          const evidence = caseObj.evidence ?? [];
          const target = evidence.find(
            (item: unknown) =>
              typeof item === "object" &&
              item !== null &&
              (item as { id?: string }).id === evidenceId,
          ) as { id: string; storagePath?: string } | undefined;

          if (!target) {
            return noStore({ error: "Evidence item not found." }, { status: 404 });
          }

          if (target.storagePath) {
            const { error: storageError } = await supabase.storage
              .from(EVIDENCE_BUCKET)
              .remove([target.storagePath]);
            if (storageError) {
              return noStore(
                { error: `Unable to delete stored evidence: ${storageError.message}` },
                { status: 502 },
              );
            }
          }

          const updated = updateCase(caseObj, {
            evidence: evidence.filter(
              (item: unknown) =>
                !(
                  typeof item === "object" &&
                  item !== null &&
                  (item as { id?: string }).id === evidenceId
                ),
            ),
          });

          const { error: updateError } = await supabase
            .from("cases")
            .update({
              data: serializeCase(updated),
              updated_at: updated.updatedAt,
            })
            .eq("id", caseId)
            .eq("owner_id", user.id);

          if (updateError) {
            return noStore(
              { error: "Evidence metadata could not be removed from the case." },
              { status: 502 },
            );
          }

          await supabase
            .from("approvals")
            .update({
              status: "revoked",
              revoked_at: new Date().toISOString(),
            })
            .eq("case_id", caseId)
            .eq("owner_id", user.id)
            .eq("status", "active");

          return noStore({ ok: true, deleted: evidenceId });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Evidence deletion failed.";
          if (/authentication|required|token/i.test(message)) {
            return authErrorResponse(error);
          }
          return noStore({ error: message }, { status: 500 });
        }
      },
    },
  },
});
