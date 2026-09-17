import {
  assemblePacket,
  PacketError,
  type AssembledPacket,
  type PacketDocumentRow,
  type PacketManifestEntry,
} from "./index.js";

export interface PacketStorageAdapter {
  /** Must return only owner-authorized, packet-eligible, scanned-clean documents. */
  loadEligibleDocuments(input: {
    ownerId: string;
    matterId: string;
  }): Promise<readonly PacketDocumentRow[]>;

  /** Return a short-lived read URL for the immutable vault object. */
  createSignedReadUrl(input: {
    ownerId: string;
    storagePath: string;
    expiresInSeconds: number;
  }): Promise<string>;

  persistMeasuredPageCount(input: {
    ownerId: string;
    matterId: string;
    documentId: string;
    pageCount: number;
  }): Promise<void>;
}

export interface SecurePacketStorageOptions {
  signedUrlTtlSeconds?: number;
  maxAttachmentBytes?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Creates the storage-facing half of packet construction. The canonical merge,
 * SHA-256 verification and real page counting remain in assemblePacket().
 */
export function createSecurePacketStorageAdapter(
  storage: PacketStorageAdapter,
  options: SecurePacketStorageOptions = {},
) {
  const signedUrlTtlSeconds = options.signedUrlTtlSeconds ?? 60;
  const maxAttachmentBytes = options.maxAttachmentBytes ?? 50 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!Number.isSafeInteger(signedUrlTtlSeconds) || signedUrlTtlSeconds < 1 || signedUrlTtlSeconds > 300) {
    throw new Error("Signed packet read TTL must be between 1 and 300 seconds");
  }
  if (!Number.isSafeInteger(maxAttachmentBytes) || maxAttachmentBytes < 1) {
    throw new Error("maxAttachmentBytes must be a positive safe integer");
  }

  async function readBytes(ownerId: string, row: PacketDocumentRow): Promise<Uint8Array> {
    if (!row.storage_path.startsWith(`${ownerId}/`)) {
      throw new PacketError("Packet document storage path is not owner scoped");
    }

    const signedUrl = await storage.createSignedReadUrl({
      ownerId,
      storagePath: row.storage_path,
      expiresInSeconds: signedUrlTtlSeconds,
    });

    const response = await fetchImpl(signedUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      throw new PacketError("Unable to read a packet document");
    }

    const declaredLength = response.headers.get("content-length");
    if (declaredLength !== null && Number(declaredLength) > maxAttachmentBytes) {
      await response.body.cancel().catch(() => undefined);
      throw new PacketError(`${row.safe_filename} is too large to enclose`);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let completed = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          completed = true;
          break;
        }
        total += value.byteLength;
        if (total > maxAttachmentBytes) {
          throw new PacketError(`${row.safe_filename} is too large to enclose`);
        }
        chunks.push(value);
      }
    } finally {
      if (!completed) await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  async function persistMeasuredPageCounts(input: {
    ownerId: string;
    matterId: string;
    manifest: readonly PacketManifestEntry[];
  }): Promise<void> {
    for (const entry of input.manifest) {
      await storage.persistMeasuredPageCount({
        ownerId: input.ownerId,
        matterId: input.matterId,
        documentId: entry.documentId,
        pageCount: entry.pageCount,
      });
    }
  }

  async function build(input: {
    ownerId: string;
    matterId: string;
    responseLetterPdf: Uint8Array;
    excludedResponsePages?: readonly number[];
  }): Promise<AssembledPacket> {
    const rows = [...await storage.loadEligibleDocuments({
      ownerId: input.ownerId,
      matterId: input.matterId,
    })];

    const packet = await assemblePacket(
      input.responseLetterPdf,
      rows,
      (row) => readBytes(input.ownerId, row),
      { excludedResponsePages: input.excludedResponsePages },
    );
    await persistMeasuredPageCounts({
      ownerId: input.ownerId,
      matterId: input.matterId,
      manifest: packet.manifest,
    });
    return packet;
  }

  return { build, readBytes, persistMeasuredPageCounts };
}
