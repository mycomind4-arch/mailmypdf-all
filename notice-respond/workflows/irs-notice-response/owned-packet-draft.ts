import type { PacketManifestEntry } from "@mailmypdf/packet-builder";
import {
  prepareIrsGeneralOwnedPacketPreview,
  type IrsGeneralOwnedPacketPreviewInput,
  type IrsGeneralOwnedPacketSnapshot,
} from "./owned-packet-preview";

/**
 * A revision must be allocated by the authenticated case store and changed
 * monotonically whenever any packet-relevant case fact changes. The browser
 * must never supply it. The store's atomic compare-and-set must also recheck
 * owner/matter scope and current enclosure scan/eligibility state.
 */
export interface IrsGeneralVersionedCaseStore {
  loadOwnedCaseSnapshot(input: {
    ownerId: string;
    matterId: string;
  }): Promise<(IrsGeneralOwnedPacketSnapshot & { readonly revision: string }) | null>;
}

export interface IrsGeneralDraftPersistenceRequest {
  readonly ownerId: string;
  readonly matterId: string;
  readonly expectedCaseRevision: string;
  readonly expectedNoticeSha256: string;
  readonly expectedRecipientAddress: string;
  readonly expectedEnclosureDocumentIds: readonly string[];
  readonly packetSha256: string;
  readonly pdfBytes: Uint8Array;
  readonly manifest: readonly PacketManifestEntry[];
}

/**
 * The host implementation MUST perform one atomic transaction/conditional
 * write: verify current owner, case revision, notice digest, recipient,
 * enclosure selection AND scan eligibility, then store immutable PDF bytes
 * under the same SHA-256. Return null on any conflict. This is NOT approval,
 * payment, fulfillment, or authorization to invoke Lob.
 */
/**
 * An atomic persistence receipt must identify the same owner and matter as
 * the server-side request. A digest/revision alone is not enough to detect
 * an adapter returning another customer's otherwise identical draft.
 * The adapter must still enforce ownership in the transaction itself.
 */
export interface IrsGeneralDraftPersistenceReceipt {
  readonly ownerId: string;
  readonly matterId: string;
  readonly draftId: string;
  readonly packetSha256: string;
  readonly caseRevision: string;
}

/**
 * Read back the immutable draft from trusted owner-scoped storage. A receipt
 * alone does not prove that the PDF bytes were actually saved. The host must
 * enforce owner/matter scope on this read independently of the write.
 */
export interface IrsGeneralPersistedDraftReadback {
  readonly ownerId: string;
  readonly matterId: string;
  readonly draftId: string;
  readonly packetSha256: string;
  readonly caseRevision: string;
  readonly pdfBytes: Uint8Array;
  /** Persisted approval context, read independently from the write receipt. */
  readonly noticeSha256: string;
  readonly recipientAddress: string;
  readonly selectedEnclosureDocumentIds: readonly string[];
  readonly manifest: readonly PacketManifestEntry[];
}

export interface IrsGeneralOwnedDraftStore {
  persistDraftIfCurrent(
    request: IrsGeneralDraftPersistenceRequest,
  ): Promise<IrsGeneralDraftPersistenceReceipt | null>;
  readPersistedDraft(input: {
    ownerId: string;
    matterId: string;
    draftId: string;
  }): Promise<IrsGeneralPersistedDraftReadback | null>;
}

export interface IrsGeneralOwnedDraftInput extends Omit<IrsGeneralOwnedPacketPreviewInput, "caseStore"> {
  readonly caseStore: IrsGeneralVersionedCaseStore;
  readonly draftStore: IrsGeneralOwnedDraftStore;
}

export type IrsGeneralOwnedDraftResult =
  | { persisted: false; blockers: readonly string[]; draft: null }
  | {
      persisted: true;
      blockers: readonly [];
      draft: Readonly<{
        draftId: string;
        packetSha256: string;
        caseRevision: string;
        status: "persisted_draft_requires_explicit_approval";
      }>;
    };

const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;

async function digestPdfBytes(bytes: Uint8Array): Promise<string> {
  // Copy into an owned ArrayBuffer to avoid platform-dependent BufferSource
  // typing and prevent an adapter from mutating the digest input mid-read.
  const hashInput = new Uint8Array(bytes.length);
  hashInput.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", hashInput.buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")).join("");
}

/** Bind the initial revision to all facts used for packet assembly. */
function draftBasisSignature(
  snapshot: IrsGeneralOwnedPacketSnapshot & { readonly revision: string },
): string | null {
  try {
    return JSON.stringify({
      revision: snapshot.revision,
      letterInput: snapshot.letterInput,
      selectedEnclosureDocumentIds: snapshot.selectedEnclosureDocumentIds,
    });
  } catch {
    return null;
  }
}

/**
 * Produce an owner-scoped PDF and persist its EXACT bytes for subsequent
 * human review. Even a successful result carries no approval or provider
 * permission. The trusted store must atomically reject a concurrent case or
 * document change after the preview's final read.
 */
export async function prepareAndPersistIrsGeneralOwnedDraft(
  input: IrsGeneralOwnedDraftInput,
): Promise<IrsGeneralOwnedDraftResult> {
  if (!input?.draftStore || typeof input.draftStore.persistDraftIfCurrent !== "function" ||
      typeof input.draftStore.readPersistedDraft !== "function" ||
      !input.caseStore || typeof input.caseStore.loadOwnedCaseSnapshot !== "function" ||
      !SAFE_ID.test(input.ownerId ?? "") || !SAFE_ID.test(input.matterId ?? "")) {
    return { persisted: false, blockers: ["owned_case_unavailable"], draft: null };
  }

  let snapshot: Awaited<ReturnType<IrsGeneralVersionedCaseStore["loadOwnedCaseSnapshot"]>>;
  try {
    snapshot = await input.caseStore.loadOwnedCaseSnapshot({
      ownerId: input.ownerId,
      matterId: input.matterId,
    });
  } catch {
    return { persisted: false, blockers: ["owned_case_unavailable"], draft: null };
  }
  if (!snapshot || typeof snapshot.revision !== "string" ||
      !SAFE_ID.test(snapshot.revision) || !Array.isArray(snapshot.selectedEnclosureDocumentIds)) {
    return { persisted: false, blockers: ["case_revision_unavailable"], draft: null };
  }
  const expectedCaseRevision = snapshot.revision;
  const expectedEnclosureDocumentIds = [...snapshot.selectedEnclosureDocumentIds];
  const initialBasis = draftBasisSignature(snapshot);
  if (!initialBasis) {
    return { persisted: false, blockers: ["case_revision_unavailable"], draft: null };
  }

  const result = await prepareIrsGeneralOwnedPacketPreview(input);
  if (!result.ready) {
    return { persisted: false, blockers: result.blockers, draft: null };
  }
  const preview = result.preview;
  let actualHash: string;
  try {
    // Same WebCrypto contract as the PDF preview, with no Node-only imports.
    actualHash = await digestPdfBytes(preview.pdfBytes);
  } catch {
    return { persisted: false, blockers: ["draft_integrity_failed"], draft: null };
  }
  if (actualHash !== preview.packetSha256.toLowerCase()) {
    return { persisted: false, blockers: ["draft_integrity_failed"], draft: null };
  }

  // The preview validates case contents, but it intentionally does not check
  // the revision. A concurrent edit can advance the revision while leaving
  // identical text, or arrive just after the preview's last read. Reject
  // both before invoking storage. The store's atomic CAS is still mandatory
  // because the case can change again after this read.
  let current: Awaited<ReturnType<IrsGeneralVersionedCaseStore["loadOwnedCaseSnapshot"]>>;
  try {
    current = await input.caseStore.loadOwnedCaseSnapshot({
      ownerId: input.ownerId,
      matterId: input.matterId,
    });
  } catch {
    return { persisted: false, blockers: ["draft_case_changed"], draft: null };
  }
  if (!current || current.revision !== expectedCaseRevision ||
      draftBasisSignature(current) !== initialBasis) {
    return { persisted: false, blockers: ["draft_case_changed"], draft: null };
  }

  try {
    const persisted = await input.draftStore.persistDraftIfCurrent({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedCaseRevision,
      expectedNoticeSha256: preview.sourceNoticeSha256,
      expectedRecipientAddress: preview.recipientAddress,
      expectedEnclosureDocumentIds,
      packetSha256: actualHash,
      pdfBytes: preview.pdfBytes,
      manifest: preview.manifest,
    });
    if (!persisted) {
      return { persisted: false, blockers: ["draft_case_changed"], draft: null };
    }
    if (typeof persisted.draftId !== "string" || !SAFE_ID.test(persisted.draftId) ||
        persisted.ownerId !== input.ownerId ||
        persisted.matterId !== input.matterId ||
        persisted.packetSha256 !== actualHash ||
        persisted.caseRevision !== expectedCaseRevision) {
      return { persisted: false, blockers: ["draft_persistence_unverified"], draft: null };
    }
    // Do not report a persisted PDF merely because the write returned a
    // plausible receipt. Verify the actual bytes AND the approval-relevant
    // notice, recipient, selection and ordered manifest under an independently
    // owner-scoped read. An intact PDF with mismatched stored metadata is not
    // safe to present for exact-document approval.
    let readback: IrsGeneralPersistedDraftReadback | null;
    try {
      readback = await input.draftStore.readPersistedDraft({
        ownerId: input.ownerId,
        matterId: input.matterId,
        draftId: persisted.draftId,
      });
    } catch {
      return { persisted: false, blockers: ["draft_persistence_unverified"], draft: null };
    }
    if (!readback || readback.ownerId !== input.ownerId ||
        readback.matterId !== input.matterId ||
        readback.draftId !== persisted.draftId ||
        readback.caseRevision !== expectedCaseRevision ||
        readback.packetSha256 !== actualHash ||
        !(readback.pdfBytes instanceof Uint8Array) ||
        readback.pdfBytes.length !== preview.pdfBytes.length ||
        readback.noticeSha256 !== preview.sourceNoticeSha256 ||
        readback.recipientAddress !== preview.recipientAddress ||
        !Array.isArray(readback.selectedEnclosureDocumentIds) ||
        readback.selectedEnclosureDocumentIds.length !== expectedEnclosureDocumentIds.length ||
        readback.selectedEnclosureDocumentIds.some((id, index) => id !== expectedEnclosureDocumentIds[index]) ||
        !Array.isArray(readback.manifest) ||
        JSON.stringify(readback.manifest) !== JSON.stringify(preview.manifest)) {
      return { persisted: false, blockers: ["draft_persistence_unverified"], draft: null };
    }
    try {
      if (await digestPdfBytes(readback.pdfBytes) !== actualHash) {
        return { persisted: false, blockers: ["draft_persistence_unverified"], draft: null };
      }
    } catch {
      return { persisted: false, blockers: ["draft_persistence_unverified"], draft: null };
    }
    return {
      persisted: true,
      blockers: [],
      draft: {
        draftId: persisted.draftId,
        packetSha256: actualHash,
        caseRevision: expectedCaseRevision,
        status: "persisted_draft_requires_explicit_approval",
      },
    };
  } catch {
    // Fail closed; never treat a timeout or uncertain write as approval.
    return { persisted: false, blockers: ["draft_persistence_unverified"], draft: null };
  }
}
