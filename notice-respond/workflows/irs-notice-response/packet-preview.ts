import {
  assemblePacket,
  type DocumentByteReader,
  type PacketDocumentRow,
  type PacketManifestEntry,
} from "@mailmypdf/packet-builder";
import {
  prepareIrsGeneralPdfPreview,
  type IrsGeneralPdfPreviewResult,
} from "./pdf-preview";
import type { IrsGeneralLetterPreviewInput } from "./letter-preview";

/**
 * These facts must come from an authenticated, owner-scoped case document
 * lookup and a server-persisted enclosure selection, never directly from a
 * browser boolean. This pure builder is NOT an authentication/approval gate.
 */
export interface IrsGeneralSelectedEnclosure {
  document: PacketDocumentRow;
  explicitlySelected: boolean;
  securityCleared: boolean;
}

type PdfBlocker = Extract<IrsGeneralPdfPreviewResult, { ready: false }>["blockers"][number];
export type IrsGeneralPacketPreviewBlocker =
  | PdfBlocker
  | "enclosure_selection_unconfirmed"
  | "enclosure_security_unverified"
  | "enclosure_metadata_invalid"
  | "enclosure_duplicate"
  | "packet_assembly_failed";

export type IrsGeneralPacketPreviewResult =
  | { ready: false; blockers: readonly IrsGeneralPacketPreviewBlocker[]; preview: null }
  | {
      ready: true;
      blockers: readonly [];
      preview: Readonly<{
        pdfBytes: Uint8Array;
        packetSha256: string;
        responsePages: number;
        supportingPages: number;
        manifest: readonly PacketManifestEntry[];
        sourceNoticeSha256: string;
        recipientAddress: string;
        status: "draft_packet_preview_only";
      }>;
    };

const SHA256 = /^[a-f0-9]{64}$/i;
// Filename labels are stamped on the outgoing PDF. Reject invisible and
// bidirectional controls before reading evidence or rendering its label.
// The shared PDF builder stamps `Enclosure: <filename>` in an 8pt footer.
// Keep even wide-glyph filenames short enough to avoid clipping or colliding
// with the right-aligned `Page N of M` stamp on a US-letter sheet.
const SAFE_FILENAME = /^[^\\/\u0000-\u001f\u007f\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]{1,48}$/;

function validEnclosure(row: PacketDocumentRow): boolean {
  if (!row || row.role !== "evidence" || !row.document_id?.trim() ||
      !row.storage_path?.trim() || !SAFE_FILENAME.test(row.safe_filename ?? "") ||
      !SHA256.test(row.sha256 ?? "") ||
      !Number.isSafeInteger(row.position) || row.position < 0 ||
      !["application/pdf", "image/png", "image/jpeg"].includes(row.mime_type)) return false;

  if (row.page_count != null && (!Number.isSafeInteger(row.page_count) || row.page_count < 1)) return false;
  const excluded = row.excluded_pages ?? [];
  if (!Array.isArray(excluded) || (row.mime_type !== "application/pdf" && excluded.length > 0)) return false;
  if (excluded.length && row.page_count == null) return false;
  const seen = new Set<number>();
  for (const index of excluded) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= row.page_count! || seen.has(index)) return false;
    seen.add(index);
  }
  return row.page_count == null || seen.size < row.page_count;
}

/**
 * Assemble a real draft packet (letter + selected, scan-cleared evidence)
 * using the same PDF merger and SHA-256 integrity checks as secure-core.
 *
 * The controlling IRS notice is NOT automatically enclosed. It must not be
 * silently included as an outgoing attachment. Callers must still persist
 * the exact bytes, verify owner/notice/recipient against current server
 * state, and obtain a fresh exact-packet approval before checkout or Lob.
 */
export async function prepareIrsGeneralPacketPreview(
  input: IrsGeneralLetterPreviewInput,
  enclosures: readonly IrsGeneralSelectedEnclosure[],
  readBytes: DocumentByteReader,
): Promise<IrsGeneralPacketPreviewResult> {
  const letter = await prepareIrsGeneralPdfPreview(input);
  const blockers: IrsGeneralPacketPreviewBlocker[] = letter.ready ? [] : [...letter.blockers];
  const ids = new Set<string>();
  const storagePaths = new Set<string>();
  const contentSelections = new Set<string>();
  const selectedPagesByHash = new Map<string, PacketDocumentRow[]>();
  const positions = new Set<number>();
  if (!Array.isArray(enclosures) || typeof readBytes !== "function") {
    blockers.push("enclosure_metadata_invalid");
  } else {
    for (const item of enclosures) {
      if (item?.explicitlySelected !== true) blockers.push("enclosure_selection_unconfirmed");
      if (item?.securityCleared !== true) blockers.push("enclosure_security_unverified");
      const row = item?.document;
      if (!row || !validEnclosure(row)) {
        blockers.push("enclosure_metadata_invalid");
        continue;
      }
      // Two distinct document IDs may alias one stored PDF. Do not enclose
      // the same object twice or let direct preview callers bypass this guard.
      // Different storage paths can still hold byte-for-byte identical PDFs.
      // Reject duplicate included page selections before signing or reading.
      // Distinct excluded-page selections remain valid when intentionally split.
      const contentHash = row.sha256.toLowerCase();
      const contentSelection = `${contentHash}:${[...(row.excluded_pages ?? [])].sort((a, b) => a - b).join(",")}`;
      const priorSelections = selectedPagesByHash.get(contentHash) ?? [];
      // Different exclusion lists can still include the same original page.
      // For identical bytes, only permit splits proven disjoint by trusted
      // page-count metadata. Unknown or conflicting counts fail closed.
      const overlappingPages = priorSelections.some((prior) => {
        if (row.page_count == null || prior.page_count == null ||
            row.page_count !== prior.page_count) return true;
        const excludedUnion = new Set([
          ...(prior.excluded_pages ?? []),
          ...(row.excluded_pages ?? []),
        ]);
        return excludedUnion.size < row.page_count;
      });
      if (ids.has(row.document_id) || storagePaths.has(row.storage_path) ||
          contentSelections.has(contentSelection) || overlappingPages ||
          positions.has(row.position)) {
        blockers.push("enclosure_duplicate");
      }
      ids.add(row.document_id);
      storagePaths.add(row.storage_path);
      contentSelections.add(contentSelection);
      priorSelections.push(row);
      selectedPagesByHash.set(contentHash, priorSelections);
      positions.add(row.position);
    }
  }
  if (blockers.length || !letter.ready) {
    return { ready: false, blockers: [...new Set(blockers)], preview: null };
  }

  try {
    const ordered = enclosures.map((item) => item.document).sort((a, b) => a.position - b.position);
    const packet = await assemblePacket(letter.preview.pdfBytes, ordered, readBytes);
    // The shared builder measures the real included pages, but it does not
    // compare them with the stored document's original page-count metadata.
    // Refuse a preview if a changed or misclassified PDF would silently add
    // pages the user did not expect to enclose (or omit expected pages).
    // Exclusions are zero-based indices into the original PDF.
    if (packet.manifest.length !== ordered.length || ordered.some((row, index) =>
      row.page_count != null &&
      packet.manifest[index]?.pageCount !== row.page_count - (row.excluded_pages?.length ?? 0)
    )) {
      return { ready: false, blockers: ["enclosure_metadata_invalid"], preview: null };
    }
    return {
      ready: true,
      blockers: [],
      preview: {
        pdfBytes: packet.bytes,
        packetSha256: packet.sha256,
        responsePages: packet.responsePages,
        supportingPages: packet.supportingPages,
        manifest: packet.manifest,
        sourceNoticeSha256: letter.preview.sourceNoticeSha256,
        recipientAddress: letter.preview.recipientAddress,
        status: "draft_packet_preview_only",
      },
    };
  } catch {
    // Do not expose vault paths, document names, or parser internals.
    return { ready: false, blockers: ["packet_assembly_failed"], preview: null };
  }
}
