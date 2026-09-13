/**
 * Shared packet assembly for step-workflow matters — the response letter
 * followed by every uploaded document, merged with @mailmypdf/packet-builder
 * (the same production merge code apps/mailmypdf's case-approval flow
 * uses), so any workflow's Mail/Review step packet preview shows something
 * real instead of a static checklist.
 *
 * Every workflow's own `*-packet.ts` (tax-notice-packet.ts, cp2000-packet.ts,
 * ...) is a thin wrapper: it only supplies that workflow's letter text
 * (generateTaxNoticeDraft, generateCP2000Draft, ...). Document handling,
 * page-exclusion bookkeeping, and the actual merge are identical for every
 * workflow and live here once.
 */
import { generatePlainTextPdf, assemblePacket, type PacketDocumentRow } from "@mailmypdf/packet-builder";
import { computeSha256 } from "@mailmypdf/documents";
import type { StepMatterState } from "@mailmypdf/step-workflow";
import { getDocumentBytes } from "./supabase-document-store";

export interface AssembledMatterPacket {
  bytes: Uint8Array;
  /** One label per page, same order as `bytes`'s pages — for PagePreviewGrid. */
  pageLabels: string[];
  /** Maps a global page index (into `bytes`) back to what to exclude on the next assembly. */
  pageOwners: Array<{ kind: "response"; pageWithinResponse: number } | { kind: "document"; documentId: string; pageWithinDocument: number }>;
}

type MatterDocumentFile = { id: string; name: string; category?: string };

export interface AssembleMatterPacketOptions {
  excludedResponsePages?: readonly number[];
  excludedDocumentPages?: Readonly<Record<string, readonly number[]>>;
}

/**
 * Builds the packet from a matter's current draft letter text and uploaded
 * documents, applying any pages the user has already removed in the preview.
 *
 * `excludedResponsePages` / `excludedDocumentPages` are 0-based page indices
 * scoped to the response letter and to each document respectively — the
 * same shape @mailmypdf/packet-builder's assemblePacket takes, so a caller
 * can pass straight through what PagePreviewGrid's onDeletePage resolved.
 */
export async function assembleMatterPacket(
  matter: StepMatterState,
  letterText: string,
  options: AssembleMatterPacketOptions = {},
): Promise<AssembledMatterPacket> {
  const files = ((matter.steps.documents?.data.files as MatterDocumentFile[]) ?? []);

  const letterBytes = await generatePlainTextPdf(letterText);

  const rows: PacketDocumentRow[] = [];
  const bytesByDocId = new Map<string, Uint8Array>();

  for (const [index, file] of files.entries()) {
    const bytes = await getDocumentBytes(matter.id, file.id);
    if (!bytes) continue; // Never uploaded on this device, or removed — skip rather than fail the whole preview.
    bytesByDocId.set(file.id, bytes);
    rows.push({
      document_id: file.id,
      role: /notice|letter/i.test(file.category ?? file.name) ? "subject_notice" : "evidence",
      evidence_kind: file.category ?? null,
      page_count: null,
      position: index,
      sha256: computeSha256(bytes),
      storage_path: file.id,
      safe_filename: file.name,
      mime_type: bytes[0] === 0x25 && bytes[1] === 0x50 ? "application/pdf" : "application/octet-stream",
      excluded_pages: options.excludedDocumentPages?.[file.id] ?? [],
    });
  }

  const packet = await assemblePacket(
    letterBytes,
    rows,
    async (row) => {
      const bytes = bytesByDocId.get(row.document_id);
      if (!bytes) throw new Error(`Missing bytes for ${row.safe_filename}`);
      return bytes;
    },
    { excludedResponsePages: options.excludedResponsePages },
  );

  // Reconstruct page labels + ownership by replaying the same exclusion
  // logic the manifest already applied, so PagePreviewGrid's labels and
  // this module's own onDeletePage resolution stay in lockstep with what
  // assemblePacket actually produced.
  const pageLabels: string[] = [];
  const pageOwners: AssembledMatterPacket["pageOwners"] = [];

  {
    const excludedResponse = new Set(options.excludedResponsePages ?? []);
    let seen = 0;
    for (let pageWithinResponse = 0; seen < packet.responsePages; pageWithinResponse += 1) {
      if (excludedResponse.has(pageWithinResponse)) continue;
      pageLabels.push("Response Letter");
      pageOwners.push({ kind: "response", pageWithinResponse });
      seen += 1;
    }
  }
  for (const entry of packet.manifest) {
    const excluded = new Set(options.excludedDocumentPages?.[entry.documentId] ?? []);
    let seen = 0;
    for (let pageWithinDocument = 0; seen < entry.pageCount; pageWithinDocument += 1) {
      if (excluded.has(pageWithinDocument)) continue;
      pageLabels.push(`Enclosure: ${entry.filename}`);
      pageOwners.push({ kind: "document", documentId: entry.documentId, pageWithinDocument });
      seen += 1;
    }
  }

  return { bytes: packet.bytes, pageLabels, pageOwners };
}
