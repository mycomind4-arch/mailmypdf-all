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

function ownerScopedPath(ownerId: string, path: string): boolean {
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
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || row.role !== "evidence" ||
        !ownerScopedPath(input.ownerId, row.storage_path ?? "") ||
        selectedPaths.has(row.storage_path)) {
      return { ready: false, blockers: ["enclosure_not_eligible"], preview: null };
    }
    selectedPaths.add(row.storage_path);
    selected.push({ document: row, explicitlySelected: true, securityCleared: true });
  }

  try {
    const storage = createSecurePacketStorageAdapter(input.documentStore, input.storageOptions);
    return await prepareIrsGeneralPacketPreview(
      snapshot.letterInput,
      selected,
      (row) => storage.readBytes(input.ownerId, row),
    );
  } catch {
    return { ready: false, blockers: ["owned_packet_storage_unavailable"], preview: null };
  }
}
