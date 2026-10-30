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
import { createScopedCasePacketStorageAdapter } from "./case-packet-storage-adapter";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";
import { loadCase } from "./case.server";
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
 * A successful RPC call must return an actual document list. In particular,
 * null is NOT equivalent to an empty enclosure selection: treating a missing
 * result as [] could produce a letter-only PDF while the case still contains
 * selected evidence. A legitimate empty list is represented by [].
 */
export function requirePacketDocumentRows(data: unknown): PacketDocumentRow[] {
  if (!Array.isArray(data) || data.some((row) =>
    !row || typeof row !== "object" ||
    typeof row.document_id !== "string" || !row.document_id ||
    (row.role !== "evidence" && row.role !== "subject_notice") ||
    typeof row.storage_path !== "string" || !row.storage_path ||
    typeof row.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(row.sha256) ||
    typeof row.safe_filename !== "string" || !row.safe_filename ||
    typeof row.mime_type !== "string" || !row.mime_type ||
    !Number.isSafeInteger(row.position) || row.position < 0 ||
    (row.page_count !== null && row.page_count !== undefined &&
      (!Number.isSafeInteger(row.page_count) || row.page_count < 1))
  )) {
    throw new PacketError("Packet document selection could not be verified");
  }
  return data as PacketDocumentRow[];
}

/**
 * Lists the documents that may enter the packet. The database refuses the whole
 * case if any included document has not cleared malware scanning, so there is
 * no path that assembles a packet around unscanned content.
 */
export async function loadPacketDocuments(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<PacketDocumentRow[]> {
  // The case_packet_documents function is intentionally service-role-only:
  // it returns private storage paths, and the latest ownership-hardening
  // migration revokes EXECUTE from authenticated users. The privileged RPC
  // itself permits a null auth.uid(), so an owner-scoped case read MUST
  // succeed before it is called. Never accept a case ID as authorization.
  await loadCase(caseId, context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("case_packet_documents", { p_case_id: caseId });
  if (error) throw new PacketError(error.message);
  return requirePacketDocumentRows(data);
}

/**
 * Production bridge for the canonical packet-storage interface. Every signed
 * read rechecks the current authenticated case selection through the same
 * server-only RPC as the secure-core packet runtime. No browser-controlled
 * owner or storage path is trusted.
 */
export function createCasePacketStorageAdapter(
  caseId: string,
  context: AuthenticatedUserContext,
): PacketStorageAdapter {
  return createScopedCasePacketStorageAdapter({
    ownerId: context.user.id,
    matterId: caseId,
    loadDocuments: () => loadPacketDocuments(caseId, context),
    async signUrl(path, expiresInSeconds) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(path, expiresInSeconds);
      if (error || !data?.signedUrl) throw new PacketError("Unable to read an approved document");
      return data.signedUrl;
    },
    async savePageCount(documentId, pageCount) {
      const { error, count } = await context.supabase
        .from("case_documents")
        .update({ page_count: pageCount }, { count: "exact" })
        .eq("case_id", caseId)
        .eq("owner_id", context.user.id)
        .eq("document_id", documentId);
      if (error || count !== 1) throw new PacketError("Unable to record measured page counts");
    },
  });
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
