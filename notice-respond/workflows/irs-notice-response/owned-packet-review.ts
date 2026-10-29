import type { PacketManifestEntry } from "@mailmypdf/packet-builder";
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
  if (!mail || mail.responsePath !== "mail" || mail.mailPermitted !== true ||
      mail.instructionsConfirmed !== true || mail.recipientAddressConfirmed !== true ||
      mail.requiresDifferentProcedure === true ||
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
      !Array.isArray(stored.manifest)) {
    return blocked("draft_packet_changed");
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
