// Packet assembly for workflow cases.
//
// A packet is the exact PDF a user approves and the mailing provider receives:
// the generated response letter followed by every attachment the user chose to
// enclose, in order. Page counts are *measured here from the stored bytes*, not
// supplied by the caller — the approval gate then compares its own recount
// against these measurements, so a client cannot approve one packet and have
// another mailed.
//
// The actual pdf-lib merge logic lives in @mailmypdf/packet-builder — the
// single production packet builder shared with the Studio workflow
// acceptance engine (see docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md) so
// acceptance tests merge PDFs with the exact same code production uses. This
// file keeps the Supabase-backed document loading/storage around it.
//
// NOTE: pdf-lib is imported dynamically inside @mailmypdf/packet-builder. A
// top-level import causes the Nitro bundler to hoist tslib into the SSR
// chunk and break on Cloudflare Workers. See src/lib/pdf-validation.server.ts.

import type { AuthenticatedUserContext } from "./auth.server";
import {
  assemblePacket as assemblePacketCore,
  PacketError,
  type PacketDocumentRow,
  type PacketManifestEntry,
  type AssembledPacket,
  type DocumentByteReader,
} from "@mailmypdf/packet-builder";

export { PacketError };
export type { PacketDocumentRow, PacketManifestEntry, AssembledPacket, DocumentByteReader };

const BUCKET = "secure-documents";
const FETCH_TTL_SECONDS = 60;
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

/**
 * Lists the documents that may enter the packet. The database refuses the whole
 * case if any included document has not cleared malware scanning, so there is
 * no path that assembles a packet around unscanned content.
 */
export async function loadPacketDocuments(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<PacketDocumentRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("case_packet_documents", { p_case_id: caseId });
  if (error) throw new PacketError(error.message);
  return (data ?? []) as PacketDocumentRow[];
}

/** Reads a stored document through a short-lived signed URL and verifies it. */
export async function fetchDocumentBytes(row: PacketDocumentRow): Promise<Uint8Array> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, FETCH_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new PacketError("Unable to read an approved document");

  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new PacketError("Unable to read an approved document");
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new PacketError(`${row.safe_filename} is too large to enclose`);
  }
  return bytes;
}


/**
 * Builds the combined packet and measures every page in it. Thin wrapper
 * around @mailmypdf/packet-builder's assemblePacket that preserves this
 * module's original signature (readBytes defaults to fetching from this
 * app's Supabase Storage) for every existing call site.
 *
 * `readBytes` is injectable so the assembly rules can be exercised against real
 * PDFs in tests without a storage backend.
 */
export async function assemblePacket(
  responseLetterPdf: Uint8Array,
  documents: PacketDocumentRow[],
  readBytes: DocumentByteReader = fetchDocumentBytes,
): Promise<AssembledPacket> {
  return assemblePacketCore(responseLetterPdf, documents, readBytes);
}

/**
 * Writes the measured page counts back so the database approval gate can
 * recount independently of whatever the client believes.
 */
export async function persistMeasuredPageCounts(
  caseId: string,
  manifest: PacketManifestEntry[],
  context: AuthenticatedUserContext,
): Promise<void> {
  for (const entry of manifest) {
    const { error } = await context.supabase
      .from("case_documents")
      .update({ page_count: entry.pageCount })
      .eq("case_id", caseId)
      .eq("document_id", entry.documentId)
      .eq("owner_id", context.user.id);
    if (error) throw new PacketError("Unable to record measured page counts");
  }
}
