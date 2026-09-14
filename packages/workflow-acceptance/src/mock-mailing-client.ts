/**
 * Mock MailMyPDF mailing-client + Mock Lob provider for the workflow
 * acceptance engine.
 *
 * This replaces `@mailmypdf/mailing-client` (the shared HTTP client every
 * vertical uses to reach the real MailMyPDF platform API) at exactly the
 * seam the platform already exposes: `createMailingClient(vertical)` ->
 * `{ uploadDocument, uploadPacket, uploadDocumentBase64, createCommunication,
 * getCommunication }`. Nothing above this seam changes -- the vertical's own
 * `MailMyPDFClient` adapter (e.g. apps/verticals/appeal-mail/src/platform/
 * mailmypdf-client.ts) runs completely unmodified, so if that adapter never
 * wires `uploadPacket` (as of this writing, appeal-mail's does not), this
 * mock faithfully reproduces that gap instead of papering over it -- see
 * "Provider Abstraction" / "Lob Simulation" in
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.
 *
 * Document normalization (text/plain -> PDF) and packet merging reuse the
 * exact production primitives from @mailmypdf/packet-builder -- the same
 * code apps/mailmypdf's real /api/v1/documents endpoint calls -- so a PDF
 * produced here is not a test-only approximation.
 *
 * No network call is ever made and no real Lob submission occurs.
 */

import { computeSha256 } from "@mailmypdf/documents";
import {
  assemblePacket,
  generatePlainTextPdf,
  type PacketDocumentRow,
  type PacketManifestEntry,
} from "@mailmypdf/packet-builder";
import type { LobSimulationRecord } from "./types.js";

export interface MockDocument {
  id: string;
  filename: string;
  mime_type: string;
  sha256: string;
  size_bytes: number;
  bytes: Uint8Array;
  source: string;
  created_at: string;
  /** Present only for documents produced via uploadPacket(). */
  packetManifest?: PacketManifestEntry[];
}

export interface MockCommunication {
  id: string;
  status: string;
  tracking_number?: string;
  document_id: string;
  idempotency_key: string;
}

export interface MockMailingClientHandle {
  /** Pass as the vi.mock("@mailmypdf/mailing-client", () => module) factory return value. */
  module: Record<string, unknown>;
  documents: Map<string, MockDocument>;
  communicationsByIdempotencyKey: Map<string, MockCommunication>;
  lobSimulations: LobSimulationRecord[];
  /** Total createCommunication() invocations, including idempotent replays. */
  createCommunicationCalls: number;
  /** Distinct mailpieces actually created (by idempotency key) -- must be 1 for a correct idempotent workflow. */
  uniqueMailpieceCount(): number;
}

async function fileToBytes(file: { arrayBuffer(): Promise<ArrayBuffer> }): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function createMockMailingClient(runId: string, workflowId: string): MockMailingClientHandle {
  const documents = new Map<string, MockDocument>();
  const communicationsByIdempotencyKey = new Map<string, MockCommunication>();
  const lobSimulations: LobSimulationRecord[] = [];
  let documentCounter = 0;
  let communicationCounter = 0;
  let createCommunicationCalls = 0;

  function storeDocument(bytes: Uint8Array, filename: string, mimeType: string, source: string, packetManifest?: PacketManifestEntry[]): MockDocument {
    documentCounter += 1;
    const doc: MockDocument = {
      id: `doc_test_${runId}_${documentCounter}`,
      filename,
      mime_type: mimeType,
      sha256: computeSha256(bytes),
      size_bytes: bytes.byteLength,
      bytes,
      source,
      created_at: new Date().toISOString(),
      packetManifest,
    };
    documents.set(doc.id, doc);
    return doc;
  }

  async function normalizeToPdfIfText(bytes: Uint8Array, mimeType: string, filename: string) {
    if (mimeType !== "text/plain") return { bytes, mimeType, filename };
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const pdfBytes = await generatePlainTextPdf(text);
    return {
      bytes: pdfBytes,
      mimeType: "application/pdf",
      filename: filename.replace(/\.[^.]+$/, "") + ".pdf",
    };
  }

  const module = {
    async uploadDocument(file: { name: string; type: string; arrayBuffer(): Promise<ArrayBuffer> }) {
      const raw = await fileToBytes(file);
      const normalized = await normalizeToPdfIfText(raw, file.type || "application/pdf", file.name);
      const doc = storeDocument(normalized.bytes, normalized.filename, normalized.mimeType, "uploadDocument");
      return doc;
    },

    async uploadDocumentBase64(input: { content: string; filename: string; mime_type?: string }) {
      const raw = new Uint8Array(Buffer.from(input.content, "base64"));
      const normalized = await normalizeToPdfIfText(raw, input.mime_type ?? "application/pdf", input.filename);
      const doc = storeDocument(normalized.bytes, normalized.filename, normalized.mimeType, "uploadDocumentBase64");
      return doc;
    },

    // Mirrors apps/mailmypdf's real /api/v1/documents "packet" branch:
    // normalize the primary text to PDF, then merge every attachment in
    // using the exact production packet-builder -- not a test-only merger.
    async uploadPacket(input: {
      text: string;
      filename: string;
      attachments: Array<{ filename: string; mime_type: string; data: Uint8Array }>;
    }) {
      const letterPdf = await generatePlainTextPdf(input.text);
      const rows: PacketDocumentRow[] = input.attachments.map((attachment, index) => ({
        document_id: `attachment_${index}`,
        role: "evidence",
        evidence_kind: null,
        page_count: null,
        position: index,
        sha256: computeSha256(attachment.data),
        storage_path: "",
        safe_filename: attachment.filename,
        mime_type: attachment.mime_type,
      }));
      const bytesByDocumentId = new Map(rows.map((row, i) => [row.document_id, input.attachments[i].data]));
      const assembled = await assemblePacket(letterPdf, rows, async (row) => {
        const bytes = bytesByDocumentId.get(row.document_id);
        if (!bytes) throw new Error(`Mock mailing client: attachment bytes unavailable for ${row.safe_filename}`);
        return bytes;
      });
      const doc = storeDocument(
        assembled.bytes,
        input.filename.replace(/\.[^.]+$/, "") + "-packet.pdf",
        "application/pdf",
        "uploadPacket",
        assembled.manifest,
      );
      return doc;
    },

    async createCommunication(input: {
      document_id: string;
      recipient: Record<string, unknown>;
      mail_type: string;
      matter_reference: string;
      matter_type: string;
      legal_reference?: Record<string, unknown>;
      from_address?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      idempotency_key: string;
    }) {
      createCommunicationCalls += 1;

      const existing = communicationsByIdempotencyKey.get(input.idempotency_key);
      if (existing) {
        // Real Lob (and a correct MailMyPDF API) treats the Idempotency-Key
        // as the single source of truth: replay returns the same mailpiece,
        // never a new one. See "Lob Idempotency" in
        // docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.
        return existing;
      }

      communicationCounter += 1;
      const doc = documents.get(input.document_id);
      const comm: MockCommunication = {
        id: `comm_test_${runId}_${communicationCounter}`,
        status: "submitted",
        tracking_number: `TRACK-${runId}-${communicationCounter}`,
        document_id: input.document_id,
        idempotency_key: input.idempotency_key,
      };
      communicationsByIdempotencyKey.set(input.idempotency_key, comm);

      lobSimulations.push({
        provider: "lob_mock",
        recipient: input.recipient,
        sender: input.from_address,
        mailType: input.mail_type,
        pdfPath: "", // filled in by the caller once the run directory is known
        pageCount: null,
        metadata: { ...(input.metadata ?? {}), matter_reference: input.matter_reference, matter_type: input.matter_type },
        idempotencyKey: input.idempotency_key,
        workflowId,
        runId,
        createCommunicationCalls,
      });

      return comm;
    },

    async getCommunication(id: string) {
      for (const comm of communicationsByIdempotencyKey.values()) {
        if (comm.id === id) return comm;
      }
      throw new Error(`Mock mailing client: unknown communication ${id}`);
    },

    createMailingClient(_verticalSlug: string) {
      return module;
    },

    MailMyPDFPlatformError: class MailMyPDFPlatformError extends Error {
      status: number;
      code?: string;
      constructor(message: string, status: number, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
  } as unknown as Record<string, unknown>;

  return {
    module,
    documents,
    communicationsByIdempotencyKey,
    lobSimulations,
    get createCommunicationCalls() {
      return createCommunicationCalls;
    },
    uniqueMailpieceCount() {
      return communicationsByIdempotencyKey.size;
    },
  } as MockMailingClientHandle;
}
