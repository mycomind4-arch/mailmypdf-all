import { PacketError, type PacketDocumentRow } from "@mailmypdf/packet-builder";
import type { PacketStorageAdapter } from "@mailmypdf/packet-builder/storage-adapter";

/**
 * Bind every packet-storage operation to one authenticated owner and matter.
 * The host supplies owner-authorized, scan-clean database reads and a trusted
 * signed-URL issuer. Never construct this adapter from browser-supplied owner IDs.
 * This adapter does not approve, charge, or mail anything.
 */
export function createScopedCasePacketStorageAdapter(deps: {
  ownerId: string;
  matterId: string;
  loadDocuments(): Promise<readonly PacketDocumentRow[]>;
  signUrl(path: string, expiresInSeconds: number): Promise<string>;
  savePageCount(documentId: string, pageCount: number): Promise<void>;
}): PacketStorageAdapter {
  const invalid = () => new PacketError("Packet document authorization could not be verified");
  const validScope = (ownerId: string, matterId: string) =>
    ownerId === deps.ownerId && matterId === deps.matterId &&
    typeof ownerId === "string" && ownerId.length > 0 &&
    typeof matterId === "string" && matterId.length > 0;
  const validPath = (path: string) =>
    typeof path === "string" && path.startsWith(`${deps.ownerId}/`) &&
    !/[\\\u0000-\u001f\u007f]/.test(path) &&
    path.slice(deps.ownerId.length + 1).split("/").every((segment) =>
      segment.length > 0 && segment !== "." && segment !== "..",
    );

  async function currentRows(): Promise<readonly PacketDocumentRow[]> {
    const rows = await deps.loadDocuments();
    if (!Array.isArray(rows)) throw invalid();
    const paths = new Set<string>();
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row.document_id !== "string" || !row.document_id ||
          (row.role !== "evidence" && row.role !== "subject_notice") ||
          !validPath(row.storage_path) ||
          typeof row.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(row.sha256) ||
          paths.has(row.storage_path) || ids.has(row.document_id)) {
        throw invalid();
      }
      paths.add(row.storage_path);
      ids.add(row.document_id);
    }
    return rows;
  }

  return {
    async loadEligibleDocuments({ ownerId, matterId }) {
      if (!validScope(ownerId, matterId)) throw invalid();
      return currentRows();
    },
    async createSignedReadUrl({ ownerId, storagePath, expiresInSeconds }) {
      if (ownerId !== deps.ownerId || !validPath(storagePath) ||
          !Number.isSafeInteger(expiresInSeconds) ||
          expiresInSeconds < 1 || expiresInSeconds > 300) throw invalid();
      // A previously eligible enclosure can be revoked while a packet is
      // assembled. Recheck current case selection before issuing a signed URL.
      const rows = await currentRows();
      if (!rows.some((row) => row.storage_path === storagePath)) throw invalid();
      const url = await deps.signUrl(storagePath, expiresInSeconds);
      // Hosted storage must use TLS. Supabase's local development emulator
      // uses loopback HTTP; never permit an arbitrary cleartext remote host.
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw invalid(); }
      const local = parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
      if ((!local && parsed.protocol !== "https:") ||
          parsed.username || parsed.password) throw invalid();
      return url;
    },
    async persistMeasuredPageCount({ ownerId, matterId, documentId, pageCount }) {
      if (!validScope(ownerId, matterId) ||
          !Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 200) {
        throw invalid();
      }
      const rows = await currentRows();
      if (!rows.some((row) => row.document_id === documentId)) throw invalid();
      await deps.savePageCount(documentId, pageCount);
    },
  };
}
