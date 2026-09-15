import type { getSupabaseServer } from "./supabase";

/**
 * Retains an uploaded evidence file's raw bytes so it can be re-enclosed in
 * the mail-ready packet at fulfillment time.
 *
 * MailMyPDF's own document store (via uploadDocument(), used for the AI
 * analysis call) offers no way to fetch a previously-uploaded document's
 * bytes back -- so any workflow that wants the customer's *actual* uploaded
 * evidence physically mailed (not just an AI-generated summary of it) must
 * separately retain the bytes itself, in the "appeal-evidence" Supabase
 * Storage bucket, and record the resulting storagePath/mimeType/fileSize/
 * hash on the evidence item. mailmypdf-client.ts's uploadPacket() reads
 * that storagePath back at checkout-webhook fulfillment time.
 *
 * Extracted from car-insurance-appeal/analyze.ts, the one workflow that
 * already had this correct, after confirming via a workflow-acceptance
 * test that every other workflow using this same upload pattern was
 * silently never mailing the customer's uploaded document at all -- see
 * context/FACTORY_STATUS.md for the full list this was applied to.
 */
export interface RetainedEvidence {
  storagePath: string;
  mimeType: string;
  fileSize: number;
  hash: string;
}

export async function retainEvidenceForMailing(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  userId: string,
  documentId: string,
  file: { name: string; type: string },
  rawBytes: Uint8Array,
): Promise<RetainedEvidence> {
  const storagePath = `${userId}/${documentId}/${file.name}`;
  const hashDigest = await crypto.subtle.digest("SHA-256", rawBytes);
  const hash = Array.from(new Uint8Array(hashDigest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const { error } = await supabase.storage
    .from("appeal-evidence")
    .upload(storagePath, rawBytes, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Unable to retain the uploaded document for mailing: ${error.message}`);
  return { storagePath, mimeType: file.type, fileSize: rawBytes.byteLength, hash };
}
