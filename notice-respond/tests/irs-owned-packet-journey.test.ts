import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { inspectPacketPdfPageCount } from "@mailmypdf/packet-builder";
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

// Synthetic, owner-scoped store that exercises the real PDF assembly, immutable
// draft readback, review, and exact-document approval in one connected journey.
// It is deliberately NOT a production database, checkout, or Lob adapter.
const ownerId = "owner-a";
const matterId = "matter-a";
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
  responseBody: "Please review this notice response and the enclosed evidence.",
};

function setup() {
  let revision = "rev-1";
  let currentLetter = structuredClone(letterInput);
  const drafts = new Map<string, IrsGeneralPersistedDraftReadback>();
  const approvals = new Map<string, IrsGeneralRecordedApproval>();
  const loadOwnedCaseSnapshot = vi.fn(async (scope: { ownerId: string; matterId: string }) =>
    scope.ownerId === ownerId && scope.matterId === matterId
      ? { revision, letterInput: structuredClone(currentLetter), selectedEnclosureDocumentIds: [] as string[] }
      : null,
  );
  const caseStore = { loadOwnedCaseSnapshot };
  const documentStore: PacketStorageAdapter = {
    loadEligibleDocuments: vi.fn(async () => []),
    createSignedReadUrl: vi.fn(async () => { throw new Error("No enclosures"); }),
    persistMeasuredPageCount: vi.fn(async () => { throw new Error("No writes"); }),
  };
  const persistDraftIfCurrent = vi.fn(async (request: IrsGeneralDraftPersistenceRequest) => {
    if (request.ownerId !== ownerId || request.matterId !== matterId ||
        request.expectedCaseRevision !== revision ||
        request.expectedNoticeSha256 !== currentLetter.mail?.noticeSha256 ||
        request.expectedRecipientAddress !== currentLetter.mail?.recipientAddress ||
        request.expectedEnclosureDocumentIds.length !== 0 ||
        request.manifest.length !== 0 ||
        createHash("sha256").update(request.pdfBytes).digest("hex") !== request.packetSha256) {
      return null;
    }
    const draftId = "draft-1";
    drafts.set(draftId, {
      ownerId, matterId, draftId, caseRevision: revision,
      packetSha256: request.packetSha256, pdfBytes: request.pdfBytes.slice(),
      noticeSha256: request.expectedNoticeSha256,
      recipientAddress: request.expectedRecipientAddress,
      selectedEnclosureDocumentIds: [], manifest: [],
    });
    return { ownerId, matterId, draftId, caseRevision: revision, packetSha256: request.packetSha256 };
  });
  const readPersistedDraft = vi.fn(async (scope: { ownerId: string; matterId: string; draftId: string }) => {
    if (scope.ownerId !== ownerId || scope.matterId !== matterId) return null;
    const row = drafts.get(scope.draftId);
    return row ? { ...row, pdfBytes: row.pdfBytes.slice(), manifest: [...row.manifest] } : null;
  });
  const draftStore: IrsGeneralOwnedDraftStore = { persistDraftIfCurrent, readPersistedDraft };
  const approveDraftIfCurrent: IrsGeneralOwnedApprovalStore["approveDraftIfCurrent"] = vi.fn(async (request) => {
    const stored = drafts.get(request.draftId);
    if (!stored || request.ownerId !== ownerId || request.matterId !== matterId ||
        request.expectedCaseRevision !== revision || stored.caseRevision !== revision ||
        request.expectedPacketSha256 !== stored.packetSha256 ||
        request.reviewedPacketSha256 !== stored.packetSha256 ||
        request.expectedNoticeSha256 !== stored.noticeSha256 ||
        request.expectedRecipientAddress !== stored.recipientAddress ||
        request.expectedRecipientAddress !== currentLetter.mail?.recipientAddress ||
        request.expectedEnclosureDocumentIds.length !== 0 ||
        request.expectedManifest.length !== 0) return null;
    const approvalId = "approval-1";
    approvals.set(approvalId, {
      ownerId, matterId, draftId: request.draftId, approvalId,
      caseRevision: revision, packetSha256: stored.packetSha256,
      reviewedPacketSha256: request.reviewedPacketSha256,
      noticeSha256: stored.noticeSha256, recipientAddress: stored.recipientAddress,
      selectedEnclosureDocumentIds: [], manifest: [],
    });
    return { ownerId, matterId, draftId: request.draftId, approvalId,
      caseRevision: revision, packetSha256: stored.packetSha256 };
  });
  const readRecordedApproval: IrsGeneralOwnedApprovalStore["readRecordedApproval"] =
    vi.fn(async (scope) => {
      if (scope.ownerId !== ownerId || scope.matterId !== matterId) return null;
      const row = approvals.get(scope.approvalId);
      return row?.draftId === scope.draftId ? { ...row } : null;
    });
  const approvalStore: IrsGeneralOwnedApprovalStore = { approveDraftIfCurrent, readRecordedApproval };
  return {
    caseStore, documentStore, draftStore, approvalStore, drafts, approvals,
    persistDraftIfCurrent, approveDraftIfCurrent, readRecordedApproval,
    setResponseBody(responseBody: string) {
      currentLetter = { ...currentLetter, responseBody };
    },
    advanceRevision() { revision = "rev-2"; },
    changeRecipient() {
      currentLetter = { ...currentLetter, mail: {
        ...currentLetter.mail!, recipientAddress: "Different IRS destination",
        confirmedRecipientAddress: "Different IRS destination",
      } };
      revision = "rev-2";
    },
    corruptStoredPdf() {
      const stored = drafts.get("draft-1");
      if (!stored) throw new Error("Missing test draft");
      const bytes = stored.pdfBytes.slice();
      bytes[0] ^= 1;
      drafts.set("draft-1", { ...stored, pdfBytes: bytes });
    },
  };
}

async function persistAndReview(state: ReturnType<typeof setup>) {
  const persisted = await irsGeneralDefinition.prepareAndPersistOwnedDraft({
    ownerId, matterId, caseStore: state.caseStore,
    documentStore: state.documentStore, draftStore: state.draftStore,
  });
  expect(persisted.persisted).toBe(true);
  if (!persisted.persisted) throw new Error("Expected persisted PDF");
  const reviewed = await irsGeneralDefinition.loadOwnedDraftForReview({
    ownerId, matterId, draftId: persisted.draft.draftId,
    caseStore: state.caseStore, draftStore: state.draftStore,
  });
  expect(reviewed.ready).toBe(true);
  if (!reviewed.ready) throw new Error("Expected reviewable PDF");
  return reviewed.review;
}

describe("IRS full draft → stored PDF review → explicit approval (mock storage, no providers)", () => {
  it("assembles real PDF bytes and only records approval after exact review", async () => {
    const state = setup();
    const review = await persistAndReview(state);
    expect(new TextDecoder().decode(review.pdfBytes.slice(0, 5))).toBe("%PDF-");
    expect(createHash("sha256").update(review.pdfBytes).digest("hex")).toBe(review.packetSha256);
    expect(state.approvals.size).toBe(0);
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
    const result = await irsGeneralDefinition.approveOwnedDraft({
      ownerId, matterId, draftId: review.draftId,
      reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      caseStore: state.caseStore, documentStore: state.documentStore,
      draftStore: state.draftStore, approvalStore: state.approvalStore,
    });
    expect(result.approved).toBe(true);
    expect(state.approvals.size).toBe(1);
    expect(state.readRecordedApproval).toHaveBeenCalledTimes(1);
    if (result.approved) {
      expect(result.approval.status).toBe("recorded_approval_no_payment_or_mailing");
      expect(Object.keys(result.approval)).not.toContain("paymentId");
      expect(Object.keys(result.approval)).not.toContain("mailingId");
    }
  });

  it("preserves multi-page physical-mail PDF integrity from draft through exact approval", async () => {
    const state = setup();
    // A long but valid IRS response must flow through the real page-wrapping
    // renderer, immutable draft readback and owner-scoped approval boundary.
    // No provider is called; approval alone must never authorize a mailing.
    state.setResponseBody(
      Array.from({ length: 160 }, (_, index) =>
        `Detailed supporting explanation ${index + 1}.`).join("\n"),
    );
    const review = await persistAndReview(state);
    const pages = await inspectPacketPdfPageCount(review.pdfBytes);
    expect(pages).toBeGreaterThanOrEqual(3);
    expect(createHash("sha256").update(review.pdfBytes).digest("hex"))
      .toBe(review.packetSha256);
    expect(state.approvals.size).toBe(0);

    const approved = await irsGeneralDefinition.approveOwnedDraft({
      ownerId, matterId, draftId: review.draftId,
      reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      caseStore: state.caseStore, documentStore: state.documentStore,
      draftStore: state.draftStore, approvalStore: state.approvalStore,
    });
    expect(approved.approved).toBe(true);
    if (!approved.approved) throw new Error("Expected exact-PDF approval");
    expect(approved.approval.packetSha256).toBe(review.packetSha256);
    expect(approved.approval.status).toBe("recorded_approval_no_payment_or_mailing");
    expect(state.approvals.size).toBe(1);
  });

  it("keeps the exact reviewed packet approvable after the wall clock advances", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-29T10:00:00.000Z"));
      const state = setup();
      const review = await persistAndReview(state);
      vi.setSystemTime(new Date("2026-11-02T10:00:00.000Z"));
      const result = await irsGeneralDefinition.approveOwnedDraft({
        ownerId, matterId, draftId: review.draftId,
        reviewedPacketSha256: review.packetSha256,
        reviewedRecipientAddress: review.recipientAddress,
        caseStore: state.caseStore, documentStore: state.documentStore,
        draftStore: state.draftStore, approvalStore: state.approvalStore,
      });
      expect(result.approved).toBe(true);
      expect(state.approvals.size).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses exact-PDF approval when response text changes without a revision bump", async () => {
    const state = setup();
    const review = await persistAndReview(state);
    // A broken or delayed revision writer must not let edited letter content
    // inherit the user's approval of the previously rendered physical packet.
    state.setResponseBody("This replacement response was never reviewed or approved.");
    const result = await irsGeneralDefinition.approveOwnedDraft({
      ownerId, matterId, draftId: review.draftId,
      reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      caseStore: state.caseStore, documentStore: state.documentStore,
      draftStore: state.draftStore, approvalStore: state.approvalStore,
    });
    expect(result.approved).toBe(false);
    expect(result.blockers).toContain("draft_packet_changed");
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
    expect(state.approvals.size).toBe(0);
  });

  it("rejects approval if the case revision changes after review", async () => {
    const state = setup();
    const review = await persistAndReview(state);
    state.advanceRevision();
    const result = await irsGeneralDefinition.approveOwnedDraft({
      ownerId, matterId, draftId: review.draftId,
      reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      caseStore: state.caseStore, documentStore: state.documentStore,
      draftStore: state.draftStore, approvalStore: state.approvalStore,
    });
    expect(result.approved).toBe(false);
    expect(state.approvals.size).toBe(0);
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("rejects another owner and a corrupted PDF before approval", async () => {
    const state = setup();
    const review = await persistAndReview(state);
    const foreign = await irsGeneralDefinition.loadOwnedDraftForReview({
      ownerId: "owner-b", matterId, draftId: review.draftId,
      caseStore: state.caseStore, draftStore: state.draftStore,
    });
    expect(foreign.ready).toBe(false);
    state.corruptStoredPdf();
    const result = await irsGeneralDefinition.approveOwnedDraft({
      ownerId, matterId, draftId: review.draftId,
      reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      caseStore: state.caseStore, documentStore: state.documentStore,
      draftStore: state.draftStore, approvalStore: state.approvalStore,
    });
    expect(result.approved).toBe(false);
    expect(state.approvals.size).toBe(0);
  });

  it("rejects a recipient change after the user reviewed the original PDF", async () => {
    const state = setup();
    const review = await persistAndReview(state);
    state.changeRecipient();
    const result = await irsGeneralDefinition.approveOwnedDraft({
      ownerId, matterId, draftId: review.draftId,
      reviewedPacketSha256: review.packetSha256,
      reviewedRecipientAddress: review.recipientAddress,
      caseStore: state.caseStore, documentStore: state.documentStore,
      draftStore: state.draftStore, approvalStore: state.approvalStore,
    });
    expect(result.approved).toBe(false);
    expect(state.approvals.size).toBe(0);
  });
});
