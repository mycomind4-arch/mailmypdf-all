/**
 * Server functions for step-workflow document bytes — the Supabase-backed
 * replacement for the browser-local IndexedDB stopgap (see the removed
 * document-bytes-store.ts). Real files now live in the private
 * `notice-respond-step-documents` storage bucket (see
 * supabase/migrations/20260913_step_documents.sql), metadata in the
 * matching table, and every access is mediated here with the service role
 * after verifying the caller owns the matter — clients never touch storage
 * or the table directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";
import { computeSha256 } from "@mailmypdf/documents";

const BUCKET = "notice-respond-step-documents";
const MAX_BYTES = 25 * 1024 * 1024; // matches Documents.tsx's "max 25 MB each" dropzone hint
const SIGNED_URL_TTL_SECONDS = 120;

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase server configuration is incomplete.");
  }
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireOwnedMatter(supabase: ReturnType<typeof serviceSupabase>, ownerId: string, matterId: string) {
  const { data, error } = await supabase
    .from("notice_respond_step_matters")
    .select("id")
    .eq("id", matterId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This matter is not accessible for this owner.");
}

function storagePathFor(matterId: string, documentId: string): string {
  return `${matterId}/${documentId}`;
}

export const uploadStepDocument = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(
    z.object({
      matterId: z.string().uuid(),
      documentId: z.string().uuid(),
      filename: z.string().min(1).max(255),
      mimeType: z.string().min(1).max(255),
      // Base64-encoded file content — same convention as
      // @mailmypdf/mailing-client's uploadDocumentBase64.
      contentBase64: z.string().min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    const supabase = serviceSupabase();
    await requireOwnedMatter(supabase, context.user.id, data.matterId);

    const bytes = Buffer.from(data.contentBase64, "base64");
    if (bytes.byteLength === 0) throw new Error("Uploaded file is empty.");
    if (bytes.byteLength > MAX_BYTES) throw new Error("File exceeds the 25 MB limit.");

    const sha256 = computeSha256(new Uint8Array(bytes));
    const storagePath = storagePathFor(data.matterId, data.documentId);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: data.mimeType, upsert: true });
    if (uploadError) throw new Error(`Unable to store the file: ${uploadError.message}`);

    const { error: metadataError } = await supabase
      .from("notice_respond_step_documents")
      .upsert({
        id: data.documentId,
        matter_id: data.matterId,
        owner_id: context.user.id,
        storage_path: storagePath,
        filename: data.filename,
        mime_type: data.mimeType,
        byte_size: bytes.byteLength,
        sha256,
      });
    if (metadataError) {
      // Don't leave an orphaned blob if the metadata row couldn't be written.
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
      throw new Error(`Unable to record the uploaded file: ${metadataError.message}`);
    }

    return { documentId: data.documentId, sha256, byteSize: bytes.byteLength };
  });

export const downloadStepDocument = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .validator(z.object({ matterId: z.string().uuid(), documentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const supabase = serviceSupabase();
    await requireOwnedMatter(supabase, context.user.id, data.matterId);

    const { data: row, error } = await supabase
      .from("notice_respond_step_documents")
      .select("storage_path, filename, mime_type, sha256")
      .eq("id", data.documentId)
      .eq("matter_id", data.matterId)
      .eq("owner_id", context.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { url: null, filename: null, mimeType: null, sha256: null };

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) throw new Error("Unable to read the stored file.");

    return { url: signed.signedUrl, filename: row.filename, mimeType: row.mime_type, sha256: row.sha256 };
  });

export const deleteStepDocument = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(z.object({ matterId: z.string().uuid(), documentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const supabase = serviceSupabase();
    await requireOwnedMatter(supabase, context.user.id, data.matterId);

    const storagePath = storagePathFor(data.matterId, data.documentId);
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);

    const { error } = await supabase
      .from("notice_respond_step_documents")
      .delete()
      .eq("id", data.documentId)
      .eq("matter_id", data.matterId)
      .eq("owner_id", context.user.id);
    if (error) throw new Error(error.message);

    return { deleted: true };
  });
