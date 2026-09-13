/**
 * Supabase-backed byte storage for uploaded step-workflow documents —
 * replaces the browser-local IndexedDB stopgap. Bytes are stored server-side
 * (notice-respond-step-documents bucket) via the server functions in
 * src/lib/fns/step-document.ts; this module is just the client-side
 * put/get/delete wrapper Documents.tsx and tax-notice-packet.ts call.
 */
import { uploadStepDocument, downloadStepDocument, deleteStepDocument } from "@/lib/fns/step-document";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // avoid a giant call stack for large files
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Uploads one document's real bytes, associating them with a matter + document id. */
export async function putDocumentBytes(
  matterId: string,
  documentId: string,
  bytes: Uint8Array,
  meta: { filename: string; mimeType: string },
): Promise<void> {
  await uploadStepDocument({
    data: {
      matterId,
      documentId,
      filename: meta.filename,
      mimeType: meta.mimeType,
      contentBase64: bytesToBase64(bytes),
    },
  });
}

/** Reads back one document's bytes, or null if it was never uploaded (or already removed). */
export async function getDocumentBytes(matterId: string, documentId: string): Promise<Uint8Array | null> {
  const result = await downloadStepDocument({ data: { matterId, documentId } });
  if (!result.url) return null;
  const response = await fetch(result.url);
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

/** Removes one document's stored bytes (e.g. when the user removes it in the Documents step). */
export async function deleteDocumentBytes(matterId: string, documentId: string): Promise<void> {
  await deleteStepDocument({ data: { matterId, documentId } });
}
