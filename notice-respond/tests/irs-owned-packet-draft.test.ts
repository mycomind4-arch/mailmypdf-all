import { createHash } from "node:crypto";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";
import { describe, expect, it, vi } from "vitest";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";
import type { IrsGeneralLetterPreviewInput } from "../workflows/irs-notice-response/letter-preview";
import {
  prepareAndPersistIrsGeneralOwnedDraft,
  type IrsGeneralDraftPersistenceRequest,
  type IrsGeneralOwnedDraftStore,
} from "../workflows/irs-notice-response/owned-packet-draft";

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
  responseBody: "Please review this IRS notice response.",
};

function setup() {
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
    persistMeasuredPageCount: vi.fn(async () => { throw new Error("Draft only"); }),
  };
  const persistDraftIfCurrent = vi.fn(async (request: IrsGeneralDraftPersistenceRequest) => ({
    ownerId: request.ownerId,
    matterId: request.matterId,
    draftId: "draft-1",
    packetSha256: request.packetSha256,
    caseRevision: request.expectedCaseRevision,
  }));
  const makeReadback = (query: { ownerId: string; matterId: string; draftId: string }) => {
    const request = persistDraftIfCurrent.mock.calls[0]?.[0];
    if (!request) throw new Error("No persisted PDF to read");
    return {
      ownerId: query.ownerId,
      matterId: query.matterId,
      draftId: query.draftId,
      packetSha256: request.packetSha256,
      caseRevision: request.expectedCaseRevision,
      pdfBytes: request.pdfBytes.slice(),
    };
  };
  const readPersistedDraft = vi.fn(async (query: {
    ownerId: string; matterId: string; draftId: string;
  }) => makeReadback(query));
  const draftStore: IrsGeneralOwnedDraftStore = { persistDraftIfCurrent, readPersistedDraft };
  return {
    snapshot,
    makeReadback,
    readPersistedDraft,
    loadOwnedCaseSnapshot,
    loadEligibleDocuments,
    persistDraftIfCurrent,
    input: {
      ownerId: "owner-a",
      matterId: "matter-a",
      caseStore: { loadOwnedCaseSnapshot },
      documentStore,
      draftStore,
    },
  };
}

describe("general IRS exact-PDF draft persistence (no approval or mailing)", () => {
  it("persists exact bytes and digest under an owner-scoped revision CAS", async () => {
    const state = setup();
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result.persisted).toBe(true);
    if (!result.persisted) throw new Error("Expected a persisted draft");
    expect(result.draft.status).toBe("persisted_draft_requires_explicit_approval");
    expect(result.draft.caseRevision).toBe("rev-1");
    expect(state.persistDraftIfCurrent).toHaveBeenCalledTimes(1);
    expect(state.readPersistedDraft).toHaveBeenCalledExactlyOnceWith({
      ownerId: "owner-a", matterId: "matter-a", draftId: "draft-1",
    });
    const request = state.persistDraftIfCurrent.mock.calls[0]![0];
    expect(request.ownerId).toBe("owner-a");
    expect(request.matterId).toBe("matter-a");
    expect(request.expectedCaseRevision).toBe("rev-1");
    expect(request.expectedNoticeSha256).toBe("a".repeat(64));
    expect(request.expectedRecipientAddress).toBe(recipient);
    expect(request.expectedEnclosureDocumentIds).toEqual([]);
    expect(request.manifest).toEqual([]);
    expect(request.packetSha256).toBe(createHash("sha256").update(request.pdfBytes).digest("hex"));
    expect(result.draft.packetSha256).toBe(request.packetSha256);
    expect(Object.keys(result.draft)).not.toContain("approvalId");
    expect(Object.keys(result.draft)).not.toContain("mailingId");
    expect(state.loadOwnedCaseSnapshot).toHaveBeenCalledTimes(4);
  });

  it("refuses to build a draft without a trusted case revision", async () => {
    const state = setup();
    state.loadOwnedCaseSnapshot.mockResolvedValueOnce({
      ...state.snapshot,
      revision: "" ,
    });
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["case_revision_unavailable"], draft: null });
    expect(state.loadEligibleDocuments).not.toHaveBeenCalled();
    expect(state.persistDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("rejects an atomic compare-and-set conflict without issuing a draft", async () => {
    const state = setup();
    state.persistDraftIfCurrent.mockResolvedValueOnce(null as never);
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_case_changed"], draft: null });
  });

  it("fails closed on an uncertain persistence write", async () => {
    const state = setup();
    state.persistDraftIfCurrent.mockRejectedValueOnce(new Error("DB timeout"));
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
  });

  it("refuses a receipt for another owner, matter, digest, or revision", async () => {
    for (const mismatch of [
      { ownerId: "owner-b" },
      { matterId: "matter-b" },
      { packetSha256: "b".repeat(64) },
      { caseRevision: "rev-2" },
    ]) {
      const state = setup();
      state.persistDraftIfCurrent.mockImplementationOnce(async (request) => ({
        ownerId: request.ownerId,
        matterId: request.matterId,
        draftId: "draft-1",
        packetSha256: request.packetSha256,
        caseRevision: request.expectedCaseRevision,
        ...mismatch,
      }));
      const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
      expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
    }
  });

  it("refuses a receipt that omits owner/matter identity", async () => {
    const state = setup();
    state.persistDraftIfCurrent.mockImplementationOnce(async (request) => ({
      draftId: "draft-1",
      packetSha256: request.packetSha256,
      caseRevision: request.expectedCaseRevision,
    } as never));
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
  });

  it("does not persist a PDF if the owner-scoped response changes during assembly", async () => {
    const state = setup();
    state.loadOwnedCaseSnapshot
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce({
        ...state.snapshot,
        letterInput: { ...letterInput, responseBody: "Changed while rendering." },
      });
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["owned_case_changed"], draft: null });
    expect(state.persistDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("rejects a revision change after packet assembly even if the letter is identical", async () => {
    const state = setup();
    state.loadOwnedCaseSnapshot
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce({ ...state.snapshot, revision: "rev-2" });
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_case_changed"], draft: null });
    expect(state.persistDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("rejects a packet-relevant edit after the preview's last read", async () => {
    const state = setup();
    state.loadOwnedCaseSnapshot
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce({
        ...state.snapshot,
        letterInput: { ...letterInput, responseBody: "New text after preview." },
      });
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_case_changed"], draft: null });
    expect(state.persistDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("fails closed when the final revision check is unavailable", async () => {
    const state = setup();
    state.loadOwnedCaseSnapshot
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockResolvedValueOnce(state.snapshot)
      .mockRejectedValueOnce(new Error("Database read failed"));
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_case_changed"], draft: null });
    expect(state.persistDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("requires a trusted owner-scoped PDF readback adapter", async () => {
    const state = setup();
    const result = await prepareAndPersistIrsGeneralOwnedDraft({
      ...state.input,
      draftStore: { persistDraftIfCurrent: state.persistDraftIfCurrent } as never,
    });
    expect(result).toEqual({ persisted: false, blockers: ["owned_case_unavailable"], draft: null });
    expect(state.persistDraftIfCurrent).not.toHaveBeenCalled();
  });

  it("refuses a receipt without independently readable persisted bytes", async () => {
    const state = setup();
    state.readPersistedDraft.mockResolvedValueOnce(null as never);
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
    expect(state.readPersistedDraft).toHaveBeenCalledTimes(1);
  });

  it("fails closed if the immutable PDF readback fails", async () => {
    const state = setup();
    state.readPersistedDraft.mockRejectedValueOnce(new Error("Object store timeout"));
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
  });

  it("rejects wrong owner, matter, draft, revision, or digest on stored readback", async () => {
    for (const mismatch of [
      { ownerId: "owner-b" },
      { matterId: "matter-b" },
      { draftId: "draft-b" },
      { caseRevision: "rev-2" },
      { packetSha256: "b".repeat(64) },
    ]) {
      const state = setup();
      state.readPersistedDraft.mockImplementationOnce(async (query) => ({
        ...state.makeReadback(query),
        ...mismatch,
      }));
      const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
      expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
    }
  });

  it("rejects corrupted or missing stored PDF bytes despite a matching receipt", async () => {
    for (const pdfBytes of [new Uint8Array([1, 2, 3]), null]) {
      const state = setup();
      state.readPersistedDraft.mockImplementationOnce(async (query) => ({
        ...state.makeReadback(query),
        pdfBytes,
      } as never));
      const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
      expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
    }
  });

  it("rejects same-length tampered PDF bytes with a matching stored hash claim", async () => {
    const state = setup();
    state.readPersistedDraft.mockImplementationOnce(async (query) => {
      const readback = state.makeReadback(query);
      const pdfBytes = readback.pdfBytes.slice();
      pdfBytes[0] = pdfBytes[0] === 0x25 ? 0x26 : 0x25;
      return { ...readback, pdfBytes };
    });
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result).toEqual({ persisted: false, blockers: ["draft_persistence_unverified"], draft: null });
  });

  it("does not read a draft after a failed compare-and-set write", async () => {
    const state = setup();
    state.persistDraftIfCurrent.mockResolvedValueOnce(null as never);
    const result = await prepareAndPersistIrsGeneralOwnedDraft(state.input);
    expect(result.persisted).toBe(false);
    expect(state.readPersistedDraft).not.toHaveBeenCalled();
  });

  it("exposes persisted draft through the canonical IRS workflow definition", async () => {
    // The factory/host must be able to reach the real persistence boundary
    // through the registered workflow definition, not just a direct import.
    const state = setup();
    const result = await irsGeneralDefinition.prepareAndPersistOwnedDraft(state.input);
    expect(result.persisted).toBe(true);
    if (!result.persisted) throw new Error("Expected a persisted draft");
    expect(result.draft.status).toBe("persisted_draft_requires_explicit_approval");
    expect(state.persistDraftIfCurrent).toHaveBeenCalledTimes(1);
    expect(Object.keys(result.draft)).not.toContain("approvalId");
    expect(Object.keys(result.draft)).not.toContain("mailingId");
  });

});
