import { inspectPacketPdfPageCount, type PacketManifestEntry } from "@mailmypdf/packet-builder";
import { assessIrsGeneralMailPacketReadiness } from "./mail-readiness";
import { isSafeIrsEnclosureFilename } from "./packet-preview";
import { isIrsOwnedEnclosureStoragePath } from "./owned-packet-preview";
import type { PacketDocumentRow } from "@mailmypdf/packet-builder";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";
import type { IrsGeneralOwnedDraftStore, IrsGeneralVersionedCaseStore } from "./owned-packet-draft";

/** Authenticated server-only read of a persisted PDF for explicit human review.
 * The host must derive ownerId from the session, enforce owner/matter scope on
 * both reads, and return the PDF in a private no-store response. Never a send gate.
 */
export interface IrsGeneralOwnedDraftReviewInput {
  readonly ownerId: string;
  readonly matterId: string;
  readonly draftId: string;
  readonly caseStore: IrsGeneralVersionedCaseStore;
  readonly draftStore: Pick<IrsGeneralOwnedDraftStore, "readPersistedDraft">;
  /** Required for packets with enclosures; must return only currently scanned-clean, owner/matter-eligible documents. */
  readonly documentStore?: Pick<PacketStorageAdapter, "loadEligibleDocuments">;
}

export type IrsGeneralOwnedDraftReviewResult =
  | { ready: false; blockers: readonly string[]; review: null }
  | { ready: true; blockers: readonly []; review: Readonly<{
      draftId: string;
      caseRevision: string;
      packetSha256: string;
      noticeSha256: string;
      recipientAddress: string;
      selectedEnclosureDocumentIds: readonly string[];
      manifest: readonly PacketManifestEntry[];
      pdfBytes: Uint8Array;
      status: "requires_explicit_human_review_no_payment_or_mailing";
    }> };

const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

function basis(value: {
  readonly revision: string;
  readonly letterInput: unknown;
  readonly selectedEnclosureDocumentIds: readonly string[];
}): string | null {
  try {
    return JSON.stringify({
      revision: value.revision,
      letterInput: value.letterInput,
      selectedEnclosureDocumentIds: value.selectedEnclosureDocumentIds,
    });
  } catch { return null; }
}

/**
 * A stored PDF digest protects its bytes, not the separately persisted list
 * of enclosures shown beside it in the review UI. Fail closed when that list
 * contains a missing, extra, duplicate, or malformed attachment. The actual
 * PDF/attachment equivalence is checked again by the approval reassembly.
 */
function validReviewManifest(
  manifest: unknown,
  selectedIds: readonly string[],
): boolean {
  if (!Array.isArray(manifest) || manifest.length !== selectedIds.length ||
      new Set(selectedIds).size !== selectedIds.length) return false;
  const selected = new Set(selectedIds);
  const seen = new Set<string>();
  // The packet builder assembles enclosures in the case selection order.
  // A stored manifest with the same IDs in a different order misrepresents
  // the PDF that the customer is reviewing. Reject it before approval.
  for (let index = 0; index < manifest.length; index += 1) {
    const item = manifest[index];
    if (!item || typeof item !== "object") return false;
    const entry = item as Partial<PacketManifestEntry>;
    if (typeof entry.documentId !== "string" ||
        entry.documentId !== selectedIds[index] ||
        !selected.has(entry.documentId) || seen.has(entry.documentId) ||
        entry.role !== "evidence" ||
        !isSafeIrsEnclosureFilename(entry.filename) ||
        typeof entry.sha256 !== "string" || !SHA256.test(entry.sha256) ||
        !Number.isSafeInteger(entry.pageCount) || (entry.pageCount ?? 0) < 1 ||
        !(entry.evidenceKind === null ||
          (typeof entry.evidenceKind === "string" && !!entry.evidenceKind.trim()))) {
      return false;
    }
    seen.add(entry.documentId);
  }
  return seen.size === selected.size;
}

/** Read back immutable PDF bytes and current notice facts; never accept a
 * write receipt as evidence of a reviewable draft. Approval separately
 * reassembles and atomically validates the exact packet before recording consent.
 */
export async function loadIrsGeneralOwnedDraftForReview(
  input: IrsGeneralOwnedDraftReviewInput,
): Promise<IrsGeneralOwnedDraftReviewResult> {
  const blocked = (code: string): IrsGeneralOwnedDraftReviewResult =>
    ({ ready: false, blockers: [code], review: null });
  if (!input || !SAFE_ID.test(input.ownerId ?? "") ||
      !SAFE_ID.test(input.matterId ?? "") || !SAFE_ID.test(input.draftId ?? "") ||
      typeof input.caseStore?.loadOwnedCaseSnapshot !== "function" ||
      typeof input.draftStore?.readPersistedDraft !== "function") {
    return blocked("owned_draft_unavailable");
  }
  let stored: Awaited<ReturnType<IrsGeneralOwnedDraftStore["readPersistedDraft"]>>;
  let snapshot: Awaited<ReturnType<IrsGeneralVersionedCaseStore["loadOwnedCaseSnapshot"]>>;
  try {
    [stored, snapshot] = await Promise.all([
      input.draftStore.readPersistedDraft({
        ownerId: input.ownerId, matterId: input.matterId, draftId: input.draftId,
      }),
      input.caseStore.loadOwnedCaseSnapshot({
        ownerId: input.ownerId, matterId: input.matterId,
      }),
    ]);
  } catch { return blocked("owned_draft_unavailable"); }

  if (!stored || stored.ownerId !== input.ownerId ||
      stored.matterId !== input.matterId || stored.draftId !== input.draftId ||
      !snapshot || !SAFE_ID.test(snapshot.revision ?? "") ||
      stored.caseRevision !== snapshot.revision ||
      !Array.isArray(snapshot.selectedEnclosureDocumentIds)) {
    return blocked("owned_draft_unavailable");
  }
  const originalBasis = basis(snapshot);
  if (!originalBasis) return blocked("owned_draft_unavailable");
  const mail = snapshot.letterInput?.mail;
  if (!mail || !assessIrsGeneralMailPacketReadiness(mail).canPreviewMailPacket ||
      !SHA256.test(stored.noticeSha256 ?? "") ||
      stored.noticeSha256 !== mail.noticeSha256 ||
      stored.noticeSha256 !== mail.confirmedRecipientNoticeSha256 ||
      typeof stored.recipientAddress !== "string" ||
      !stored.recipientAddress.trim() ||
      stored.recipientAddress !== mail.recipientAddress ||
      stored.recipientAddress !== mail.confirmedRecipientAddress ||
      !SHA256.test(stored.packetSha256 ?? "") ||
      !Array.isArray(stored.selectedEnclosureDocumentIds) ||
      stored.selectedEnclosureDocumentIds.length !== snapshot.selectedEnclosureDocumentIds.length ||
      stored.selectedEnclosureDocumentIds.some((id, i) => id !== snapshot.selectedEnclosureDocumentIds[i]) ||
      !validReviewManifest(stored.manifest, snapshot.selectedEnclosureDocumentIds)) {
    return blocked("draft_packet_changed");
  }
  // An intact persisted PDF is not proof that its evidence is still eligible.
  // Recheck the current owner/matter-scoped scan results before displaying a
  // packet that contains attachments. Approval performs its own fresh check.
  if (stored.manifest.length > 0) {
    if (typeof input.documentStore?.loadEligibleDocuments !== "function") {
      return blocked("owned_packet_storage_unavailable");
    }
    let eligible: readonly PacketDocumentRow[];
    try {
      eligible = await input.documentStore.loadEligibleDocuments({
        ownerId: input.ownerId, matterId: input.matterId,
      });
    } catch { return blocked("owned_packet_storage_unavailable"); }
    if (!Array.isArray(eligible)) return blocked("owned_packet_storage_unavailable");
    const byId = new Map<string, PacketDocumentRow>();
    for (const row of eligible) {
      if (!row || typeof row.document_id !== "string" || byId.has(row.document_id)) {
        return blocked("enclosure_not_eligible");
      }
      byId.set(row.document_id, row);
    }
    let previousPosition = -1;
    for (const entry of stored.manifest) {
      const row = byId.get(entry.documentId);
      const excluded = row?.excluded_pages ?? [];
      const path = row?.storage_path;
      const ownerPathValid = isIrsOwnedEnclosureStoragePath(input.ownerId, path ?? "");
      if (!row || row.role !== "evidence" || !ownerPathValid ||
          row.safe_filename !== entry.filename ||
          typeof row.sha256 !== "string" || row.sha256.toLowerCase() !== entry.sha256 ||
          (row.evidence_kind ?? null) !== entry.evidenceKind ||
          !Number.isSafeInteger(row.position) || row.position <= previousPosition ||
          !Array.isArray(excluded) || new Set(excluded).size !== excluded.length ||
          excluded.some(index => !Number.isSafeInteger(index) || index < 0 ||
            row.page_count == null || index >= row.page_count) ||
          (row.page_count != null && (!Number.isSafeInteger(row.page_count) ||
            row.page_count - excluded.length !== entry.pageCount))) {
        return blocked("enclosure_not_eligible");
      }
      previousPosition = row.position;
    }
  }

  if (!(stored.pdfBytes instanceof Uint8Array) ||
      stored.pdfBytes.length < 5 || stored.pdfBytes.length > MAX_PDF_BYTES) {
    return blocked("draft_integrity_failed");
  }
  const pdfBytes = stored.pdfBytes.slice();
  if (pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 ||
      pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46 || pdfBytes[4] !== 0x2d) {
    return blocked("draft_integrity_failed");
  }
  try {
    const hash = await globalThis.crypto.subtle.digest("SHA-256", pdfBytes.buffer);
    const digest = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0")).join("");
    if (digest !== stored.packetSha256) return blocked("draft_integrity_failed");
  } catch { return blocked("draft_integrity_failed"); }

  // Verify PDF structure and page budget, not just the stored digest.
  // There must be at least one response-letter page in addition to all
  // enclosure pages listed in the independently persisted manifest.
  const supportingPages = stored.manifest.reduce((sum, entry) => sum + entry.pageCount, 0);
  if (!Number.isSafeInteger(supportingPages) || supportingPages >= 400) {
    return blocked("draft_packet_changed");
  }
  try {
    if (await inspectPacketPdfPageCount(pdfBytes) <= supportingPages) {
      return blocked("draft_integrity_failed");
    }
  } catch {
    return blocked("draft_integrity_failed");
  }

  try {
    const latest = await input.caseStore.loadOwnedCaseSnapshot({
      ownerId: input.ownerId, matterId: input.matterId,
    });
    if (!latest || basis(latest) !== originalBasis) return blocked("draft_case_changed");
  } catch { return blocked("draft_case_changed"); }

  let manifest: PacketManifestEntry[];
  try { manifest = structuredClone(stored.manifest) as PacketManifestEntry[]; }
  catch { return blocked("draft_packet_changed"); }
  return {
    ready: true, blockers: [],
    review: {
      draftId: stored.draftId,
      caseRevision: snapshot.revision,
      packetSha256: stored.packetSha256,
      noticeSha256: stored.noticeSha256,
      recipientAddress: stored.recipientAddress,
      selectedEnclosureDocumentIds: [...stored.selectedEnclosureDocumentIds],
      manifest,
      pdfBytes,
      status: "requires_explicit_human_review_no_payment_or_mailing",
    },
  };
}
