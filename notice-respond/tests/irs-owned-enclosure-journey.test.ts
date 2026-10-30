import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  generatePlainTextPdf,
  inspectPacketPdfPageCount,
  validatePdfForMailing,
  type PacketDocumentRow,
} from "@mailmypdf/packet-builder";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";
import type { IrsGeneralLetterPreviewInput } from "../workflows/irs-notice-response/letter-preview";
import type {
  IrsGeneralDraftPersistenceRequest,
  IrsGeneralOwnedDraftStore,
  IrsGeneralPersistedDraftReadback,
} from "../workflows/irs-notice-response/owned-packet-draft";
import type {
  IrsGeneralOwnedApprovalStore,
  IrsGeneralRecordedApproval,
} from "../workflows/irs-notice-response/owned-packet-approval";

// Exercises the production PDF merger, signed evidence reads, persisted
// manifest, exact-PDF review and approval with one real multi-page enclosure.
// No Stripe, Lob, production storage, or network request is made.
const ownerId = "owner-a";
const matterId = "matter-a";
const documentId = "supporting-record";
const recipient = "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714";
const letterInput: IrsGeneralLetterPreviewInput = {
  mail: {
    noticeDocumentId: "notice-current",
    analyzedNoticeDocumentId: "notice-current",
    noticeSha256: "a".repeat(64),
    analyzedNoticeSha256: "a".repeat(64),
    noticeStatus: "active",
    responsePath: "mail",
    instructionsConfirmed: true,
    mailPermitted: true,
    requiresDifferentProcedure: false,
    recipientAddress: recipient,
    recipientAddressSource: "controlling_notice",
    recipientAddressConfirmed: true,
    confirmedRecipientAddress: recipient,
    confirmedRecipientNoticeSha256: "a".repeat(64),
    confirmedRecipientAddressSource: "controlling_notice",
    confirmedRecipientResponsePath: "mail",
  },
  taxpayerName: "Example Taxpayer",
  returnAddress: "100 Example St\nEureka, CA 95501",
  responseBody: "Please review the enclosed supporting record.",
};

const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function fixture() {
  const evidence = await generatePlainTextPdf(
    Array.from({ length: 85 }, (_, index) => "Supporting evidence line " + (index + 1)).join("\n"),
  );
  const measured = await validatePdfForMailing(evidence);
  expect(measured.pageCount).toBeGreaterThan(1);

  const row: PacketDocumentRow = {
    document_id: documentId,
    role: "evidence",
    evidence_kind: "supporting_record",
    page_count: measured.pageCount,
    position: 0,
    sha256: sha(evidence),
    storage_path: ownerId + "/" + documentId + ".pdf",
    safe_filename: documentId + ".pdf",
    mime_type: "application/pdf",
  };
  let eligible = true;
  const selectedEnclosureDocumentIds = [documentId];
  const caseStore = {
    loadOwnedCaseSnapshot: vi.fn(async (scope: { ownerId: string; matterId: string }) =>
      scope.ownerId === ownerId && scope.matterId === matterId
        ? { revision: "rev-1", letterInput, selectedEnclosureDocumentIds: [...selectedEnclosureDocumentIds] }
        : null),
  };
  const loadEligibleDocuments = vi.fn(async (scope: { ownerId: string; matterId: string }) =>
    eligible && scope.ownerId === ownerId && scope.matterId === matterId ? [row] : []);
  const createSignedReadUrl = vi.fn(async () => "https://signed.invalid/supporting-record");
  const persistMeasuredPageCount = vi.fn(async () => {
    throw new Error("A draft must not write measured page counts");
  });
  const documentStore: PacketStorageAdapter = {
    loadEligibleDocuments,
    createSignedReadUrl,
    persistMeasuredPageCount,
  };
  const fetchImpl = vi.fn(async () => new Response(new Uint8Array(evidence).buffer)) as unknown as typeof fetch;
  const storageOptions = { fetchImpl };
  let stored: IrsGeneralPersistedDraftReadback | null = null;
  let recorded: IrsGeneralRecordedApproval | null = null;

  const persistDraftIfCurrent: IrsGeneralOwnedDraftStore["persistDraftIfCurrent"] = vi.fn(
    async (request: IrsGeneralDraftPersistenceRequest) => {
      if (!eligible || request.ownerId !== ownerId || request.matterId !== matterId ||
          request.expectedCaseRevision !== "rev-1" ||
          request.expectedNoticeSha256 !== letterInput.mail.noticeSha256 ||
          request.expectedRecipientAddress !== recipient ||
          JSON.stringify(request.expectedEnclosureDocumentIds) !== JSON.stringify(selectedEnclosureDocumentIds) ||
          request.manifest.length !== 1 ||
          request.manifest[0]?.documentId !== documentId ||
          request.manifest[0]?.sha256 !== row.sha256 ||
          request.manifest[0]?.pageCount !== measured.pageCount ||
          sha(request.pdfBytes) !== request.packetSha256) return null;
      stored = {
        ownerId, matterId, draftId: "draft-1", caseRevision: "rev-1",
        packetSha256: request.packetSha256, pdfBytes: request.pdfBytes.slice(),
        noticeSha256: request.expectedNoticeSha256,
        recipientAddress: request.expectedRecipientAddress,
        selectedEnclosureDocumentIds: [...request.expectedEnclosureDocumentIds],
        manifest: request.manifest.map((entry) => ({ ...entry })),
      };
      return {
        ownerId, matterId, draftId: "draft-1",
        caseRevision: "rev-1", packetSha256: request.packetSha256,
      };
    },
  );
  const readPersistedDraft: IrsGeneralOwnedDraftStore["readPersistedDraft"] = vi.fn(async (scope) =>
    stored && scope.ownerId === ownerId && scope.matterId === matterId && scope.draftId === "draft-1"
      ? { ...stored, pdfBytes: stored.pdfBytes.slice(), manifest: stored.manifest.map((entry) => ({ ...entry })) }
      : null);
  const draftStore: IrsGeneralOwnedDraftStore = { persistDraftIfCurrent, readPersistedDraft };

  const approveDraftIfCurrent: IrsGeneralOwnedApprovalStore["approveDraftIfCurrent"] = vi.fn(async (request) => {
    if (!eligible || !stored ||
        request.ownerId !== ownerId || request.matterId !== matterId ||
        request.draftId !== "draft-1" || request.expectedCaseRevision !== "rev-1" ||
        request.expectedNoticeSha256 !== stored.noticeSha256 ||
        request.expectedRecipientAddress !== stored.recipientAddress ||
        request.expectedPacketSha256 !== stored.packetSha256 ||
        request.reviewedPacketSha256 !== stored.packetSha256 ||
        JSON.stringify(request.expectedEnclosureDocumentIds) !== JSON.stringify(selectedEnclosureDocumentIds) ||
        JSON.stringify(request.expectedManifest) !== JSON.stringify(stored.manifest)) return null;
    recorded = {
      ownerId, matterId, draftId: "draft-1", approvalId: "approval-1",
      caseRevision: "rev-1", packetSha256: stored.packetSha256,
      reviewedPacketSha256: request.reviewedPacketSha256,
      noticeSha256: stored.noticeSha256, recipientAddress: stored.recipientAddress,
      selectedEnclosureDocumentIds: [...stored.selectedEnclosureDocumentIds],
      manifest: stored.manifest.map((entry) => ({ ...entry })),
    };
    return {
      ownerId, matterId, draftId: "draft-1", approvalId: "approval-1",
      caseRevision: "rev-1", packetSha256: stored.packetSha256,
    };
  });
  const readRecordedApproval: IrsGeneralOwnedApprovalStore["readRecordedApproval"] = vi.fn(async (scope) =>
    recorded && scope.ownerId === ownerId && scope.matterId === matterId &&
      scope.draftId === "draft-1" && scope.approvalId === "approval-1" ? recorded : null);
  const approvalStore: IrsGeneralOwnedApprovalStore = { approveDraftIfCurrent, readRecordedApproval };
  const shared = { ownerId, matterId, caseStore, documentStore, storageOptions };

  async function persistAndReview() {
    const draft = await irsGeneralDefinition.prepareAndPersistOwnedDraft({ ...shared, draftStore });
    expect(draft.persisted).toBe(true);
    if (!draft.persisted) throw new Error("Expected persisted evidence packet");
    const reviewed = await irsGeneralDefinition.loadOwnedDraftForReview({
      ownerId, matterId, draftId: draft.draft.draftId, caseStore, draftStore,
    });
    expect(reviewed.ready).toBe(true);
    if (!reviewed.ready) throw new Error("Expected reviewable evidence packet");
    return reviewed.review;
  }

  return {
    row, measured, shared, draftStore, approvalStore, fetchImpl, loadEligibleDocuments,
    createSignedReadUrl, persistMeasuredPageCount, approveDraftIfCurrent,
    readRecordedApproval, persistAndReview,
    revokeEvidence() { eligible = false; },
  };
}

describe("IRS physical-mail evidence packet: persisted PDF to explicit approval", () => {
  it("requires explicit confirmation of the exact enclosure labels and measured pages", async () => {
    const state = await fixture();
    const review = await state.persistAndReview();
    const original = review.manifest[0];
    if (!original) throw new Error("Expected a reviewed enclosure");
    for (const reviewedManifest of [
      [],
      new Array(1), // Sparse client arrays must not skip confirmation checks.
      [{ ...original, filename: "unreviewed-attachment.pdf" }],
      [{ ...original, pageCount: original.pageCount + 1 }],
      [{ ...original, documentId: "unreviewed-document" }],
    ]) {
      const result = await irsGeneralDefinition.approveOwnedDraft({
        ...state.shared, draftStore: state.draftStore, approvalStore: state.approvalStore,
        draftId: review.draftId, reviewedPacketSha256: review.packetSha256,
        reviewedRecipientAddress: review.recipientAddress,
        reviewedCaseRevision: review.caseRevision,
        reviewedNoticeSha256: review.noticeSha256,
        reviewedManifest,
      });
      expect(result).toEqual({
        approved: false, blockers: ["explicit_packet_review_required"], approval: null,
      });
    }
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("preserves measured enclosure pages, ordered manifest and exact approved bytes", async () => {
    const state = await fixture();
    const review = await state.persistAndReview();
    expect(review.selectedEnclosureDocumentIds).toEqual([documentId]);
    expect(review.manifest).toEqual([expect.objectContaining({
      documentId, sha256: state.row.sha256, pageCount: state.measured.pageCount,
    })]);
    expect(await inspectPacketPdfPageCount(review.pdfBytes)).toBeGreaterThan(state.measured.pageCount);
    expect(sha(review.pdfBytes)).toBe(review.packetSha256);
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();

    const approved = await irsGeneralDefinition.approveOwnedDraft({
      ...state.shared, draftStore: state.draftStore, approvalStore: state.approvalStore,
      draftId: review.draftId, reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      reviewedCaseRevision: review.caseRevision,
      reviewedNoticeSha256: review.noticeSha256,
      reviewedManifest: review.manifest,
    });
    expect(approved.approved).toBe(true);
    if (!approved.approved) throw new Error("Expected explicit exact-packet approval");
    expect(approved.approval.status).toBe("recorded_approval_no_payment_or_mailing");
    expect(state.approveDraftIfCurrent).toHaveBeenCalledTimes(1);
    expect(state.readRecordedApproval).toHaveBeenCalledTimes(1);
    expect(state.persistMeasuredPageCount).not.toHaveBeenCalled();
    expect(state.fetchImpl).toHaveBeenCalledTimes(2);
    expect(Object.keys(approved.approval)).not.toContain("mailingId");
    expect(Object.keys(approved.approval)).not.toContain("paymentId");
  });

  it("refuses approval when scanned evidence is revoked after the PDF was reviewed", async () => {
    const state = await fixture();
    const review = await state.persistAndReview();
    state.revokeEvidence();
    const approved = await irsGeneralDefinition.approveOwnedDraft({
      ...state.shared, draftStore: state.draftStore, approvalStore: state.approvalStore,
      draftId: review.draftId, reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      reviewedCaseRevision: review.caseRevision,
      reviewedNoticeSha256: review.noticeSha256,
      reviewedManifest: review.manifest,
    });
    expect(approved.approved).toBe(false);
    expect(approved.blockers).toContain("enclosure_not_eligible");
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
    expect(state.readRecordedApproval).not.toHaveBeenCalled();
  });
});
