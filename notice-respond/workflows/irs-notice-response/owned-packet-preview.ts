import type { PacketDocumentRow } from "@mailmypdf/packet-builder";
import {
  createSecurePacketStorageAdapter,
  type PacketStorageAdapter,
  type SecurePacketStorageOptions,
} from "@mailmypdf/packet-builder/storage-adapter";
import type { IrsGeneralLetterPreviewInput } from "./letter-preview";
import {
  prepareIrsGeneralPacketPreview,
  type IrsGeneralPacketPreviewResult,
  type IrsGeneralSelectedEnclosure,
} from "./packet-preview";

/**
 * The case store must authorize ownerId against the authenticated session and
 * load current notice/recipient facts and enclosure IDs from persisted case
 * state. No request-supplied selection flags or document metadata are accepted.
 *
 * This is a server-side draft assembler, NOT a payment, approval, or mail gate.
 * The host must persist and revalidate the exact packet hash before approval.
 */
export interface IrsGeneralOwnedPacketSnapshot {
  readonly letterInput: IrsGeneralLetterPreviewInput;
  readonly selectedEnclosureDocumentIds: readonly string[];
}

export interface IrsGeneralOwnedCaseStore {
  loadOwnedCaseSnapshot(input: {
    ownerId: string;
    matterId: string;
  }): Promise<IrsGeneralOwnedPacketSnapshot | null>;
}

export type IrsGeneralOwnedPacketBlocker =
  | "owned_case_unavailable"
  | "owned_case_changed"
  | "enclosure_selection_invalid"
  | "enclosure_not_eligible"
  | "owned_packet_storage_unavailable";

export type IrsGeneralOwnedPacketPreviewResult =
  | IrsGeneralPacketPreviewResult
  | { ready: false; blockers: readonly IrsGeneralOwnedPacketBlocker[]; preview: null };

export interface IrsGeneralOwnedPacketPreviewInput {
  /** Supplied by an authenticated server boundary, never the browser. */
  ownerId: string;
  matterId: string;
  caseStore: IrsGeneralOwnedCaseStore;
  /** Must return only scanned-clean, owner- and matter-eligible documents. */
  documentStore: PacketStorageAdapter;
  storageOptions?: SecurePacketStorageOptions;
}

const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Capture the persisted facts used to render a packet before asynchronous
 * storage reads. The second owner-scoped read must match these exact facts;
 * a changed notice, recipient, letter, or enclosure selection requires a new
 * draft instead of returning an already-stale packet. Any serialization
 * failure is treated as an unavailable case, never as an approval signal.
 */
function snapshotSignature(snapshot: IrsGeneralOwnedPacketSnapshot): string | null {
  try {
    return JSON.stringify({
      letterInput: snapshot.letterInput,
      selectedEnclosureDocumentIds: snapshot.selectedEnclosureDocumentIds,
    });
  } catch {
    return null;
  }
}

/** Capture immutable, packet-relevant metadata before asynchronous storage reads. */
function enclosureSignature(row: PacketDocumentRow): string {
  return JSON.stringify({
    documentId: row.document_id,
    role: row.role,
    evidenceKind: row.evidence_kind,
    storagePath: row.storage_path,
    safeFilename: row.safe_filename,
    sha256: row.sha256,
    mimeType: row.mime_type,
    pageCount: row.page_count ?? null,
    position: row.position,
    excludedPages: row.excluded_pages ?? [],
  });
}

/** Shared owner-scoped storage-path guard for both packet assembly and
 * persisted human review. Control characters must not become storage keys. */
export function isIrsOwnedEnclosureStoragePath(ownerId: string, path: string): boolean {
  if (typeof path !== "string" || !path.startsWith(ownerId + "/") || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) {
    return false;
  }
  return path.slice(ownerId.length + 1).split("/").every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

/**
 * Fail closed on missing ownership, stale selections, and unsafe storage
 * references before fetching any attachment bytes. The storage adapter
 * enforces owner-scoped signed reads and byte-size/time limits; the canonical
 * packet builder verifies each stored SHA-256 and the assembled PDF.
 */
export async function prepareIrsGeneralOwnedPacketPreview(
  input: IrsGeneralOwnedPacketPreviewInput,
): Promise<IrsGeneralOwnedPacketPreviewResult> {
  if (typeof input?.ownerId !== "string" || typeof input?.matterId !== "string" ||
      !SAFE_ID.test(input.ownerId) || !SAFE_ID.test(input.matterId) ||
      !input.caseStore || !input.documentStore) {
    return { ready: false, blockers: ["owned_case_unavailable"], preview: null };
  }

  let snapshot: IrsGeneralOwnedPacketSnapshot | null;
  try {
    snapshot = await input.caseStore.loadOwnedCaseSnapshot({
      ownerId: input.ownerId,
      matterId: input.matterId,
    });
  } catch {
    return { ready: false, blockers: ["owned_case_unavailable"], preview: null };
  }
  if (!snapshot?.letterInput || !Array.isArray(snapshot.selectedEnclosureDocumentIds)) {
    return { ready: false, blockers: ["owned_case_unavailable"], preview: null };
  }

  const originalSnapshotSignature = snapshotSignature(snapshot);
  if (!originalSnapshotSignature) {
    return { ready: false, blockers: ["owned_case_unavailable"], preview: null };
  }

  const ids = snapshot.selectedEnclosureDocumentIds;
  if (ids.some((id) => typeof id !== "string" || !SAFE_ID.test(id)) ||
      new Set(ids).size !== ids.length) {
    return { ready: false, blockers: ["enclosure_selection_invalid"], preview: null };
  }

  let eligible: readonly PacketDocumentRow[];
  try {
    eligible = await input.documentStore.loadEligibleDocuments({
      ownerId: input.ownerId,
      matterId: input.matterId,
    });
  } catch {
    return { ready: false, blockers: ["owned_packet_storage_unavailable"], preview: null };
  }
  if (!Array.isArray(eligible)) {
    return { ready: false, blockers: ["owned_packet_storage_unavailable"], preview: null };
  }

  const byId = new Map<string, PacketDocumentRow>();
  for (const row of eligible) {
    if (row && typeof row.document_id === "string") {
      // Duplicate rows from an inconsistent store must never silently select
      // one version of a document's metadata.
      if (byId.has(row.document_id)) {
        return { ready: false, blockers: ["enclosure_not_eligible"], preview: null };
      }
      byId.set(row.document_id, row);
    }
  }

  const selected: IrsGeneralSelectedEnclosure[] = [];
  const selectedPaths = new Set<string>();
  const selectedSignatures = new Map<string, string>();
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || row.role !== "evidence" ||
        !isIrsOwnedEnclosureStoragePath(input.ownerId, row.storage_path ?? "") ||
        selectedPaths.has(row.storage_path)) {
      return { ready: false, blockers: ["enclosure_not_eligible"], preview: null };
    }
    selectedPaths.add(row.storage_path);
    selectedSignatures.set(id, enclosureSignature(row));
    selected.push({ document: row, explicitlySelected: true, securityCleared: true });
  }

  try {
    const storage = createSecurePacketStorageAdapter(input.documentStore, input.storageOptions);
    const result = await prepareIrsGeneralPacketPreview(
      snapshot.letterInput,
      selected,
      (row) => storage.readBytes(input.ownerId, row),
    );
    if (!result.ready) return result;

    // A packet is only a draft; nevertheless, never return a preview based on
    // a case that changed while its PDFs were being assembled. The store must
    // enforce owner and matter scope on *both* reads.
    let latest: IrsGeneralOwnedPacketSnapshot | null;
    try {
      latest = await input.caseStore.loadOwnedCaseSnapshot({
        ownerId: input.ownerId,
        matterId: input.matterId,
      });
    } catch {
      return { ready: false, blockers: ["owned_case_changed"], preview: null };
    }
    if (!latest?.letterInput || !Array.isArray(latest.selectedEnclosureDocumentIds) ||
        snapshotSignature(latest) !== originalSnapshotSignature) {
      return { ready: false, blockers: ["owned_case_changed"], preview: null };
    }

    // The original scanned-clean document lookup can become stale while PDFs
    // are fetched and merged. Recheck selected evidence after assembly so a
    // newly quarantined, revoked, or replaced object cannot leave this draft
    // with an apparently eligible enclosure. This is still NOT an approval or
    // mailing gate; the host must revalidate again before fulfillment.
    if (ids.length > 0) {
      let currentEligible: readonly PacketDocumentRow[];
      try {
        currentEligible = await input.documentStore.loadEligibleDocuments({
          ownerId: input.ownerId,
          matterId: input.matterId,
        });
      } catch {
        return { ready: false, blockers: ["owned_packet_storage_unavailable"], preview: null };
      }
      if (!Array.isArray(currentEligible)) {
        return { ready: false, blockers: ["owned_packet_storage_unavailable"], preview: null };
      }
      const currentById = new Map<string, PacketDocumentRow>();
      for (const row of currentEligible) {
        if (!row || typeof row.document_id !== "string") continue;
        if (currentById.has(row.document_id)) {
          return { ready: false, blockers: ["enclosure_not_eligible"], preview: null };
        }
        currentById.set(row.document_id, row);
      }
      for (const id of ids) {
        const row = currentById.get(id);
        if (!row || row.role !== "evidence" ||
            !isIrsOwnedEnclosureStoragePath(input.ownerId, row.storage_path ?? "") ||
            enclosureSignature(row) !== selectedSignatures.get(id)) {
          return { ready: false, blockers: ["enclosure_not_eligible"], preview: null };
        }
      }
    }
    return result;
  } catch {
    return { ready: false, blockers: ["owned_packet_storage_unavailable"], preview: null };
  }
}
