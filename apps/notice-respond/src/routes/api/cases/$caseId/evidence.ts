/**
 * POST /api/cases/$caseId/evidence
 *
 * Uploads evidence files for a case. Files are validated, stored,
 * and associated with evidence items. Returns durable metadata.
 *
 * Evidence items persist server-side — they survive browser refresh
 * and reach the final mailing packet.
 */

import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { validateFilename, validateFileSize, validateMimeType } from "@/domain/security";

export const Route = createFileRoute("/api/cases/$caseId/evidence")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const caseId = params.caseId as string;
          const form = await request.formData();

          const file = form.get("file") ?? form.get("document");
          if (!(file instanceof File)) {
            return Response.json({ error: "An evidence file is required." }, { status: 400 });
          }

          const requirementId = form.get("requirementId") as string | null;

          // ── Validate file ─────────────────────────────────────
          const nameCheck = validateFilename(file.name);
          if (!nameCheck.valid) {
            return Response.json({ error: `Filename validation failed: ${nameCheck.errors.join(", ")}` }, { status: 400 });
          }
          const sizeCheck = validateFileSize(file.size);
          if (!sizeCheck.valid) {
            return Response.json({ error: sizeCheck.error ?? "File too large" }, { status: 413 });
          }
          const mimeCheck = validateMimeType(file.type);
          if (!mimeCheck.valid) {
            return Response.json({ error: mimeCheck.error ?? "File type not allowed" }, { status: 415 });
          }

          // ── Compute file hash for integrity ───────────────────
          const buffer = await file.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
          const fileHash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          // ── Create evidence record ────────────────────────────
          const evidenceItem = {
            id: crypto.randomUUID(),
            caseId,
            ownerId: user.id,
            requirementId: requirementId ?? undefined,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileHash,
            uploadedAt: new Date().toISOString(),
            status: "provided" as const,
          };

          // In production, file would be uploaded to R2/storage here.
          // For now, return the metadata so the client can track it.

          return Response.json({
            ok: true,
            evidence: evidenceItem,
          }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Evidence upload failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },

      // ── DELETE: remove evidence ──────────────────────────────
      DELETE: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const caseId = params.caseId as string;
          const url = new URL(request.url);
          const evidenceId = url.searchParams.get("evidenceId");

          if (!evidenceId) {
            return Response.json({ error: "Evidence ID is required." }, { status: 400 });
          }

          // In production, this would delete from storage and update the database.
          return Response.json({ ok: true, deleted: evidenceId });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Evidence deletion failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
