import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { inspectPacketPdfPageCount } from "@mailmypdf/packet-builder";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";
import { prepareIrsGeneralOwnedPacketPreview } from "../workflows/irs-notice-response/owned-packet-preview";
import { loadIrsGeneralOwnedDraftForReview } from "../workflows/irs-notice-response/owned-packet-review";

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
    revision: "rev-1", letterInput,
    selectedEnclosureDocumentIds: [] as readonly string[],
  };
  const loadOwnedCaseSnapshot = vi.fn(async () => snapshot);
  const documentStore: PacketStorageAdapter = {
    loadEligibleDocuments: vi.fn(async () => []),
    createSignedReadUrl: vi.fn(async () => { throw new Error("No enclosures"); }),
    persistMeasuredPageCount: vi.fn(async () => { throw new Error("No writes"); }),
  };
  const assembled = await prepareIrsGeneralOwnedPacketPreview({
    ownerId: "owner-a", matterId: "matter-a",
    caseStore: { loadOwnedCaseSnapshot }, documentStore,
  });
  if (!assembled.ready) throw new Error("Expected a real assembled IRS PDF");
  const preview = assembled.preview;
  const stored = {
    ownerId: "owner-a", matterId: "matter-a", draftId: "draft-1",
    caseRevision: "rev-1", packetSha256: preview.packetSha256,
    pdfBytes: preview.pdfBytes.slice(), noticeSha256: preview.sourceNoticeSha256,
    recipientAddress: preview.recipientAddress,
    selectedEnclosureDocumentIds: [] as readonly string[],
    manifest: [...preview.manifest],
  };
  const readPersistedDraft = vi.fn(async (_query: {
    ownerId: string; matterId: string; draftId: string;
  }) => stored);
  const input = {
    ownerId: "owner-a", matterId: "matter-a", draftId: "draft-1",
    caseStore: { loadOwnedCaseSnapshot }, draftStore: { readPersistedDraft },
  };
  loadOwnedCaseSnapshot.mockClear();
  return { input, snapshot, stored, preview, loadOwnedCaseSnapshot, readPersistedDraft };
}

describe("IRS exact-PDF owner-scoped human review readback", () => {
  it("returns the actual PDF without any approval, payment or mailing", async () => {
    const state = await setup();
    const result = await irsGeneralDefinition.loadOwnedDraftForReview(state.input);
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected reviewable PDF");
    expect(result.review.pdfBytes).toEqual(state.preview.pdfBytes);
    expect(result.review.packetSha256).toBe(state.preview.packetSha256);
    expect(result.review.recipientAddress).toBe(recipient);
    expect(result.review.status).toBe("requires_explicit_human_review_no_payment_or_mailing");
    expect(Object.keys(result.review)).not.toContain("approvalId");
    expect(Object.keys(result.review)).not.toContain("paymentId");
    expect(Object.keys(result.review)).not.toContain("mailingId");
    expect(state.loadOwnedCaseSnapshot).toHaveBeenCalledTimes(2);
    expect(state.readPersistedDraft).toHaveBeenCalledWith({
      ownerId: "owner-a", matterId: "matter-a", draftId: "draft-1",
    });
    expect(result.review.pdfBytes).not.toBe(state.stored.pdfBytes);
    result.review.pdfBytes[0] = 0;
    expect(state.stored.pdfBytes[0]).toBe(0x25);
  });

  it("rejects invalid IDs, missing stores and cross-owner receipts", async () => {
    const state = await setup();
    for (const change of [
      { ownerId: "../owner" }, { matterId: "" }, { draftId: "a/b" },
      { caseStore: {} as never }, { draftStore: {} as never },
    ]) {
      expect((await loadIrsGeneralOwnedDraftForReview({ ...state.input, ...change })).ready).toBe(false);
    }
    for (const change of [
      { ownerId: "owner-b" }, { matterId: "matter-b" }, { draftId: "draft-b" },
    ]) {
      state.readPersistedDraft.mockResolvedValueOnce({ ...state.stored, ...change });
      expect((await loadIrsGeneralOwnedDraftForReview(state.input)).ready).toBe(false);
    }
  });

  it("rejects unavailable, corrupted and mismatched stored PDFs", async () => {
    for (const failure of ["missing", "error", "header", "digest", "empty"]) {
      const state = await setup();
      if (failure === "missing") state.readPersistedDraft.mockResolvedValueOnce(null as never);
      if (failure === "error") state.readPersistedDraft.mockRejectedValueOnce(new Error("Storage down"));
      if (failure === "header") {
        const pdfBytes = state.stored.pdfBytes.slice();
        pdfBytes[0] = 0;
        state.readPersistedDraft.mockResolvedValueOnce({ ...state.stored, pdfBytes });
      }
      if (failure === "digest") {
        state.readPersistedDraft.mockResolvedValueOnce({
          ...state.stored, packetSha256: "b".repeat(64),
        });
      }
      if (failure === "empty") {
        state.readPersistedDraft.mockResolvedValueOnce({
          ...state.stored, pdfBytes: new Uint8Array(),
        });
      }
      expect((await loadIrsGeneralOwnedDraftForReview(state.input)).ready).toBe(false);
    }
  });

  it("rejects a malformed PDF even when its stored digest matches its bytes", async () => {
    const state = await setup();
    const pdfBytes = new TextEncoder().encode("%PDF-1.4\\nnot a readable PDF");
    const packetSha256 = createHash("sha256").update(pdfBytes).digest("hex");
    state.readPersistedDraft.mockResolvedValueOnce({
      ...state.stored, pdfBytes, packetSha256,
    });
    expect(await loadIrsGeneralOwnedDraftForReview(state.input)).toEqual({
      ready: false, blockers: ["draft_integrity_failed"], review: null,
    });
  });

  it("rejects a packet with no room for the claimed enclosure pages", async () => {
    const state = await setup();
    state.loadOwnedCaseSnapshot.mockImplementation(async () => ({
      ...state.snapshot, selectedEnclosureDocumentIds: ["doc-a"],
    }));
    const pageCount = await inspectPacketPdfPageCount(state.preview.pdfBytes);
    state.readPersistedDraft.mockResolvedValueOnce({
      ...state.stored,
      selectedEnclosureDocumentIds: ["doc-a"],
      manifest: [{
        documentId: "doc-a", role: "evidence", evidenceKind: "correspondence",
        filename: "evidence.pdf", sha256: "b".repeat(64), pageCount,
      }],
    });
    expect(await loadIrsGeneralOwnedDraftForReview(state.input)).toEqual({
      ready: false, blockers: ["draft_integrity_failed"], review: null,
    });
  });

  it("rejects stale revisions, changed notices, destinations and enclosures", async () => {
    for (const change of [
      { caseRevision: "rev-0" }, { noticeSha256: "b".repeat(64) },
      { recipientAddress: "Other IRS address" },
      { selectedEnclosureDocumentIds: ["new"] }, { manifest: null },
    ]) {
      const state = await setup();
      state.readPersistedDraft.mockResolvedValueOnce({ ...state.stored, ...change } as never);
      expect((await loadIrsGeneralOwnedDraftForReview(state.input)).ready).toBe(false);
    }
    const changed = await setup();
    changed.loadOwnedCaseSnapshot
      .mockResolvedValueOnce(changed.snapshot)
      .mockResolvedValueOnce({ ...changed.snapshot, revision: "rev-2" });
    expect(await loadIrsGeneralOwnedDraftForReview(changed.input)).toEqual({
      ready: false, blockers: ["draft_case_changed"], review: null,
    });
  });

  it("rejects forged or extra enclosure labels even when the PDF hash is valid", async () => {
    const state = await setup();
    const forged = {
      documentId: "not-selected", role: "evidence" as const,
      evidenceKind: "correspondence", filename: "not-enclosed.pdf",
      sha256: "b".repeat(64), pageCount: 1,
    };
    for (const manifest of [[forged], [forged, forged], [null]]) {
      state.readPersistedDraft.mockResolvedValueOnce({
        ...state.stored, manifest,
      } as never);
      expect(await loadIrsGeneralOwnedDraftForReview(state.input)).toEqual({
        ready: false, blockers: ["draft_packet_changed"], review: null,
      });
    }
  });

  it("rejects malformed or mismatched metadata for selected enclosures", async () => {
    const state = await setup();
    state.loadOwnedCaseSnapshot.mockImplementation(async () => ({
      ...state.snapshot, selectedEnclosureDocumentIds: ["doc-a"],
    }));
    const valid = {
      documentId: "doc-a", role: "evidence" as const,
      evidenceKind: "correspondence", filename: "evidence.pdf",
      sha256: "b".repeat(64), pageCount: 1,
    };
    for (const entry of [
      { ...valid, documentId: "doc-b" },
      { ...valid, role: "subject_notice" },
      { ...valid, filename: "" },
      { ...valid, sha256: "not-a-digest" },
      { ...valid, pageCount: 0 },
      { ...valid, evidenceKind: undefined },
    ]) {
      state.readPersistedDraft.mockResolvedValueOnce({
        ...state.stored, selectedEnclosureDocumentIds: ["doc-a"],
        manifest: [entry],
      } as never);
      expect(await loadIrsGeneralOwnedDraftForReview(state.input)).toEqual({
        ready: false, blockers: ["draft_packet_changed"], review: null,
      });
    }
  });

  it("rejects unsafe enclosure labels in persisted customer-review metadata", async () => {
    const state = await setup();
    state.loadOwnedCaseSnapshot.mockImplementation(async () => ({
      ...state.snapshot, selectedEnclosureDocumentIds: ["doc-a"],
    }));
    const validEntry = {
      documentId: "doc-a", role: "evidence" as const,
      evidenceKind: "correspondence", filename: "evidence.pdf",
      sha256: "b".repeat(64), pageCount: 1,
    };
    // A matching PDF hash does not authenticate separately stored labels.
    // The exact PDF approval reassembly happens later; review must also
    // refuse deceptive labels before displaying them to a customer.
    for (const filename of [
      "bad\\nname.pdf", "../../escape.pdf", "folder\\\\name.pdf",
      "file\\u202Efdp", "name\\u200b.pdf", "a".repeat(49), "   ",
    ]) {
      state.readPersistedDraft.mockResolvedValueOnce({
        ...state.stored,
        selectedEnclosureDocumentIds: ["doc-a"],
        manifest: [{ ...validEntry, filename }],
      });
      expect(await loadIrsGeneralOwnedDraftForReview(state.input)).toEqual({
        ready: false, blockers: ["draft_packet_changed"], review: null,
      });
    }
  });

  it("rejects a case whose notice no longer permits mailed correspondence", async () => {
    const state = await setup();
    state.loadOwnedCaseSnapshot.mockImplementation(async () => ({
      ...state.snapshot,
      letterInput: { ...letterInput, mail: { ...letterInput.mail, mailPermitted: false } },
    }));
    expect((await loadIrsGeneralOwnedDraftForReview(state.input)).ready).toBe(false);
  });
});
