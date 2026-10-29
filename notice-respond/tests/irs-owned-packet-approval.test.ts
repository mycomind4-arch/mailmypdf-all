import { describe, expect, it, vi } from "vitest";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";
import {
  approveIrsGeneralOwnedDraft,
  type IrsGeneralOwnedApprovalStore,
} from "../workflows/irs-notice-response/owned-packet-approval";
import { prepareIrsGeneralOwnedPacketPreview } from "../workflows/irs-notice-response/owned-packet-preview";

const recipient = "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714";
const letterInput = {
  mail: {
    noticeDocumentId: "notice-current",
    analyzedNoticeDocumentId: "notice-current",
    noticeSha256: "a".repeat(64),
    analyzedNoticeSha256: "a".repeat(64),
    noticeStatus: "active" as const,
    responsePath: "mail" as const,
    instructionsConfirmed: true,
    mailPermitted: true,
    requiresDifferentProcedure: false,
    recipientAddress: recipient,
    recipientAddressSource: "controlling_notice" as const,
    recipientAddressConfirmed: true,
    confirmedRecipientAddress: recipient,
    confirmedRecipientNoticeSha256: "a".repeat(64),
    confirmedRecipientAddressSource: "controlling_notice" as const,
    confirmedRecipientResponsePath: "mail" as const,
  },
  taxpayerName: "Example Taxpayer",
  returnAddress: "100 Example St\nEureka, CA 95501",
  responseBody: "Please review the enclosed response.",
};

async function setup() {
  const snapshot = {
    revision: "rev-1",
    letterInput,
    selectedEnclosureDocumentIds: [] as readonly string[],
  };
  const loadOwnedCaseSnapshot = vi.fn(async () => snapshot);
  const loadEligibleDocuments = vi.fn(async () => []);
  const documentStore: PacketStorageAdapter = {
    loadEligibleDocuments,
    createSignedReadUrl: vi.fn(async () => { throw new Error("No enclosures"); }),
    persistMeasuredPageCount: vi.fn(async () => { throw new Error("No writes"); }),
  };
  const previewResult = await prepareIrsGeneralOwnedPacketPreview({
    ownerId: "owner-a", matterId: "matter-a",
    caseStore: { loadOwnedCaseSnapshot }, documentStore,
  });
  if (!previewResult.ready) throw new Error("Expected a real assembled IRS PDF");
  const preview = previewResult.preview;
  const stored = {
    ownerId: "owner-a",
    matterId: "matter-a",
    draftId: "draft-1",
    caseRevision: "rev-1",
    packetSha256: preview.packetSha256,
    pdfBytes: preview.pdfBytes.slice(),
    noticeSha256: preview.sourceNoticeSha256,
    recipientAddress: preview.recipientAddress,
    selectedEnclosureDocumentIds: [] as readonly string[],
    manifest: [...preview.manifest],
  };
  const readPersistedDraft = vi.fn(async (_query: {
    ownerId: string; matterId: string; draftId: string;
  }) => stored);
  const approveDraftIfCurrent = vi.fn(async (request:
    Parameters<IrsGeneralOwnedApprovalStore["approveDraftIfCurrent"]>[0],
  ) => ({
    ownerId: request.ownerId,
    matterId: request.matterId,
    draftId: request.draftId,
    approvalId: "approval-1",
    caseRevision: request.expectedCaseRevision,
    packetSha256: request.expectedPacketSha256,
  }));
  const input = {
    ownerId: "owner-a",
    matterId: "matter-a",
    draftId: "draft-1",
    reviewedPacketSha256: preview.packetSha256,
    reviewedRecipientAddress: recipient,
    caseStore: { loadOwnedCaseSnapshot },
    documentStore,
    draftStore: { readPersistedDraft },
    approvalStore: { approveDraftIfCurrent },
  };
  loadOwnedCaseSnapshot.mockClear();
  loadEligibleDocuments.mockClear();
  return { input, snapshot, stored, preview, loadOwnedCaseSnapshot,
    loadEligibleDocuments, readPersistedDraft, approveDraftIfCurrent };
}

describe("IRS owner-scoped exact-PDF human approval (no payment or mailing)", () => {
  it("reassembles the real PDF, rechecks current case, and records exact approval via CAS", async () => {
    const state = await setup();
    const result = await approveIrsGeneralOwnedDraft(state.input);
    expect(result.approved).toBe(true);
    if (!result.approved) throw new Error("Expected approved draft");
    expect(result.approval.status).toBe("recorded_approval_no_payment_or_mailing");
    expect(result.approval.packetSha256).toBe(state.preview.packetSha256);
    expect(Object.keys(result.approval)).not.toContain("mailingId");
    expect(Object.keys(result.approval)).not.toContain("paymentId");
    expect(state.readPersistedDraft).toHaveBeenCalledWith({
      ownerId: "owner-a", matterId: "matter-a", draftId: "draft-1",
    });
    expect(state.loadOwnedCaseSnapshot).toHaveBeenCalledTimes(3);
    expect(state.approveDraftIfCurrent).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "owner-a",
      matterId: "matter-a",
      draftId: "draft-1",
      expectedCaseRevision: "rev-1",
      expectedNoticeSha256: "a".repeat(64),
      expectedRecipientAddress: recipient,
      expectedEnclosureDocumentIds: [],
      expectedManifest: [],
      expectedPacketSha256: state.preview.packetSha256,
      reviewedPacketSha256: state.preview.packetSha256,
    }));
  });

  it("rejects a changed reviewed digest or recipient before approval", async () => {
    for (const mismatch of [
      { reviewedPacketSha256: "b".repeat(64) },
      { reviewedRecipientAddress: "Wrong destination" },
      { reviewedPacketSha256: "" },
    ]) {
      const state = await setup();
      const result = await approveIrsGeneralOwnedDraft({ ...state.input, ...mismatch });
      expect(result.approved).toBe(false);
      expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
    }
  });

  it("rejects a stored PDF modified after its digest was recorded", async () => {
    const state = await setup();
    const bytes = state.stored.pdfBytes.slice();
    bytes[0] = bytes[0] === 0x25 ? 0x26 : 0x25;
    state.readPersistedDraft.mockResolvedValueOnce({ ...state.stored, pdfBytes: bytes });
    const result = await approveIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ approved: false, blockers: ["draft_integrity_failed"], approval: null });
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("rejects a changed case revision even when the letter is unchanged", async () => {
    const state = await setup();
    state.loadOwnedCaseSnapshot.mockResolvedValueOnce({ ...state.snapshot, revision: "rev-2" });
    const result = await approveIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ approved: false, blockers: ["draft_case_changed"], approval: null });
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("rejects a revision advanced after the packet was reassembled", async () => {
    const state = await setup();
    state.loadOwnedCaseSnapshot
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce({ ...state.snapshot, revision: "rev-2" });
    const result = await approveIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ approved: false, blockers: ["draft_case_changed"], approval: null });
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("rejects changed notice, recipient, or enclosure metadata on stored readback", async () => {
    for (const mismatch of [
      { noticeSha256: "b".repeat(64) },
      { recipientAddress: "Other office\nP.O. Box 55\nAustin, TX 78714" },
      { selectedEnclosureDocumentIds: ["extra"] },
      { manifest: [{ documentId: "extra" }] },
    ]) {
      const state = await setup();
      state.readPersistedDraft.mockResolvedValueOnce({ ...state.stored, ...mismatch } as never);
      const result = await approveIrsGeneralOwnedDraft(state.input);
      expect(result.approved).toBe(false);
      expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
    }
  });

  it("refuses approval when scanned-document eligibility cannot be rechecked", async () => {
    const state = await setup();
    state.loadEligibleDocuments.mockRejectedValueOnce(new Error("Scanner unavailable"));
    const result = await approveIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ approved: false, blockers: ["owned_packet_storage_unavailable"], approval: null });
    expect(state.approveDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("fails closed on an atomic approval conflict or unverified receipt", async () => {
    const conflict = await setup();
    conflict.approveDraftIfCurrent.mockResolvedValueOnce(null as never);
    expect(await approveIrsGeneralOwnedDraft(conflict.input)).toEqual({
      approved: false, blockers: ["draft_case_changed"], approval: null,
    });

    const wrongOwner = await setup();
    wrongOwner.approveDraftIfCurrent.mockResolvedValueOnce({
      ownerId: "owner-b", matterId: "matter-a", draftId: "draft-1",
      approvalId: "approval-1", caseRevision: "rev-1",
      packetSha256: wrongOwner.preview.packetSha256,
    });
    expect(await approveIrsGeneralOwnedDraft(wrongOwner.input)).toEqual({
      approved: false, blockers: ["approval_persistence_unverified"], approval: null,
    });
  });

  it("is discoverable through the canonical IRS definition, without provider calls", async () => {
    const state = await setup();
    const result = await irsGeneralDefinition.approveOwnedDraft(state.input);
    expect(result.approved).toBe(true);
  });
});
