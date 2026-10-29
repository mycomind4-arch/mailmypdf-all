import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { generatePlainTextPdf, type PacketDocumentRow } from "@mailmypdf/packet-builder";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";
import {
  prepareIrsGeneralOwnedPacketPreview,
  type IrsGeneralOwnedCaseStore,
  type IrsGeneralOwnedPacketSnapshot,
} from "../workflows/irs-notice-response/owned-packet-preview";

const recipient = "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714";
const letterInput = {
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
  responseBody: "Please review the enclosed records.",
} as const;

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function record(bytes: Uint8Array, overrides: Partial<PacketDocumentRow> = {}): PacketDocumentRow {
  return {
    document_id: "record-a",
    role: "evidence",
    evidence_kind: "supporting_record",
    page_count: 1,
    position: 0,
    sha256: sha(bytes),
    storage_path: "owner-a/record-a.pdf",
    safe_filename: "record-a.pdf",
    mime_type: "application/pdf",
    ...overrides,
  };
}

function setup(bytes: Uint8Array, selectedIds: readonly string[] = ["record-a"]) {
  const snapshot: IrsGeneralOwnedPacketSnapshot = {
    letterInput,
    selectedEnclosureDocumentIds: selectedIds,
  };
  const loadOwnedCaseSnapshot = vi.fn(async () => snapshot);
  const loadEligibleDocuments = vi.fn(async () => [record(bytes)]);
  const createSignedReadUrl = vi.fn(async () => "https://signed.invalid/record-a");
  const persistMeasuredPageCount = vi.fn(async () => {
    throw new Error("Draft preview must not persist measured page counts");
  });
  const fetchImpl = vi.fn(async () => new Response(new Uint8Array(bytes).buffer)) as unknown as typeof fetch;
  const caseStore: IrsGeneralOwnedCaseStore = { loadOwnedCaseSnapshot };
  const documentStore: PacketStorageAdapter = {
    loadEligibleDocuments,
    createSignedReadUrl,
    persistMeasuredPageCount,
  };
  return {
    snapshot,
    caseStore,
    documentStore,
    loadOwnedCaseSnapshot,
    loadEligibleDocuments,
    createSignedReadUrl,
    persistMeasuredPageCount,
    fetchImpl,
    input: {
      ownerId: "owner-a",
      matterId: "matter-a",
      caseStore,
      documentStore,
      storageOptions: { fetchImpl },
    },
  };
}

describe("general IRS owner-scoped draft packet preparation", () => {
  it("assembles exact PDF bytes from persisted selections and owner-scoped scanned records", async () => {
    const bytes = await generatePlainTextPdf("Supporting record");
    const state = setup(bytes);
    const result = await prepareIrsGeneralOwnedPacketPreview(state.input);
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected draft packet");
    expect(result.preview.status).toBe("draft_packet_preview_only");
    expect(result.preview.packetSha256).toBe(sha(result.preview.pdfBytes));
    expect(result.preview.manifest.map((row) => row.documentId)).toEqual(["record-a"]);
    expect(state.loadOwnedCaseSnapshot).toHaveBeenCalledWith({ ownerId: "owner-a", matterId: "matter-a" });
    expect(state.loadEligibleDocuments).toHaveBeenCalledWith({ ownerId: "owner-a", matterId: "matter-a" });
    expect(state.createSignedReadUrl).toHaveBeenCalledWith({
      ownerId: "owner-a",
      storagePath: "owner-a/record-a.pdf",
      expiresInSeconds: 60,
    });
    expect(state.fetchImpl).toHaveBeenCalledTimes(1);
    expect(state.persistMeasuredPageCount).not.toHaveBeenCalled();
    expect(Object.keys(result.preview)).not.toContain("approvalId");
  });

  it("does not read case documents when the owner-scoped case is unavailable", async () => {
    const state = setup(await generatePlainTextPdf("Record"));
    state.loadOwnedCaseSnapshot.mockResolvedValueOnce(null as never);
    const result = await prepareIrsGeneralOwnedPacketPreview(state.input);
    expect(result).toEqual({ ready: false, blockers: ["owned_case_unavailable"], preview: null });
    expect(state.loadEligibleDocuments).not.toHaveBeenCalled();
    expect(state.fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects duplicate or missing persisted enclosure IDs before storage reads", async () => {
    const bytes = await generatePlainTextPdf("Record");
    for (const selected of [["record-a", "record-a"], ["unknown"]]) {
      const state = setup(bytes, selected);
      const result = await prepareIrsGeneralOwnedPacketPreview(state.input);
      expect(result.ready).toBe(false);
      expect(result.blockers).toContain(selected.length === 2
        ? "enclosure_selection_invalid" : "enclosure_not_eligible");
      expect(state.fetchImpl).not.toHaveBeenCalled();
      expect(state.createSignedReadUrl).not.toHaveBeenCalled();
    }
  });

  it("rejects foreign-owner and path-traversal objects before signing a read", async () => {
    const bytes = await generatePlainTextPdf("Record");
    for (const storage_path of ["owner-b/record-a.pdf", "owner-a/../owner-b/record-a.pdf"]) {
      const state = setup(bytes);
      state.loadEligibleDocuments.mockResolvedValueOnce([record(bytes, { storage_path })]);
      const result = await prepareIrsGeneralOwnedPacketPreview(state.input);
      expect(result.ready).toBe(false);
      expect(result.blockers).toContain("enclosure_not_eligible");
      expect(state.createSignedReadUrl).not.toHaveBeenCalled();
    }
  });

  it("does not read attachments after a controlling notice change", async () => {
    const bytes = await generatePlainTextPdf("Record");
    const state = setup(bytes);
    state.loadOwnedCaseSnapshot.mockResolvedValueOnce({
      ...state.snapshot,
      letterInput: {
        ...letterInput,
        mail: { ...letterInput.mail, noticeSha256: "b".repeat(64) },
      },
    });
    const result = await prepareIrsGeneralOwnedPacketPreview(state.input);
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("source_notice_digest_changed");
    expect(state.fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects tampered vault bytes without producing a packet", async () => {
    const original = await generatePlainTextPdf("Original record");
    const altered = await generatePlainTextPdf("Altered record");
    const state = setup(original);
    state.input.storageOptions.fetchImpl = (async () =>
      new Response(new Uint8Array(altered).buffer)) as typeof fetch;
    const result = await prepareIrsGeneralOwnedPacketPreview(state.input);
    expect(result).toEqual({ ready: false, blockers: ["packet_assembly_failed"], preview: null });
  });

  it("supports a persisted letter-only selection without reading any attachment", async () => {
    const state = setup(await generatePlainTextPdf("Unused"), []);
    const result = await irsGeneralDefinition.prepareOwnedPacketPreview(state.input);
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected letter-only packet");
    expect(result.preview.supportingPages).toBe(0);
    expect(result.preview.manifest).toEqual([]);
    expect(state.fetchImpl).not.toHaveBeenCalled();
  });
});
