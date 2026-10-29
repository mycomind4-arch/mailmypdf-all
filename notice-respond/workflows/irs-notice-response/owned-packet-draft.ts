import { createHash } from "node:crypto";
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
export interface IrsGeneralOwnedDraftStore {
  persistDraftIfCurrent(
    request: IrsGeneralDraftPersistenceRequest,
  ): Promise<{ readonly draftId: string; readonly packetSha256: string; readonly caseRevision: string } | null>;
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

  const result = await prepareIrsGeneralOwnedPacketPreview(input);
  if (!result.ready) {
    return { persisted: false, blockers: result.blockers, draft: null };
  }
  const preview = result.preview;
  const actualHash = createHash("sha256").update(preview.pdfBytes).digest("hex");
  if (actualHash !== preview.packetSha256.toLowerCase()) {
    return { persisted: false, blockers: ["draft_integrity_failed"], draft: null };
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
        persisted.packetSha256 !== actualHash ||
        persisted.caseRevision !== expectedCaseRevision) {
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
