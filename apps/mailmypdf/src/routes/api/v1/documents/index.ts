// POST /api/v1/documents — Upload a document for proof-of-service mailing.
// Computes SHA-256 hash server-side; caller can independently verify.
//
// Accepts: multipart/form-data with a "file" field
//   OR: application/json with { "content": "<base64>", "filename": "..." }
//
// Returns: { id, filename, mime_type, sha256, size_bytes, source, created_at }

import { createFileRoute } from "@tanstack/react-router";
import { requireAuthWithRateLimit, errorResponse, withRateLimitHeaders } from "@/lib/proof-of-service/api-helpers";
import { uploadProofDocument } from "@/lib/proof-of-service/documents";
import { generatePlainTextPdf } from "@/lib/letter-pdf.server";
import { assemblePacket, type PacketDocumentRow } from "@/lib/secure-core/packet.server";
import { computeSha256 } from "@mailmypdf/documents";

export const Route = createFileRoute("/api/v1/documents/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireAuthWithRateLimit(request, "documents.upload");
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        try {
          const contentType = request.headers.get("Content-Type") ?? "";

          let filename: string;
          let mimeType: string;
          let fileData: Uint8Array;
          let attachmentFiles: File[] = [];

          if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file");
            if (!file || !(file instanceof File)) {
              return errorResponse(400, "validation_error", "Missing 'file' field in form data", "MISSING_FILE", "file");
            }
            filename = file.name;
            mimeType = file.type || "application/pdf";
            fileData = new Uint8Array(await file.arrayBuffer());
            attachmentFiles = formData
              .getAll("attachment")
              .filter((item): item is File => item instanceof File);
          } else {
            // JSON with base64 content
            const body = await request.json();
            if (!body.content || !body.filename) {
              return errorResponse(400, "validation_error", "Missing 'content' or 'filename' in JSON body", "MISSING_FIELD");
            }
            filename = body.filename;
            mimeType = body.mime_type ?? "application/pdf";
            fileData = new Uint8Array(Buffer.from(body.content, "base64"));
          }

          // Validate source size (10MB max) before any conversion.
          const MAX_SIZE = 10 * 1024 * 1024;
          if (fileData.byteLength > MAX_SIZE) {
            return errorResponse(400, "validation_error", `File too large (max ${MAX_SIZE / 1024 / 1024}MB)`, "FILE_TOO_LARGE");
          }

          // Trusted workflow drafts may arrive as plain text. Normalize them
          // to a real PDF at the MailMyPDF boundary before storage/provider use.
          const ALLOWED_INPUT_TYPES = [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "text/plain",
          ];
          if (!ALLOWED_INPUT_TYPES.includes(mimeType)) {
            return errorResponse(400, "validation_error", `Unsupported file type: ${mimeType}`, "UNSUPPORTED_TYPE");
          }

          if (mimeType === "text/plain") {
            const text = new TextDecoder("utf-8", { fatal: false }).decode(fileData);
            if (!text.trim()) {
              return errorResponse(400, "validation_error", "Text document is empty", "EMPTY_DOCUMENT");
            }
            fileData = await generatePlainTextPdf(text);
            mimeType = "application/pdf";
            filename = filename.replace(/\.[^.]+$/, "") + ".pdf";
          }

          if (fileData.byteLength > MAX_SIZE) {
            return errorResponse(400, "validation_error", "Generated PDF exceeds the 10MB document limit", "FILE_TOO_LARGE");
          }

          if (attachmentFiles.length > 0) {
            if (mimeType !== "application/pdf") {
              return errorResponse(
                400,
                "validation_error",
                "A packet with attachments requires a PDF response document",
                "PACKET_PRIMARY_NOT_PDF",
              );
            }

            const MAX_TOTAL_ATTACHMENT_BYTES = 40 * 1024 * 1024;
            let totalAttachmentBytes = 0;
            const attachmentBytes = new Map<string, Uint8Array>();
            const rows: PacketDocumentRow[] = [];

            for (let index = 0; index < attachmentFiles.length; index += 1) {
              const attachment = attachmentFiles[index];
              let attachmentMime = attachment.type || "application/octet-stream";
              let attachmentName = attachment.name;
              let bytes = new Uint8Array(await attachment.arrayBuffer());

              totalAttachmentBytes += bytes.byteLength;
              if (
                bytes.byteLength > MAX_SIZE ||
                totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES
              ) {
                return errorResponse(
                  400,
                  "validation_error",
                  "Supporting-document packet exceeds the attachment size limit",
                  "PACKET_TOO_LARGE",
                );
              }

              if (!ALLOWED_INPUT_TYPES.includes(attachmentMime)) {
                return errorResponse(
                  400,
                  "validation_error",
                  `Unsupported attachment type: ${attachmentMime}`,
                  "UNSUPPORTED_ATTACHMENT_TYPE",
                );
              }

              if (attachmentMime === "text/plain") {
                const attachmentText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
                if (!attachmentText.trim()) {
                  return errorResponse(
                    400,
                    "validation_error",
                    "Supporting text document is empty",
                    "EMPTY_ATTACHMENT",
                  );
                }
                bytes = await generatePlainTextPdf(attachmentText);
                attachmentMime = "application/pdf";
                attachmentName = attachmentName.replace(/\.[^.]+$/, "") + ".pdf";
              }

              const documentId = crypto.randomUUID();
              attachmentBytes.set(documentId, bytes);
              rows.push({
                document_id: documentId,
                role: "evidence",
                evidence_kind: null,
                page_count: null,
                position: index,
                sha256: computeSha256(bytes),
                storage_path: "",
                safe_filename: attachmentName,
                mime_type: attachmentMime,
              });
            }

            const packet = await assemblePacket(
              fileData,
              rows,
              async (row) => {
                const bytes = attachmentBytes.get(row.document_id);
                if (!bytes) throw new Error("Approved attachment bytes are unavailable");
                return bytes;
              },
            );
            fileData = packet.bytes;
            mimeType = "application/pdf";
            filename = filename.replace(/\.[^.]+$/, "") + "-packet.pdf";
          }

          const { document } = await uploadProofDocument(
            {
              tenant_id: tenant.id,
              filename,
              mime_type: mimeType,
              file_data: fileData,
            },
            { supabaseAdmin },
          );

          return withRateLimitHeaders(Response.json({ document }, { status: 201 }), tenant.id, "documents.upload");
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return errorResponse(500, "internal_error", message, "INTERNAL_ERROR");
        }
      },
    },
  },
});
