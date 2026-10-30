import {
  prepareIrsGeneralOwnedPacketPreview,
  type IrsGeneralOwnedPacketPreviewInput,
} from "./owned-packet-preview";
import type {
  IrsGeneralOwnedDraftStore,
  IrsGeneralVersionedCaseStore,
} from "./owned-packet-draft";

/**
 * This is an authenticated server-side approval boundary, not an endpoint.
 * The host must derive ownerId from the session, never a request parameter.
 * Its durable approval store must perform an atomic owner/matter/revision,
 * notice/recipient/enclosure/scan-eligibility and immutable-PDF comparison.
 * Recording approval does not authorize payment or Lob submission.
 */
/**
 * Independently readable approval record. A successful CAS receipt is not
 * proof that the approval was durably recorded for this owner and document.
 * This read must enforce owner/matter scope, independent of the write.
 */
export interface IrsGeneralRecordedApproval {
  readonly ownerId: string;
  readonly matterId: string;
  readonly draftId: string;
  readonly approvalId: string;
  readonly caseRevision: string;
  readonly packetSha256: string;
  readonly reviewedPacketSha256: string;
  readonly noticeSha256: string;
  readonly recipientAddress: string;
  readonly selectedEnclosureDocumentIds: readonly string[];
  readonly manifest: readonly IrsGeneralOwnedPacketPreviewResultManifestEntry[];
}

export interface IrsGeneralOwnedApprovalStore {
  approveDraftIfCurrent(request: {
    readonly ownerId: string;
    readonly matterId: string;
    readonly draftId: string;
    readonly expectedCaseRevision: string;
    readonly expectedNoticeSha256: string;
    readonly expectedRecipientAddress: string;
    readonly expectedEnclosureDocumentIds: readonly string[];
    readonly expectedManifest: readonly IrsGeneralOwnedPacketPreviewResultManifestEntry[];
    readonly expectedPacketSha256: string;
    readonly reviewedPacketSha256: string;
  }): Promise<{
    readonly ownerId: string;
    readonly matterId: string;
    readonly draftId: string;
    readonly approvalId: string;
    readonly caseRevision: string;
    readonly packetSha256: string;
  } | null>;
  readRecordedApproval(input: {
    readonly ownerId: string;
    readonly matterId: string;
    readonly draftId: string;
    readonly approvalId: string;
  }): Promise<IrsGeneralRecordedApproval | null>;
}

type IrsGeneralOwnedPacketPreviewResultManifestEntry =
  Extract<Awaited<ReturnType<typeof prepareIrsGeneralOwnedPacketPreview>>, { ready: true }>["preview"]["manifest"][number];

export interface IrsGeneralOwnedApprovalInput extends Omit<IrsGeneralOwnedPacketPreviewInput, "caseStore"> {
  readonly caseStore: IrsGeneralVersionedCaseStore;
  readonly draftStore: Pick<IrsGeneralOwnedDraftStore, "readPersistedDraft">;
  readonly approvalStore: IrsGeneralOwnedApprovalStore;
  readonly draftId: string;
  /** Exact digest and destination explicitly reviewed by the authenticated user. */
  readonly reviewedPacketSha256: string;
  readonly reviewedRecipientAddress: string;
  /** Exact facts shown in the authenticated customer review, not client-chosen replacements. */
  readonly reviewedCaseRevision: string;
  readonly reviewedNoticeSha256: string;
  readonly reviewedManifest: readonly IrsGeneralOwnedPacketPreviewResultManifestEntry[];
}

export type IrsGeneralOwnedApprovalResult =
  | { approved: false; blockers: readonly string[]; approval: null }
  | {
      approved: true;
      blockers: readonly [];
      approval: Readonly<{
        approvalId: string;
        draftId: string;
        packetSha256: string;
        caseRevision: string;
        status: "recorded_approval_no_payment_or_mailing";
      }>;
    };

const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const SHA256 = /^[a-f0-9]{64}$/;

/** Compare ordered, customer-visible enclosure facts without depending on JSON key order. */
function matchesReviewedManifest(reviewed: unknown, stored: unknown): boolean {
  if (!Array.isArray(reviewed) || !Array.isArray(stored) ||
      reviewed.length !== stored.length || reviewed.length > 100) return false;
  for (let index = 0; index < reviewed.length; index += 1) {
    const entry = reviewed[index];
    const actual = stored[index];
    // An Array.every() check would skip holes in a sparse array.
    if (!entry || typeof entry !== "object" || !actual || typeof actual !== "object" ||
        entry.documentId !== actual.documentId || entry.role !== actual.role ||
        entry.evidenceKind !== actual.evidenceKind || entry.filename !== actual.filename ||
        entry.sha256 !== actual.sha256 || entry.pageCount !== actual.pageCount) return false;
  }
  return true;
}

function caseBasis(value: {
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
  } catch {
    return null;
  }
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Rebuild the exact PDF from CURRENT scanned-clean evidence and compare it to
 * the independently read persisted draft before recording human approval.
 * Never trust a client-supplied PDF, manifest, address, or case revision.
 * The approval store's atomic CAS remains mandatory after this preflight.
 */
export async function approveIrsGeneralOwnedDraft(
  input: IrsGeneralOwnedApprovalInput,
): Promise<IrsGeneralOwnedApprovalResult> {
  if (!input || typeof input.ownerId !== "string" || !SAFE_ID.test(input.ownerId) ||
      typeof input.matterId !== "string" || !SAFE_ID.test(input.matterId) ||
      typeof input.draftId !== "string" || !SAFE_ID.test(input.draftId) ||
      typeof input.caseStore?.loadOwnedCaseSnapshot !== "function" ||
      typeof input.draftStore?.readPersistedDraft !== "function" ||
      typeof input.approvalStore?.approveDraftIfCurrent !== "function" ||
      typeof input.approvalStore?.readRecordedApproval !== "function" ||
      !input.documentStore) {
    return { approved: false, blockers: ["approval_unavailable"], approval: null };
  }
  if (typeof input.reviewedPacketSha256 !== "string" ||
      !SHA256.test(input.reviewedPacketSha256) ||
      typeof input.reviewedRecipientAddress !== "string" || !input.reviewedRecipientAddress.trim() ||
      typeof input.reviewedCaseRevision !== "string" || !SAFE_ID.test(input.reviewedCaseRevision) ||
      typeof input.reviewedNoticeSha256 !== "string" || !SHA256.test(input.reviewedNoticeSha256) ||
      !Array.isArray(input.reviewedManifest)) {
    return { approved: false, blockers: ["explicit_packet_review_required"], approval: null };
  }

  let stored: Awaited<ReturnType<IrsGeneralOwnedDraftStore["readPersistedDraft"]>>;
  let initial: Awaited<ReturnType<IrsGeneralVersionedCaseStore["loadOwnedCaseSnapshot"]>>;
  try {
    [stored, initial] = await Promise.all([
      input.draftStore.readPersistedDraft({
        ownerId: input.ownerId, matterId: input.matterId, draftId: input.draftId,
      }),
      input.caseStore.loadOwnedCaseSnapshot({
        ownerId: input.ownerId, matterId: input.matterId,
      }),
    ]);
  } catch {
    return { approved: false, blockers: ["owned_draft_unavailable"], approval: null };
  }
  if (!stored || stored.ownerId !== input.ownerId || stored.matterId !== input.matterId ||
      stored.draftId !== input.draftId ||
      typeof stored.packetSha256 !== "string" || !SHA256.test(stored.packetSha256) ||
      !(stored.pdfBytes instanceof Uint8Array) || stored.pdfBytes.length === 0 ||
      !initial || typeof initial.revision !== "string" || !SAFE_ID.test(initial.revision) ||
      !Array.isArray(initial.selectedEnclosureDocumentIds)) {
    return { approved: false, blockers: ["owned_draft_unavailable"], approval: null };
  }
  const basis = caseBasis(initial);
  if (!basis || stored.caseRevision !== initial.revision) {
    return { approved: false, blockers: ["draft_case_changed"], approval: null };
  }
  if (stored.packetSha256 !== input.reviewedPacketSha256 ||
      stored.recipientAddress !== input.reviewedRecipientAddress ||
      stored.caseRevision !== input.reviewedCaseRevision ||
      stored.noticeSha256 !== input.reviewedNoticeSha256 ||
      !matchesReviewedManifest(input.reviewedManifest, stored.manifest)) {
    return { approved: false, blockers: ["explicit_packet_review_required"], approval: null };
  }
  try {
    if (await sha256(stored.pdfBytes) !== stored.packetSha256) {
      return { approved: false, blockers: ["draft_integrity_failed"], approval: null };
    }
  } catch {
    return { approved: false, blockers: ["draft_integrity_failed"], approval: null };
  }

  const currentPacket = await prepareIrsGeneralOwnedPacketPreview(input);
  if (!currentPacket.ready) {
    return { approved: false, blockers: currentPacket.blockers, approval: null };
  }
  const preview = currentPacket.preview;
  if (preview.packetSha256 !== stored.packetSha256 ||
      preview.sourceNoticeSha256 !== stored.noticeSha256 ||
      preview.recipientAddress !== stored.recipientAddress ||
      !Array.isArray(stored.selectedEnclosureDocumentIds) ||
      stored.selectedEnclosureDocumentIds.length !== initial.selectedEnclosureDocumentIds.length ||
      stored.selectedEnclosureDocumentIds.some((id, index) => id !== initial.selectedEnclosureDocumentIds[index]) ||
      !Array.isArray(stored.manifest) ||
      JSON.stringify(stored.manifest) !== JSON.stringify(preview.manifest)) {
    return { approved: false, blockers: ["draft_packet_changed"], approval: null };
  }

  // A case may change after the PDF is rebuilt, even without changing its
  // bytes. Reject an advanced revision; the store must check again atomically.
  try {
    const latest = await input.caseStore.loadOwnedCaseSnapshot({
      ownerId: input.ownerId, matterId: input.matterId,
    });
    if (!latest || caseBasis(latest) !== basis) {
      return { approved: false, blockers: ["draft_case_changed"], approval: null };
    }
  } catch {
    return { approved: false, blockers: ["draft_case_changed"], approval: null };
  }

  try {
    const receipt = await input.approvalStore.approveDraftIfCurrent({
      ownerId: input.ownerId,
      matterId: input.matterId,
      draftId: input.draftId,
      expectedCaseRevision: initial.revision,
      expectedNoticeSha256: stored.noticeSha256,
      expectedRecipientAddress: stored.recipientAddress,
      expectedEnclosureDocumentIds: [...stored.selectedEnclosureDocumentIds],
      expectedManifest: preview.manifest.map((entry) => ({ ...entry })),
      expectedPacketSha256: stored.packetSha256,
      reviewedPacketSha256: input.reviewedPacketSha256,
    });
    if (!receipt) {
      return { approved: false, blockers: ["draft_case_changed"], approval: null };
    }
    if (receipt.ownerId !== input.ownerId || receipt.matterId !== input.matterId ||
        receipt.draftId !== input.draftId || !SAFE_ID.test(receipt.approvalId ?? "") ||
        receipt.caseRevision !== initial.revision || receipt.packetSha256 !== stored.packetSha256) {
      return { approved: false, blockers: ["approval_persistence_unverified"], approval: null };
    }
    // Verify the approval record through an independently owner-scoped read.
    // A write receipt alone cannot establish durable, exact-document consent.
    const recorded = await input.approvalStore.readRecordedApproval({
      ownerId: input.ownerId,
      matterId: input.matterId,
      draftId: input.draftId,
      approvalId: receipt.approvalId,
    });
    if (!recorded || recorded.ownerId !== input.ownerId ||
        recorded.matterId !== input.matterId || recorded.draftId !== input.draftId ||
        recorded.approvalId !== receipt.approvalId ||
        recorded.caseRevision !== initial.revision ||
        recorded.packetSha256 !== stored.packetSha256 ||
        recorded.reviewedPacketSha256 !== input.reviewedPacketSha256 ||
        recorded.noticeSha256 !== stored.noticeSha256 ||
        recorded.recipientAddress !== input.reviewedRecipientAddress ||
        !Array.isArray(recorded.selectedEnclosureDocumentIds) ||
        recorded.selectedEnclosureDocumentIds.length !== initial.selectedEnclosureDocumentIds.length ||
        recorded.selectedEnclosureDocumentIds.some((id, index) =>
          id !== initial.selectedEnclosureDocumentIds[index]) ||
        !Array.isArray(recorded.manifest) ||
        JSON.stringify(recorded.manifest) !== JSON.stringify(preview.manifest)) {
      return { approved: false, blockers: ["approval_persistence_unverified"], approval: null };
    }
    return {
      approved: true,
      blockers: [],
      approval: {
        approvalId: receipt.approvalId,
        draftId: input.draftId,
        packetSha256: stored.packetSha256,
        caseRevision: initial.revision,
        status: "recorded_approval_no_payment_or_mailing",
      },
    };
  } catch {
    // An uncertain write must never be interpreted as authorization to mail.
    return { approved: false, blockers: ["approval_persistence_unverified"], approval: null };
  }
}
